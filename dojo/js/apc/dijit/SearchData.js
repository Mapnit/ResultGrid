define([
	"dijit/_WidgetBase",
	"dojo/topic",
	"dojo/Evented",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/parser",
	"dijit/_TemplatedMixin",

    "dojo/on",
	"dojo/dom",
    "dojo/dom-construct",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/ready",

    "apc/extra/FeatureGridManager", // 3rd-party lib
    "dojo/text!apc/dijit/templates/SearchData.html" // template html
], function(
	_WidgetBase,
    topic, Evented, declare, lang, array, 
    parser, _TemplatedMixin,
    on, dom, domConstruct, domClass, domStyle, ready, 
    FeatureGridManager, dijitTemplate
) {

    var searchData = declare("SearchData", [_WidgetBase, _TemplatedMixin, Evented], {

        templateString: dijitTemplate,

        options: {
            map: null, // required
            title: "Search",
        	targets: [ /*
        		// data-schema: 
        		{
                    "name": "Equipment",
                    "default": true, 
                    "queries": [{
                        "name": "Functional Locations", 
                        "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/53", 
                        "where": "(upper(description) like '{0}%' or funcloc like '{0}%' or systemxref like '{0}%')"
                    }]
                }
        	*/], // required
            visible: true
        }, 

        _css: {
        	searchButton: "searchData-button", 
            options: "searchData-options", 
            shortcuts: "searchData-shortcuts",
			statusMessage: "searchData-statusMessage"
        }, 

        /* ------------------ */
        /* Private Variables  */
        /* ------------------ */
        _optionIdPrefix: 'search-opt-', 
		_optionHtmlTmpl: '<div><input id="search-opt-${id}" type="checkbox" name="searchTarget" value="${value}" ${checked}/>${title}</div>', 

		_optionCheckboxes: [], 
		// datagrid subscribers
		_topicSubscribers: [], 

        /* ---------------------- */
        /* Public Class Functions */
        /* ---------------------- */
        
        constructor: function(options, srcRefNode) {
            // mix in settings and defaults
            declare.safeMixin(this.options, options);
            // properties
            this.set("map", this.options.map);
            this.set("title", this.options.title);
            this.set("targets", this.options.targets); 
            this.set("visible", this.options.visible);
            // listeners
            this.watch("visible", this._visible);
        },

        startup: function () {
            // map not defined
            if (!this.map) {
              this.destroy();
              console.log('SearchData::map required');
            }
            // when map is loaded
            if (this.map.loaded) {
              this._init();
            } else {
              on(this.map, "load", lang.hitch(this, function () {
                this._init();
              }));
            }
        },

        // connections/subscriptions will be cleaned up during the destroy() lifecycle phase
        destroy: function () {
            this.inherited(arguments);
        }, 

        /* ------------------------- */
        /* Private Utility Functions */
        /* ------------------------- */
        
        _init: function () {
        	// display search targets into options
        	array.forEach(this.targets, lang.hitch(this, function(item) {
        		if (item["queries"] && item["queries"].length > 0) {
	        		var chkbox = this._optionHtmlTmpl,
	        			itemId = this._normalize(item["name"]); 
        			// construct the html
	        		chkbox = chkbox.replace(/\$\{id\}/g, itemId); 
	        		chkbox = chkbox.replace(/\$\{value\}/g, item["name"]); 
	        		chkbox = chkbox.replace(/\$\{title\}/g, item["title"]||item["name"]);
	        		chkbox = chkbox.replace(/\$\{checked\}/g, item["default"]===true?"checked":"");
	        		domConstruct.place(chkbox, this._optionList, "last"); 
	        		// add the event handler
	        		var optionNode = dom.byId(this._optionIdPrefix + itemId);
	        		if (optionNode) {
		        		on(optionNode, "change", lang.hitch(this, function(evt) {
		        			this._optionsChanged(evt); 
		        		})); 
		        		this._optionCheckboxes.push(optionNode); 
		        	}
		        }
        	}));
			// subscribe the datagrid topics 
			this._topicSubscribers.push(topic.subscribe("featureGrid/ready", function(evt) {
				console.log("received: " + evt); 
			})); 
			this._topicSubscribers.push(topic.subscribe("featureGrid/destroyed", function(evt) {
				console.log("received: " + evt); 
			})); 
			//
            this._visible();
            this.set("loaded", true);
            this.emit("load", {});
        },

        _visible: function () {
            if (this.get("visible")) {
                domStyle.set(this.domNode, 'display', 'block');
            } else {
                domStyle.set(this.domNode, 'display', 'none');
            }
        },

        showMessage: function (message) {
            if (message) {
                /* limit the message size */
                message = message.substr(0, 100); 
            }
            this._status.innerHTML = message;
        }, 

        _normalize: function(name) {
        	if (name) {
        		return name.replace(/\W/g, "_"); 
        	} else {
        		return name; 
        	}
        },

        /* ---------------------- */
        /* Private Event Handlers */
        /* ---------------------- */

		_optionsChanged: function(evt) {
			if (evt.target.checked === false) {
				if (this._shortcutAll.checked === true) {
					this._shortcutAll.checked = false; 
				}
			} else {
				if (this._shortcutNone.checked === true) {
					this._shortcutNone.checked = false; 
				}
			}
		},

		_shortcutChanged: function(evt) {
			var optValue = evt.target.value;
			var allChecked = (optValue === "all"); 
			array.forEach(this._optionCheckboxes, lang.hitch(this, function(item) {
				item.checked = allChecked; 
			})); 
		}, 

		_inputChanged: function(evt) {
			if ((evt.keyCode || evt.which) === 13 /* enter */) {
				this._doSearch(); 
			}
		},

		_doSearch: function() {
			this.showMessage("");

			var searchInput = this._searchText.value.trim(); 
			if (searchInput.length === 0) {
				this.showMessage("empty search input"); 
				return; 
			}
			console.log("doSearch: " + searchInput); 

			var isInputNumeric = /^\d+$/.test(searchInput); 
			
			// build the search parameters
			var searchParams = []; 
			array.forEach(this._optionCheckboxes, lang.hitch(this, function(opt, idx) {
				if (opt.checked === true) {
					for(var i=0,l=this.targets.length; i<l; i++) {
						var tgt = this.targets[i]; 
						var itemId = this._normalize(tgt["name"]); 
						if ((this._optionIdPrefix + itemId) === opt["id"]) {
							// pack the search text into the queries
							var tgtQueries = []; 
							array.forEach(tgt["queries"], lang.hitch(this, function(qry) {
								tgtQueries.push({
									"name": qry["name"], 
									"serviceUrl": qry["serviceUrl"], 
									"where": (isInputNumeric===false?qry["where"]:qry["numericWhere"]||qry["where"]).replace(/\{0\}/g, searchInput)
								}); 
							})); 
							// add to searchParam
                            if (tgtQueries.length > 0) {
    							searchParams.push({
    								"name": tgt["name"], 
    								"queries": tgtQueries
    							});
                            }
    						break; 
						}
					}
				}
			})); 

			// pass searchParams for execution
			if (searchParams.length > 0) {
				FeatureGridManager.buildFeatureGrid(searchParams, {map: this.map}); 
			}
		}
		
    });

    ready(function(){
        console.log("Widget SearchData is ready!");
    });	

    return searchData;

});