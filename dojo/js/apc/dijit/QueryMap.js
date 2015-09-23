define([
	"dijit/_WidgetBase",
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

    "esri/layers/GraphicsLayer", 
	"esri/graphic",
    "esri/geometry/Circle",

	"esri/Color",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol", 
    "esri/symbols/SimpleFillSymbol", 
    "esri/renderers/SimpleRenderer",

    "dojo/text!apc/dijit/templates/QueryMap.html" // template html
], function(
	_WidgetBase,
    Evented, declare, lang, array, 
    parser, _TemplatedMixin,
    on, dom, domConstruct, domClass, domStyle, ready, 
    GraphicsLayer, Graphic, Circle, Color, 
    SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, SimpleRenderer, 
    dijitTemplate
) {

    var queryMap = declare("QueryMap", [_WidgetBase, _TemplatedMixin, Evented], {

        templateString: dijitTemplate,

        options: {
            map: null, // required
            title: "Map Query",
            symbols: {
				"point": {
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
				"polygon": {
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

        _queryMapHandler: null, 

        _queryLayerId: "queryMap_graphicsLayer",
        _queryLayer: null, 

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
            // reset the query drawing
			this._resetQueryDrawing(); 
			// remove the graphic layer from map 
			if (this._queryLayer) {
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
        	// init the query drawing
        	this._prepareQueryDrawing(); 
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
			this._queryMethod = null; 
			if (this._queryMapHandler) {
				this._queryMapHandler.remove();
			}
			if (this._queryLayer) {
				this._queryLayer.clear(); 
			}
        }, 

        _prepareQueryDrawing: function() {
			domStyle.set(this._bufferOptions, "display", (this._queryMethod === "pointBuffer"?'block':"none")); 

			var queryGeometry; 
			switch(this._queryMethod) {
				case "rectangle":
					break; 
				case "polygon":
					break; 
				case "pointBuffer":
					this._queryMapHandler = on(this.map, "click", lang.hitch(this, function (evt) {
			        	this.showMessage(""); 
						if (/^\d+$/.test(this._bufferDistance.value) === false) {
							this.showMessage("invalid distance input");
						} else {
							queryGeometry = new Circle({
								center: evt.mapPoint,
								geodesic: true,
								radius: this._bufferDistance.value,
								radiusUnit: this._distanceUnit
							}); 
							this._doQuery(queryGeometry); 

							this._queryLayer.add(new Graphic(evt.mapPoint, new SimpleMarkerSymbol(this.symbols["point"]))); 
							this._queryLayer.add(new Graphic(queryGeometry, new SimpleFillSymbol(this.symbols["polygon"]))); 
						}
					}));
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