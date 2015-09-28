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

	"esri/toolbars/draw", 
    "esri/layers/GraphicsLayer", 
	"esri/graphic",

    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol", 
    "esri/symbols/SimpleFillSymbol", 

    "dojo/text!apc/dijit/templates/QueryMap.html" // template html
], function(
	_WidgetBase,
    topic, Evented, declare, lang, array, 
    parser, _TemplatedMixin,
    on, dom, domConstruct, domClass, domStyle, ready, 
    Draw, GraphicsLayer, Graphic, 
    SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, 
    dijitTemplate
) {

    var queryMap = declare("QueryMap", [_WidgetBase, _TemplatedMixin, Evented], {

        templateString: dijitTemplate,

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
            visible: true
        }, 

        _css: {
        	bufferOptions: "queryMap-bufferOptions",
			statusMessage: "queryMap-statusMessage"
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
					this._drawToolbar.activate(Draw.EXTENT);
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
					this._drawToolbar.activate(Draw.POLYGON);
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
					this._drawToolbar.activate(Draw.POINT);
			}
        }, 

        _doQuery: function(queryGeometry) {
        	var searchParams = []; 
        	// scan for the visible layers in map
        	var visibleMaps = this.map.getLayersVisibleAtScale(); 
        	array.forEach(visibleMaps, lang.hitch(this, function(item) {
        		var tgtQueries = [];
        		array.forEach(item.visibleLayers, lang.hitch(this, function(layerId) {
        			var layerInfo = item.layerInfos[layerId]; 
        			if (layerInfo.subLayerIds === null) {
	        			tgtQueries.push({
							"name": layerInfo.name, 
							"serviceUrl": item.url + "/" + layerId, 
							"geometry": queryGeometry
						}); 
        			}
        		})); 
        		// add to searchParam
        		if (tgtQueries.length > 0) {
					searchParams.push({
						"name": item.id, 
						"queries": tgtQueries
					});
				}
        	})); 

        	// pass searchParams for execution
			if (searchParams.length > 0) {
				FeatureGridManager.buildFeatureGrid(searchParams, {map: this.map}); 
			}

        },

        /* ---------------------- */
        /* Private Event Handlers */
        /* ---------------------- */

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