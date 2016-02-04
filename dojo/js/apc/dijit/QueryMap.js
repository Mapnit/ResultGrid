define([
	"dijit/_WidgetBase",
	"dojo/topic",
	"dojo/Evented",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/parser",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin", 

    "dojo/on",
	"dojo/dom",
    "dojo/dom-construct",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/ready",
	
	"dijit/form/ToggleButton",

	"esri/toolbars/draw", 
    "esri/layers/GraphicsLayer", 
	"esri/graphic",

    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol", 
    "esri/symbols/SimpleFillSymbol", 

    "dojo/text!./templates/QueryMap.html", // template html
	
	"apc/extra/FeatureGridManager", // 3rd-party lib
	"xstyle/css!./css/QueryMap.css" // widget style 
], function(
	_WidgetBase,
    topic, Evented, declare, lang, array, 
    parser, _TemplatedMixin, _WidgetsInTemplateMixin,
    on, dom, domConstruct, domClass, domStyle, ready, 
	ToggleButton, 
    Draw, GraphicsLayer, Graphic, 
    SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, 
    dijitTemplate, FeatureGridManager
) {

    var queryMap = declare("QueryMap", 
			[_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {

		templateString: dijitTemplate,
		baseClass: "QueryMap", // css base class

        options: {
            map: null, // required
            title: "Map Query",
            symbols: {
				"marker": {
					"type": "esriSMS",
					"style": "esriSMSCross",
					"color": [0,0,255,255],
					"size": 6,
					"angle": 0,
					"xoffset": 0,
					"yoffset": 0,
					"outline": {
						"color": [0,0,255,255],
						"width": 2
					}
				}, 
				"line": {
					"type": "esriSLS",
					"style": "esriSLSDash",
					"color": [0,0,255,255],
					"width": 2
				},
				"fill": {
					"type": "esriSFS",
					"style": "esriSFSSolid",
					"color": [0,0,0,75],
					"outline": {
						"type": "esriSLS",
						"style": "esriSLS",
						"color": [0,0,255,255],
						"width": 2
					}
				}
			}, 
			columnTemplates: [/*
				// template-schema: 
				{
					"columnName": "FINS_URL",
					"type": "url"
				}, {
					"name": "DHUB_TAG",
					"type": "a_tag"
				}
			*/],
            visible: true
        }, 

        /* ------------------ */
        /* Private Variables  */
        /* ------------------ */
        _queryMethod: "rectangle", 
        _distanceUnit: "esriFeet",  

		// mouse event handlers for query
        _queryMapHandlers: [], 
		_drawToolbar: null, 
		
		// graphic layer for query
        _queryLayerId: "queryMap_graphicsLayer",
        _queryLayer: null, 
		
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
            this.set("symbols", this.options.symbols); 
			this.set("columnTemplates", this.options.columnTemplates); 
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
			// reset the draw toolbar 
			this._drawToolbar.deactivate(); 
			this._drawToolbar = null; 
            // reset the query drawing
			this._resetQueryDrawing();
			// remove the graphic layer from map 
			if (this._queryLayer) {
				this._queryLayer.clear();
				this.map.removeLayer(this._queryLayer);
				this._queryLayer = null; 
			}
			// remove FeatureGrid
			FeatureGridManager.removeFeatureGrid();
			// 
        }, 

        /* ------------------------- */
        /* Private Utility Functions */
        /* ------------------------- */
        
        _init: function () {
        	// init the graphic layer
			this._queryLayer = new GraphicsLayer({id: this._queryLayerId}); 
			this.map.addLayer(this._queryLayer);			
			// init the draw toolbar 
			this._drawToolbar = new Draw(this.map);
			this._drawToolbar.setMarkerSymbol(new SimpleMarkerSymbol(this.symbols["marker"]));
			this._drawToolbar.setLineSymbol(new SimpleMarkerSymbol(this.symbols["line"]));
			this._drawToolbar.setFillSymbol(new SimpleFillSymbol(this.symbols["fill"]));
        	// init the query drawing
        	this._prepareQueryDrawing(); 
			// subscribe the datagrid topics 
			this._topicSubscribers.push(topic.subscribe("featureGrid/ready", function(evt) {
				console.log("received: " + evt); 
			})); 
			this._topicSubscribers.push(topic.subscribe("featureGrid/destroyed", lang.hitch(this, function(evt) {
				console.log("received: " + evt); 
				// remove all graphics
				if (this._queryLayer) {
					this._queryLayer.clear(); 
				}				
			}))); 
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

        _resetQueryDrawing: function() {			
			this.showMessage(""); 
			
			// deactivate the draw toolbar 
			this._drawToolbar.deactivate(); 
			// remove all graphics
			if (this._queryLayer) {
				this._queryLayer.clear(); 
			}
			// reset the query method
			this._queryMethod = null;
			// remove the drawing event handler
			if (this._queryMapHandlers) {
				array.forEach(this._queryMapHandlers, function(evtHandler) {
					evtHandler.remove();
				}); 
			}
			this._queryMapHandlers = []; 
        }, 

        _prepareQueryDrawing: function() {
			this.showMessage(""); 
			this._drawingModeSwitch.set("checked", false); 
			
			// display the pointBuffer options
			domStyle.set(this._bufferOptions, "display", (this._queryMethod === "pointBuffer"?'block':"none")); 

			// bind on mouse events on map
			switch(this._queryMethod) {
				case "rectangle":
					this._queryMapHandlers.push(
						this._drawToolbar.on("draw-end", lang.hitch(this, function (evt) {
							// clear previous drawing
							this._queryLayer.clear();
							// draw the polygon
							this._queryLayer.add(new Graphic(evt.geometry, new SimpleFillSymbol(this.symbols["fill"])));
							// execute the query
							this._doQuery(evt.geometry); 
						}))
					);
					//this._drawToolbar.activate(Draw.EXTENT);
					break; 
				case "polygon":
					this._queryMapHandlers.push(
						this._drawToolbar.on("draw-end", lang.hitch(this, function (evt) {
							// clear previous drawing
							this._queryLayer.clear();
							// draw the polygon
							this._queryLayer.add(new Graphic(evt.geometry, new SimpleFillSymbol(this.symbols["fill"])));
							// execute the query
							this._doQuery(evt.geometry); 
						}))
					);
					//this._drawToolbar.activate(Draw.POLYGON);
					break; 
				case "pointBuffer":
					this._queryMapHandlers.push(
						this._drawToolbar.on("draw-end", lang.hitch(this, function (evt) {
								// clear previous drawing
								this._queryLayer.clear();
								// draw the buffer circle
								var queryGeometry = new Circle({
										center: evt.geometry,
										geodesic: true,
										radius: this._bufferDistance.value,
										radiusUnit: this._distanceUnit
									});
								this._queryLayer.add(new Graphic(evt.geometry, new SimpleMarkerSymbol(this.symbols["marker"]))); 
								this._queryLayer.add(new Graphic(queryGeometry, new SimpleFillSymbol(this.symbols["fill"]))); 
								// execute the query
								this._doQuery(queryGeometry); 
						}))
					);
					//this._drawToolbar.activate(Draw.POINT);
			}
        }, 

        _doQuery: function(queryGeometry) {
        	var searchParams = []; 
			// get the current map scale
			var mapScale = this.map.getScale(); 
        	// scan for the visible layers in map
        	var visibleMaps = this.map.getLayersVisibleAtScale(); 
        	array.forEach(visibleMaps, lang.hitch(this, function(item) {
				// getLayersVisibleAtScale returns the visible child layers 
				// when the group or parent layer is turned off
				if (item.visible === true) {
					var tgtQueries = [];
					array.forEach(item.visibleLayers, lang.hitch(this, function(layerId) {
						// layerId could be -1 when a parent layer is turned off
						var layerInfo = item.layerInfos[layerId]; 
						var queryName = ""; 
						// leaf layers only
						if (layerInfo && layerInfo.subLayerIds === null) {
							// check the scale ranges of this layer and all its ancestral layers
							var scaleInRange, tvsLayerInfo, tvsLayerId = layerId;
							while(tvsLayerId > -1) {
								tvsLayerInfo = item.layerInfos[tvsLayerId]; 
								scaleInRange = Math.min(Math.max(mapScale, tvsLayerInfo.maxScale), tvsLayerInfo.minScale);
								if (scaleInRange !== mapScale && scaleInRange !== 0) {
									break; 
								}
								// (2016/2/3) concatenate its name and all its ancestors' 
								if (queryName.length === 0) 
									queryName = tvsLayerInfo.name; 
								else {
									// (2016/2/4) ignore ancestral name if it offers no distinction
									if (queryName.indexOf(tvsLayerInfo.name) === -1) {
										queryName = tvsLayerInfo.name + " - " + queryName;
									}
								}
								//
								tvsLayerId = tvsLayerInfo.parentLayerId;
							}
							// within the scale range only (visibleLayers ignores the scale range)
							if (scaleInRange === mapScale || scaleInRange === 0) {
								tgtQueries.push({
									"serviceProvider": "Esri-Map", 
									// (2016/2/3) use its name and all its ancestors' for readability and uniqueness
									"name": queryName, 
									"serviceUrl": item.url + "/" + layerId, 
									"geometry": queryGeometry
								});
							}
						}
					})); 
					// add to searchParam
					if (tgtQueries.length > 0) {
						// (2016/2/3) one group for each map service
						searchParams.push({
							"name": item.title||item.id, 
							"queries": tgtQueries
						});
					}
				}
        	})); 

        	// pass searchParams for execution
			if (searchParams.length > 0) {
				FeatureGridManager.buildFeatureGrid(searchParams, {
					title: "Identified Results", 
					map: this.map, 
					srcRefNode: this.map.id, 
					windowHeight: 500 /*px*/, 
					columnTemplates: this.columnTemplates
				}); 
			} else {
				console.log("no visible layer at this scale"); 
			}
        },

        /* ---------------------- */
        /* Private Event Handlers */
        /* ---------------------- */
		
		_drawingModeChanged: function(evt) {			 
			if (evt === true) {
				this._drawingModeSwitch.set("label", "On");
				// activate the drawing toolbar
				switch(this._queryMethod) {
					case "rectangle":
						this._drawToolbar.activate(Draw.EXTENT);
						break;
					case "polygon":
						this._drawToolbar.activate(Draw.POLYGON);
						break;
					case "pointBuffer":
						this._drawToolbar.activate(Draw.POINT);
						break; 
				}
			} else {
				this._drawingModeSwitch.set("label", "Off");
				// reset the draw toolbar 
				this._drawToolbar.deactivate(); 
			}			
		}, 

        _queryMethodChanged: function(evt) {
        	this._resetQueryDrawing();

        	this._queryMethod = evt.target.value; 
        	this._prepareQueryDrawing();
        }, 

        _distanceUnitChanged: function(evt) {
        	switch(evt.target.value) {
        		case "foot":
        			this._distanceUnit = "esriFeet";
        			break; 
        		case "meter": 
        		default: 
        			this._distanceUnit = "esriMeters"; 
        			break;
        	}
        }

    });

    ready(function(){
        console.log("Widget QueryMap is ready!");
    });	

    return queryMap;
                    
});