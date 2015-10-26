define([
	"dojo/_base/declare", 
	"dojo/_base/lang", 
	"dojo/topic", 
	"dojo/promise/all", 
	"dojo/request/xhr",
	"dojo/aspect", 
	
	"esri/tasks/QueryTask", 
	"esri/tasks/query", 
    "esri/geometry/Point",
    "esri/geometry/Polyline",
    "esri/geometry/Polygon",
    "esri/geometry/Extent",
	"esri/geometry/webMercatorUtils", 
    "esri/layers/GraphicsLayer", 
    "esri/graphic",	
	"esri/symbols/SimpleMarkerSymbol", 
    "esri/symbols/SimpleFillSymbol", 
	"esri/symbols/SimpleLineSymbol",	
	
	"jquery", "kendo", 
	"xstyle/css!apc/extra/css/FeatureGridManager.css"
], function(
	declare, lang, topic, all, xhr, aspect, 
	QueryTask, Query, 
	Point, Polyline, Polygon, Extent, webMercatorUtils, GraphicsLayer, Graphic,
	SimpleMarkerSymbol, SimpleFillSymbol, SimpleLineSymbol
) {	
	var fgm = declare("FeatureGridManager", null, {}); 
	
	/* --------------------------------- */
	/* Inner class for parallel queries  */
	/* --------------------------------- */

	var Queryllel = (function() {
		// constructor
		function Queryllel(queryName, elementId, callback, errback) {
			this._queryName = queryName;
			this._elementId = elementId; 
			this._results = []; 
			this._done = false; 
			this._callback = callback; 
			this._errback = errback; 
		}
		
		Queryllel.prototype.query = function(qry) {
			console.log("query [" + qry["where"] + "] on " + qry["serviceUrl"]); 
			
			var query = new Query();
			query.where = qry["where"];
			query.geometry = qry["geometry"]; 
	
			var queryTask = new QueryTask(qry["serviceUrl"]); 
			queryTask.executeForIds(query, lang.hitch(this, function(results) {
				this._processResults(results); 
			}), lang.hitch(this, function(err) {
				this._queryError(err); 
			}));
		};
		
		Queryllel.prototype._processResults = function(results) {
			console.log("OIDs for " + this._queryName); 
			/*
			// move this app-specific code out of Queryllel and 
			// use a callback function to revoke any additional app-specific function
			var queryElement = $("#"+this._elementId); 
			if (! results || results.length === 0) {
				if (queryElement.data("kendoGrid")) {
					queryElement.data("kendoGrid").destroy();
				}
				queryElement.empty(); 
				queryElement.remove();
			} else {
				var itemElement = queryElement.children("span"); 
				itemElement.html(itemElement.html() + " (" + results.length + ")");				
			}
			 */
			// assign it to member variable
			this._results = results; 
			// mark it done
			this._done = true; 
			// call the user-defined callback if any
			if (this._callback) {
				this._callback(this._queryName, this._elementId, this._results); 
			}
		};
		
		Queryllel.prototype._queryError = function(err) {
			console.log("query error [" + this._queryName + "]" + err);			
			// call the user-defined error callback if any
			if (this._errback) {
				this._errback(this._queryName, this._elementId, err); 
			}
		};
		
		Queryllel.prototype.isDone = function() {
			return this._done;
		};
		
		Queryllel.prototype.getResults = function() {
			return this._results;
		};
		
		Queryllel.prototype.getQueryName = function() {
			return this._queryName; 
		}; 
		
		return Queryllel; 
	})(); 
	
	/* ------------------ */
	/* Private Variables  */
	/* ------------------ */

	fgm.options = {
		pageSize: 1000, 
		minColumnWidth: 50, /*px*/
		maxColumnWidth: 300, /*px*/
		columnTemplates: [], /*DEV: global column templates*/
		map: null, 
		highlightSymbols: {
			"point": {
				"type": "esriSMS",
				"style": "esriSMSCircle",
				"color": [0,0,255,0],
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
				"style": "esriSLS",
				"color": [0,0,255,255],
				"width": 1
			},
			"polygon": {
				"type": "esriSFS",
				"style": "esriSFSSolid",
				"color": [0,0,0,0],
				"outline": {
					"type": "esriSLS",
					"style": "esriSLS",
					"color": [0,0,255,255],
					"width": 1
				}
			}
		}, 
		symbols: {
			"point": {
				"type": "esriSMS",
				"style": "esriSMSCircle",
				"color": [255,255,0,0],
				"size": 6,
				"angle": 0,
				"xoffset": 0,
				"yoffset": 0,
				"outline": {
					"color": [255,255,0,255],
					"width": 2
				}
			}, 
			"line": {
				"type": "esriSLS",
				"style": "esriSLS",
				"color": [255,255,0,255],
				"width": 2
			},
			"polygon": {
				"type": "esriSFS",
				"style": "esriSFSSolid",
				"color": [0,0,0,0],
				"outline": {
					"type": "esriSLS",
					"style": "esriSLS",
					"color": [255,255,0,255],
					"width": 2
				}
			}
		}, 
		extRequestUrls: {
			// return url
			"tdb": "/apc/services/tdb",
			//"tdb": "http://gis.anadarko.com/WebServices/connect/tdb",
			// return data
			"excel": "/apc/services/excel"
			//"excel": "http://gis.anadarko.com/WebServices/connect/excel"
		}
	}; 
	
	fgm._loadingIdSuffix = "loading"; 
	fgm.loadingHtml = "<i class='fa fa-refresh fa-spin'></i>"; 

	fgm.depthSeparator = "-"; 
	fgm.column_oid = "OBJECTID";
	fgm.searchParams = []; 
	
	fgm._resultWindow = null;
	fgm._datagrid = null; 
	fgm._dataPager = null;

	fgm._queryllelArray = []; 
	fgm._queryCheckInterval = 1000/*ms*/; 
	
	fgm._messageAdvisors = []; 
	
	fgm.resultCache = {}; 
	fgm._currentPage = -1; 
	fgm._currentQuery = null; 
	fgm.selectedPanel = null; 
	fgm.selectedRowOID = null;
	fgm._cxtMenuItems = []; 
	
	fgm._fgLayerId = "fgm_dataLayer";
    fgm._fgLayer = null; 
	
	fgm._fhlgLayerId = "fgm_highlightLayer";
    fgm._fhlgLayer = null; 
	
	fgm._linkTypes = ["a_tag", "url"]; 
	
	fgm._cmdColumnConfig = {
		"remove": { 
			name: "Dismiss",
			text:"",
			class: "ob-icon-only",
			//imageClass: "k-icon fgm-cmd-icon-dismiss ob-icon-only",
			imageClass: "fa fa-trash fa-fw",
			click: function(evt) {
				var dataItem = this.dataItem($(evt.currentTarget).closest("tr"));
				console.log("delete this row: " + dataItem[fgm.column_oid]);
				fgm._removeFeature(dataItem[fgm.column_oid]); 
			}
		}, 
		"zoomIn": { 
			name: "ZoomIn",
			text:"",
			class: "ob-icon-only",
			//imageClass: "k-icon fgm-cmd-icon-zoomIn ob-icon-only",
			imageClass: "fa fa-search-plus fa-fw",
			click: function(evt) {
				var dataItem = this.dataItem($(evt.currentTarget).closest("tr"));
				console.log("zoom to this row: " + dataItem[fgm.column_oid]);
				fgm._zoomToFeature(dataItem[fgm.column_oid]); 
			} 
		}, 
		"hyperlink": { 
			name: "Hyperlink",
			text:"",
			class: "ob-icon-only",
			//imageClass: "k-icon fgm-cmd-icon-hyperlink ob-icon-only",
			imageClass: "fa fa-link fa-fw",
			click: function(evt) {
				var dataItem = this.dataItem($(evt.currentTarget).closest("tr"));
				console.log("pop up hyperlinks: " + dataItem[fgm.column_oid]);
				fgm._popupMenuForFeature(dataItem[fgm.column_oid], 
					evt.currentTarget, {left:evt.clientX, top:evt.clientY}); 
			} 
		}, 
		"elevation": { 
			name: "Elevation",
			text:"",
			hidden: true, 
			class: "ob-icon-only",
			//imageClass: "k-icon fgm-cmd-icon-elevation ob-icon-only",
			imageClass: "fa fa-area-chart fa-fw",
			click: function(evt) {
				var dataItem = this.dataItem($(evt.currentTarget).closest("tr"));
				console.log("create elevation: " + dataItem[fgm.column_oid]);
				// find the feature by OID
				var feature = fgm._findFeatureByOID(dataItem[fgm.column_oid]); 				
				// broadcast an event for any listener
				topic.publish("featureGrid/feature", feature); 
			}
		}
	}; 
	
	/* --------------------- */
	/* Private UI Functions  */
	/* --------------------- */

	fgm.buildFeatureGrid = function(searchParams, options) {
		fgm.searchParams = searchParams; 
		fgm._mixInOptions(options);
		
		// remove it if any
		fgm._removeFeatureGrid(); 

		// prepare the graphic layers
		if (!fgm._fgLayer) {
			fgm._fgLayer = new GraphicsLayer({id: fgm._fgLayerId}); 
		}
		if (fgm.options.map.getLayer(fgm._fgLayerId)) {
			fgm._fgLayer.clear(); 
		} else {
			fgm.options.map.addLayer(fgm._fgLayer);
		}
		
		if (!fgm._fhlgLayer) {
			fgm._fhlgLayer = new GraphicsLayer({id: fgm._fhlgLayerId}); 
		}		
		if (fgm.options.map.getLayer(fgm._fhlgLayerId)) {
			fgm._fhlgLayer.clear(); 
		} else {
			fgm.options.map.addLayer(fgm._fhlgLayer);
		}
		
		// add the html skeleton
		var splitterDiv = $('<div id="fgm-resultSplitter" style="height:98%"></div>'); 
		var panelContainerDiv = $('<div id="fgm-panelContainer"></div>');
		panelContainerDiv.append('<div id="fgm-layerToolbar"></div>');
		panelContainerDiv.append('<div id="fgm-layerPanelbar"></div>');
		splitterDiv.append(panelContainerDiv); 
		var gridContainerDiv = $('<div id="fgm-gridContainer"></div>');
		gridContainerDiv.append('<div id="fgm-datagrid"></div>');
		gridContainerDiv.append('<div id="fgm-datapager"></div>');
		splitterDiv.append(gridContainerDiv); 
		
		var winDiv = $('<div id="fgm-resultWindow"></div>'); 
		winDiv.append(splitterDiv);
		$("body").append(winDiv); 

		var dockerDiv = $('<span id="fgm-panelDock">Show Results</span>'); 
		dockerDiv.addClass("k-button"); 
		dockerDiv.hide(); 
		$("body").append(dockerDiv);
		
		// build UI widgets
		fgm._buildResultWindow(); 
		fgm._buildResultTools();
		fgm._buildResultPanels();
		
		// add messaging advisors
		fgm._addMessageAdvisors(); 
		
		topic.publish("featureGrid/ready", "fgm ready"); 
	};
	
	fgm._buildResultWindow = function() {
		// datagrid window
		var resultWin = $("#fgm-resultWindow"),
			resultSplitter = $('#fgm-resultSplitter'),
			panelDock = $("#fgm-panelDock")
					.bind("click", function() {
						resultWin.data("kendoWindow").open();
						panelDock.hide();
					});

		var onClose = function() {
			//panelDock.show();
			fgm._removeFeatureGrid();
		};

		if (!resultWin.data("kendoWindow")) {
			resultWin.kendoWindow({
				width: "1050px",
				height: "500px",
				title: "Query Results",
				actions: [
					//"Pin",
					"Minimize",
					"Maximize",
					"Close"
				],
				close: onClose,
				//minimize: onMinimize,
				resize: fgm.resizePanes, 
				visible: false
			});
			
			fgm._resultWindow = $("#fgm-resultWindow").data("kendoWindow");
			fgm._resultWindow.center().open(); 
		}
		
		resultSplitter.kendoSplitter({
			orientation: 'horizontal',
			panes: [
				{ collapsible: false, resizable: true, size: "200px"},
				{ collapsible: false, resizable: true }
			]
		});	
		
	};
	
	fgm._removeFeatureGrid = function() {
		
		// reset all state variables
		fgm.resultCache = {}; 
		fgm._currentPage = -1; 
		fgm._currentQuery = null; 
		fgm.selectedPanel = null; 
		fgm.selectedRowOID = null;
		fgm._cxtMenuItems = []; 		
		
		// remove messageing advisors
		fgm._removeMessageAdvisors(); 		
		
		// remove the graphic layer from map 
		$([fgm._fgLayer, fgm._fhlgLayer]).each(function(idx, gLayer) {
			if (gLayer) {
				fgm.options.map.removeLayer(gLayer);
				gLayer = null; 
			}
		}); 
		
		// remove the html skeleton
		var panelDock = $("#fgm-panelDock"); 
		if(panelDock) {
			panelDock.unbind("click"); 
			panelDock.remove(); 
		}
		
		fgm._removeResultGrid(); 
		fgm._removeResultPager(); 
		
		var toolbar = $("#fgm-layerToolbar");
		if(toolbar) {
			toolbar.remove(); 
		}
		
		var kdoElement = $("#fgm-layerPanelbar"); 
		if (kdoElement) {
			if (kdoElement.data("kendoPanelBar")) {
				kdoElement.data("kendoPanelBar").destroy();
			}
			kdoElement.empty();
		}
		
		kdoElement = $("#fgm-kendoSplitter"); 
		if (kdoElement) {
			if (kdoElement.data("kendoSplitter")) {
				kdoElement.data("kendoSplitter").destroy();
			}
			kdoElement.empty();
		}
		
		kdoElement = $("#fgm-resultWindow"); 
		if (kdoElement) {
			if (kdoElement.data("kendoWindow")) {
				kdoElement.data("kendoWindow").destroy();
			}
			kdoElement.empty();	
		}
		
		fgm._resultWindow = null; 
		
		topic.publish("featureGrid/destroyed", "fgm destroyed"); 
	};
	
	fgm._buildResultTools = function() {
		var toolbar = $("#fgm-layerToolbar");
		
		toolbar.append(
			/*
			$("<span></span>").addClass("fgm-layerTool-icon").click(fgm._zoomToFeaturesInPage)
							  .append(
								$("<i></i>").addClass("fa fa-search-plus fa-2x")
							  ) */
			//$("<span></span>").addClass("fgm-layerTool-zoomIn").click(fgm._zoomToFeaturesInPage); 
			$("<span></span>").addClass("fgm-layerTool-zoomIn").click(function() {
				if (fgm._currentQuery) {
					fgm._zoomToFeaturesInPage(); 
				} else {
					console.log("no datagrid is loaded"); 
					//fgm.showMessage("select a dataset first"); 
				}
			})
		); 
		toolbar.append(
			/*
			$("<span></span>").addClass("fgm-layerTool-icon").click(fgm._exportAsExcel)
							  .append(
								$("<i></i>").addClass("fa fa-table fa-2x")
							  ) */
			/*
			 * just to set the _exportAsExcel function to the jquery click function wouldn't work with dojo AOP.
			 * has to wrap the call into an anonymous function. This won't be an issue with dojo functions.
			 */
			//$("<span></span>").addClass("fgm-layerTool-excel").click(fgm._exportAsExcel); 
			$("<span></span>").addClass("fgm-layerTool-excel").click(function() {
				if (fgm._currentQuery) {
					fgm._exportAsExcel();  
				} else {
					console.log("no datagrid is loaded"); 
					//fgm.showMessage("select a dataset first"); 
				}
			})
		); 
		toolbar.append(
			/*
			$("<span></span>").addClass("fgm-layerTool-icon").click(fgm._launchToast)
							  .append(
								$("<i></i>").addClass("fa fa-windows fa-2x")
							  ) */
			//$("<span></span>").addClass("fgm-layerTool-tdb").click(fgm._launchToast); 
			$("<span></span>").addClass("fgm-layerTool-tdb").click(function() {
				if (fgm._currentQuery) {
					fgm._launchToast(); 
				} else {
					console.log("no datagrid is loaded"); 
				}
			})
		); 
	};
	
	fgm._buildResultPanels = function() {
		// build the panelbar UI
		var layerPane = $("#fgm-layerPanelbar");
		var groupIds = [], prevGrpName; 
		var grpElement, listElement; 
		$(fgm.searchParams).each(function(idx, item) {
			if (prevGrpName !== item["name"]) {
				groupIds.push("#"+fgm._normalize(item["name"])); 
				prevGrpName = item["name"]; 
				grpElement = $("<li></li>").attr("id", fgm._normalize(item["name"]))
										   .attr("udata-grpname", item["name"])
										   .html(item["name"]);
				listElement = $("<ul></ul>"); 
				layerPane.append(grpElement.append(listElement));
			}
			if (listElement) {
				$(item["queries"]).each(function(idx, qry) {
					var normalizedQueryName = fgm._normalize(qry["name"]); 
					listElement.append(
						$("<li></li>").attr("id", fgm._normalize(item["name"]) + fgm.depthSeparator + fgm._normalize(qry["name"]))
									  .attr("udata-qryname", item["name"]+fgm.depthSeparator+qry["name"])
									  .html(qry["name"])
					);
				}); 
			}
		});

		layerPane.kendoPanelBar({
			expandMode: "multiple",
			select: fgm.onSelectResultPanel
		});
		
		var panelBar = layerPane.data("kendoPanelBar");
		$(groupIds).each(function(idx, grpId) {
			panelBar.expand($(grpId), false); 
		}); 
		
		// initiate the async query
		//fgm._queryForStats(); 
		//fgm._queryForOID(); 		
		fgm._fireQueriesForOID(); 
	};
	
	fgm._buildResultGrid = function(resultData, resultColumns) {		
		// remove if it exists
		fgm._removeResultGrid();
		// build a new one
		var gridContainerDiv = $("#fgm-gridContainer");
		var dg = $("#fgm-datagrid");
		dg.kendoGrid({
			//width: gridContainerDiv.width() - 30, 
			height: gridContainerDiv.height() - 50, 
			//width: 818,
			//height: 470,	height: 405, 
			dataSource: resultData,
			columns: resultColumns, 
			columnMenu: true,
			groupable: true,
			filterable: true,
			pageable: false, /*use separate pager*/
			reorderable: true,
			resizable: true, 
			selectable: "row", 
			sortable: true,
			change: fgm.onRowSelect
		});	

		fgm._datagrid = dg.data("kendoGrid");
		
	};
	
	fgm._removeResultGrid = function() {
		// clear the graphic layer from map 
		$([fgm._fgLayer, fgm._fhlgLayer]).each(function(idx, gLayer) {
			if (gLayer) {
				gLayer.clear();  
			}
		}); 
		
		// destroy the datagrid 
		var dgElement = $("#fgm-datagrid"); 
		if (dgElement) {
			if ( dgElement.data("kendoGrid")) {
				dgElement.data("kendoGrid").destroy();
			}
			dgElement.empty(); 
			//dgElement.remove();
		}
		
		fgm._datagrid = null; 
	};
	
	fgm._buildResultPager = function(OIDArray) {		
		
		var OIDModeledColumns = [{
			"field": "oid"
		}];
		
		var OIDModeledArray = []; 
		$(OIDArray).each(function(idx, item) {
			OIDModeledArray.push({"oid": item}); 
		});
		
		var dataSource = new kendo.data.DataSource({
			data: OIDModeledArray, 			
			pageSize: fgm.options.pageSize
		});
		dataSource.read();

		var pg = $("#fgm-datapager");
		pg.kendoPager({
			//width: 818,
			//width: gridContainerDiv.width() - 30, 
			height: 65,
			dataSource: dataSource, 
			columns: OIDModeledColumns, 
			//refresh: true,
			//pageSizes: true,
			buttonCount: 3, 
			input: true, 
			//info: false,
			change: fgm.onPageChanged
		}); 

		fgm._dataPager = pg.data("kendoPager");
	};
	
	fgm._removeResultPager = function() {
		var pgElement = $("#fgm-datapager"); 
		if (pgElement) {
			if ( pgElement.data("kendoPager")) {
				pgElement.data("kendoPager").destroy();
			}
			pgElement.empty(); 
			//pgElement.remove();
		}
	};
	
	/* --------------------------------- */
	/* Private Messaging AOP Connectors  */
	/* --------------------------------- */	
	
	fgm._addMessageAdvisors = function() {
		console.log("add message advisors");
		
		fgm._messageAdvisors.push(
			aspect.before(fgm, "_exportAsExcel", function() {
				fgm.showMessage("exporting data into Excel..."); 
			}, true)
		); 
		fgm._messageAdvisors.push(
			aspect.after(fgm, "_prepareExcelData", function() {
				fgm.showMessage("");
			}, true)
		);	
		fgm._messageAdvisors.push(
			aspect.after(fgm, "_exportAsExcelFailed", function(err) {
				var errMsg = (err && err.message && err.message.length > 0)?err.message:"Excel export failed"; 
				fgm.showMessage(errMsg);
			}, true)
		);	
		
		fgm._messageAdvisors.push(
			aspect.before(fgm, "_launchToast", function() {
				fgm.showMessage("launching Toast browser..."); 
			}, true)
		); 
		fgm._messageAdvisors.push(
			aspect.after(fgm, "_openUrlInBrowser", function() {
				fgm.showMessage("");
			}, true)
		);	
		fgm._messageAdvisors.push(
			aspect.after(fgm, "_launchToastFailed", function(err) {
				var errMsg = (err && err.message && err.message.length > 0)?err.message:"Launch Toast failed"; 
				fgm.showMessage(errMsg);
			}, true)
		);	
		
		fgm._messageAdvisors.push(
			aspect.before(fgm, "_removeFeature", function() {
				fgm.showMessage("removing row from datagrid..."); 
			}, true)
		); 
				
		fgm._messageAdvisors.push(
			aspect.before(fgm, "_queryForDataByOIDs", function() {
				fgm.showMessage("loading data into datagrid..."); 
			}, true)
		); 
		fgm._messageAdvisors.push(
			aspect.after(fgm, "_prepareDataResults", function() {
				fgm.showMessage("");
			}, true)
		);
		fgm._messageAdvisors.push(
			aspect.after(fgm, "_replaceDataInResultGrid", function() {
				fgm.showMessage("");
			}, true)
		);
		fgm._messageAdvisors.push(
			aspect.after(fgm, "_queryFailed", function(err) {
				var errMsg = (err && err.message && err.message.length > 0)?err.message:"Data Query failed"; 
				fgm.showMessage(errMsg);
			}, true /*receive original arguments*/)
		);	
	}; 
	
	fgm._removeMessageAdvisors = function() {
		console.log("remove message advisors");
		
		$(fgm._messageAdvisors).each(function(idx, connector) {
			connector.remove(); 
		}); 
		fgm._messageAdvisors = []; 
	}; 	
	
	/* ----------------------- */
	/* Private Event Handlers  */
	/* ----------------------- */	

	fgm.resizePanes = function (evt) {
		$('#fgm-resultSplitter').trigger("resize");

		//var newGridHeight = evt.height - 30;
		var newGridHeight = evt.height - 78;
		//console.log("resize datagrid height = " + newGridHeight);
		var gridElement = $("#fgm-datagrid");
		gridElement.height(newGridHeight);
		if (gridElement.data("kendoGrid")) {
			gridElement.data("kendoGrid").resize();
		}	
	};
	
	fgm.onSelectResultPanel = function(evt) {

		var queryName = $(evt.item).attr("udata-qryname"); 
		if (queryName && (queryName.length > 0)) {
			if (fgm._currentQuery !== queryName) {
				console.log("Panel Selection Changed: " + queryName);
				fgm.selectedPanel = $(evt.item); 

				// remove the current datagrid
				fgm._removeResultGrid(); 
				fgm._removeResultPager(); 
				
				var qry = fgm._readFromCache(queryName, "query"); 
				var OIDArray = fgm._readFromCache(queryName, "OIDs"); 
				var tdbField = fgm._readFromCache(queryName, "tdbField");
				
				if (!tdbField) {
					// retrieve the tdb field
					fgm._checkTdbField(queryName, qry); 					
				} else {
					// show or hide the toast launch button
					if (tdbField === "none") {
						fgm._hideTdbLink();
					} else {
						fgm._showTdbLink();
					}
				}
				
				// keep track of currentQuery
				fgm._currentQuery = queryName; 
				fgm._currentPage = 0; 				
				
				if (qry && OIDArray) {
					// request data by OIDs
					var OIDsForPage = OIDArray.slice(0, Math.min(OIDArray.length, fgm.options.pageSize));
					fgm._queryForDataByOIDs(qry, OIDsForPage, false); 
					// build the pager 
					fgm._buildResultPager(OIDArray); 
				} else {
					console.log("error: no query for " + queryName); 
				}
			}
		} else {
			evt.preventDefault(); 
			//evt.stopPropagation();
			
			//set the selected panel 
			if (fgm.selectedPanel) {
				var panelBar = $("#fgm-layerPanelbar").data("kendoPanelBar"); 
				panelBar.select(fgm.selectedPanel); 
			}
		}
	};
	
	fgm.onRowSelect = function() {
		var dg = this; 
		var rowData = dg.dataItem(dg.select()); 
		var rowOID = rowData[fgm.column_oid]; 
		
		if (fgm.selectedRowOID !== rowOID) {
			console.log("onRowSelect: " + rowOID); 
			
			fgm._highlightFeature(rowOID, true); 
		}
	};
	
	fgm.onPageChanged = function(evt) {
		console.log("onPageChanged: " + evt); 
		fgm._queryForDataByPage(evt.index - 1); 
	};
	
	fgm.onHyperlinkCxtMenuSelect = function(evt) {
		console.log("Hyperlink CxtMenu Selected: " + evt.item.textContent);
		if (fgm._cxtMenuItems) {
			for(var m=0,l=fgm._cxtMenuItems.length; m<l; m++) {
				if (evt.item.textContent === fgm._cxtMenuItems[m].text) {
					if (fgm._cxtMenuItems[m].hyperlink) {
						console.log("open url: " + fgm._cxtMenuItems[m].hyperlink); 
						window.open(fgm._cxtMenuItems[m].hyperlink); 
					}
					break; 
				}
			}
		}
	};
	
	fgm.onHyperlinkCxtMenuClose = function() {
		console.log("Hyperlink CxtMenu Closed");
	};
	
	/* -------------------------- */
	/* Private Utility Functions  */
	/* -------------------------- */
	
	fgm._mixInOptions = function(usrOptions) {
		if (usrOptions) {
			for(var k in usrOptions) {
				fgm.options[k] = usrOptions[k]; 
			}
		}
	};
	
    fgm._normalize = function(name) {
		if (name) {
			return name.replace(/\W/g, "_"); 
		} else {
			return name; 
		}
	};
	
	fgm._writeIntoCache = function(queryName, value, key) {
		if (key) {
			if (!fgm.resultCache[queryName]) {
				fgm.resultCache[queryName] = {}; 
			}
			fgm.resultCache[queryName][key] = value;
		} else {
			fgm.resultCache[queryName] = value;
		}
	};
	
	fgm._readFromCache = function(queryName, key) {
		if (fgm.resultCache[queryName]) {
			if (key) {
				return fgm.resultCache[queryName][key];
			} else {
				return fgm.resultCache[queryName]; 
			}
		}
		return null; 
	};	

	/* --------------------------- */
	/* Override Utility Functions  */
	/* --------------------------- */
	
	fgm.showMessage = function(message) {
		var wndElement, 
			wndContentElement = $("#fgm-resultWindow"),
			msgElement = $("#fgm-statusMessage"); 
		if (! msgElement.length) {
			wndElement = wndContentElement.parent(); 
			wndElement.append($('<span id="fgm-statusMessage"></span>'));
		}
		
		msgElement = $("#fgm-statusMessage");
		msgElement.hide(); 
		
		if (message && message.length > 0) {
			message = message.trim(); 
			msgElement.text(message); 
			
			var width = wndContentElement.width();
			msgElement.css({
				top: 5, 
				left: (width/2)-message.length*5,
				display: "block"
			}); 
		} else {
			msgElement.text(""); 
		}
	}; 
	
	/* ------------------------ */
	/* Private Query Functions  */
	/* ------------------------ */
	
	// query option 1 (START): parallel query - Queryllel
	fgm._fireQueriesForOID = function() {
		$(fgm.searchParams).each(function(idx, item) {
			$(item["queries"]).each(function(idx, qry) {
				var queryName = item["name"]+fgm.depthSeparator+qry["name"]; 
				var groupId = fgm._normalize(item["name"]),
					itemId = fgm._normalize(qry["name"]); 
				var elementId = groupId + fgm.depthSeparator + itemId; 				
				var loadingId = elementId + fgm.depthSeparator + fgm._loadingIdSuffix; 
				
				// add the loading element
				var queryElement = $("#" + elementId);
				var itemElement = queryElement.children("span");
				if (itemElement) {
					var loadingElement = $(fgm.loadingHtml).attr("id", loadingId); 
					itemElement.append(loadingElement); 
				}	
				
				// cache query
				fgm._writeIntoCache(queryName, qry, "query");
				
				// fire query
				var qll =  new Queryllel(queryName, elementId, fgm._showOIDResults); 
				fgm._queryllelArray.push(qll);
				qll.query(qry); 
			})
		}); 
		
		// init the status check 
		console.log("start query status checking ");
		setTimeout(fgm._checkOIDQueryStatus, fgm._queryCheckInterval); 
	};

	fgm._showOIDResults = function(queryName, elementId, results) {
		// add the number of OIDs into the query element
		var queryElement = $("#"+elementId); 
		if (! results || results.length === 0) {
			if (queryElement.data("kendoGrid")) {
				queryElement.data("kendoGrid").destroy();
			}
			queryElement.empty(); 
			queryElement.remove();
		} else {
			var itemElement = queryElement.children("span"); 
			itemElement.html(itemElement.html().replace(fgm.loadingHtml, "") + " (" + results.length + ")");

			// remove the loading element
			var loadingId = elementId + fgm.depthSeparator + fgm._loadingIdSuffix; 
			var loadingElement = $("#" + loadingId);
			if (loadingElement) {
				loadingElement.remove(); 
			}
		}		
	};
	
	// query option 1 (): check status & process results
	fgm._checkOIDQueryStatus = function () {
		console.log("query status checking ..."); 
		var allDone = true;
		$(fgm._queryllelArray).each(function(idx, q) {
			if (q.isDone() === true) {
				// cache the query results 
				// - one result could be cached more than once but the same content
				var queryName = q.getQueryName(); 
				var results = q.getResults(); 
				fgm._writeIntoCache(queryName, results, "OIDs"); 
				fgm._writeIntoCache(queryName, (!results)?0:results.length, "rowCount"); 
			} else {
				allDone = false; 
			}
		}); 
		
		if(allDone !== true) {
			setTimeout(fgm._checkOIDQueryStatus, fgm._queryCheckInterval); 
		} else {
			console.log("all OID queries done");

			// scan the groups in the panelbar 
			var isGroupEmpty = {}, allGroupsEmpty = true; 
			$(fgm._queryllelArray).each(function(idx, q) {
				var queryName = q.getQueryName(), 
					panelId = queryName.split(fgm.depthSeparator),
					groupId = fgm._normalize(panelId[0]); 
				
				var rowCount = fgm._readFromCache(queryName, "rowCount");
				if (groupId in isGroupEmpty) {
					isGroupEmpty[groupId] = isGroupEmpty[groupId] && (rowCount === 0);					
				} else {
					isGroupEmpty[groupId] = (rowCount === 0);
				}
			}); 
			// remove any empty group panel 
			for(var groupId in isGroupEmpty) {
				if (isGroupEmpty[groupId] === true) {
					console.log("delete an empty group: " + groupId); 
					var groupElement = $("#"+groupId); 
					if (groupElement) {
						groupElement.empty(); 
						groupElement.remove();
					}
				} else {
					allGroupsEmpty = false;  
				}
			}
			// alert if there is no result at all
			if (allGroupsEmpty === true) {
				fgm._removeFeatureGrid(); 
				alert("no data found");
			}
			// clear the queryllel array
			fgm._queryllelArray = []; 
		}
	};
	// query option 1 (END)
	
	// query option 2 (START): dojo.promise/all
	fgm._queryForOID = function() {
		
		var promiseDict = {}; 
		$(fgm.searchParams).each(function(idx, item) {
			$(item["queries"]).each(function(idx, qry) {
				console.log("query [" + qry["where"] + "] on " + qry["serviceUrl"]); 
				var queryName = item["name"]+fgm.depthSeparator+qry["name"]; 
				
				// cache query
				fgm._writeIntoCache(queryName, qry, "query");
				
				var query = new Query();
				query.where = qry["where"];
				query.geometry = qry["geometry"]; 
		
				var queryTask = new QueryTask(qry["serviceUrl"]); 
				 
				promiseDict[queryName] = queryTask.executeForIds(query); 
			});
		}); 
		
		all(promiseDict).then(fgm._prepareOIDResults, fgm._queryFailed);
	};
	
	// query option 2 (): process results
	fgm._prepareOIDResults = function(OIDResults) {
		var isGroupEmpty = {}, allGroupsEmpty = true; 
		for(var queryName in OIDResults) {
			console.log("OIDs for " + queryName); 
			var panelId = queryName.split(fgm.depthSeparator),
				groupId = fgm._normalize(panelId[0]),
				itemId = fgm._normalize(panelId[1]);

			if (!(groupId in isGroupEmpty)) {
				isGroupEmpty[groupId] = true;
			}
			
			var elementId = groupId + fgm.depthSeparator + itemId; 
			var queryPanelElement = $("#"+elementId); 

			if (! OIDResults[queryName] || OIDResults[queryName].length === 0) {
				if (queryPanelElement.data("kendoGrid")) {
					queryPanelElement.data("kendoGrid").destroy();
				}
				queryPanelElement.empty(); 
				queryPanelElement.remove();
				
				OIDResults[queryName]= [];
			} else {
				isGroupEmpty[groupId] = false; 
				var itemElement = queryPanelElement.children("span"); 
				itemElement.html(itemElement.html() + " (" + OIDResults[queryName].length + ")");
			}
			
			// cache the query results
			fgm._writeIntoCache(queryName, OIDResults[queryName], "OIDs"); 
			fgm._writeIntoCache(queryName, OIDResults[queryName].length, "rowCount"); 
		}
		
		for(groupId in isGroupEmpty) {
			// remove any empty group panel 
			if (isGroupEmpty[groupId] === true) {
				var groupElement = $("#"+groupId); 
				if (groupElement) {
					groupElement.empty(); 
					groupElement.remove();
				}
			} else {
				allGroupsEmpty = false;  
			}
		}
		
		if (allGroupsEmpty === true) {
			fgm._removeFeatureGrid(); 
			alert("no data found");
		}
	};
	// query option 2 (END)
		
	fgm._queryForDataByWhere = function(qry, replaceDataOnly) {

		console.log("query [" + qry["where"] + "] on " + qry["serviceUrl"]); 

		var query = new Query();
		query.returnGeometry = true;
		query.outFields = ["*"];
		query.where = qry["where"];
		query.geometry = qry["geometry"]; 

		if (fgm.options.map) {
			query.outSpatialReference = fgm.options.map.spatialReference; 
		}
		
		var queryTask = new QueryTask(qry["serviceUrl"]); 
		if (replaceDataOnly === true) {
			queryTask.execute(query, fgm._replaceDataInResultGrid, fgm._queryFailed);
		} else {
			queryTask.execute(query, fgm._prepareDataResults, fgm._queryFailed);
		}		
	};
	
	fgm._queryForDataByOIDs = function(qry, OIDs, replaceDataOnly) {
		console.log("query by OIDs on " + qry["serviceUrl"]); 
		
		var query = new Query();
		query.returnGeometry = true;
		query.outFields = ["*"];
		query.objectIds = OIDs; 

		if (fgm.options.map) {
			query.outSpatialReference = fgm.options.map.spatialReference; 
		}
		
		var queryTask = new QueryTask(qry["serviceUrl"]); 
		if (replaceDataOnly === true) {
			queryTask.execute(query, fgm._replaceDataInResultGrid, fgm._queryFailed);
		} else {
			queryTask.execute(query, fgm._prepareDataResults, fgm._queryFailed);
		}		
	};
	
	fgm._queryForDataByPage = function(pageIdx /*zero-based*/) {
		var queryName = fgm._currentQuery;		
		var rowCount = fgm._readFromCache(queryName, "rowCount");
		if (rowCount === 0) {
			// no more data so empty the datagrid
			var results = fgm._readFromCache(queryName, "data");
			results.features = []; 
			fgm._replaceDataInResultGrid(results); 
		} else {
			var OIDStartIdx = pageIdx * fgm.options.pageSize; 
			if (OIDStartIdx < rowCount) {
				var qry = fgm._readFromCache(queryName, "query");
				var OIDArray = fgm._readFromCache(queryName, "OIDs");
				if (qry && OIDArray) {
					var OIDEndIdx = Math.min(OIDStartIdx + fgm.options.pageSize, rowCount); 
					var OIDsForPage = OIDArray.slice(OIDStartIdx, OIDEndIdx);
					fgm._queryForDataByOIDs(qry, OIDsForPage, true /*replaceDataOnly*/); 

					fgm._currentPage = pageIdx;
				}
			} else {
				// go to the last page instead
				var lastPageIdx = fgm._dataPager.totalPages() - 1; 
				fgm._queryForDataByPage(lastPageIdx); 
			}
		}
	};
	
	fgm._prepareDataResults = function(results) {
		
		// cache the query results (limited by fgm.options.pageSize)
		var queryName = fgm._currentQuery; 
		results.features = results.features.slice(0, fgm.options.pageSize); 
		fgm._writeIntoCache(queryName, results, "data");
		
		// prepare columns and model for a new grid
		var resultColumns = [], fieldTypes = {}; 
		var fieldCount = results.fields.length; 
		for(var i=0; i<fieldCount; i++) {
			var resultField = results.fields[i]; 
			// filter out the shape column and any derived column, and other non-alphanumeric columns
			var isBinaryColumn = (jQuery.inArray(resultField["type"], ["esriFieldTypeBlob", "esriFieldTypeRaster"]) > -1);
			var isShapeColumn = (resultField["type"] === "esriFieldTypeGeometry");
			var isDerivedColumn = (resultField["name"].indexOf(".") > -1); 
			if (isBinaryColumn === true || isShapeColumn === true || isDerivedColumn === true) {
				continue; 
			} 
			// discover the OID column
			var isIDColumn = (resultField["type"] === "esriFieldTypeOID");
			if (isIDColumn === true) {
				fgm.column_oid = resultField["name"]; 
			}
			// find any column disguised as string but should be presented as hyperlink
			var columnTmpl = null, isHyperlinkColumn = false; 
			for(var t=0,tl=fgm.options.columnTemplates.length; t<tl; t++) {
				var tmpl = fgm.options.columnTemplates[t]; 
				if (tmpl["name"] === resultField["name"]) {
					isHyperlinkColumn = true; 
					switch(tmpl["contentType"]) {
						case "url":
							columnTmpl = '<a target="_blank" style="color:Blue" href="#=' 
								+ resultField["name"] + '#">' + resultField["alias"] + '</a>'; 
							break; 
						case "a_tag":
							// use "#= column#" instead of "#: column#" 
							// for Kendo to parse out the column value, whether html-tag or not
							columnTmpl = '#=' + resultField["name"] + '#'; 
							break; 
					}
					break;
				} 
			}
			// determine the column width based on the field length
			var fieldLength = resultField["length"]; 
			var columnWidth = fieldLength?Math.min(fieldLength*20, fgm.options.maxColumnWidth):fgm.options.minColumnWidth; 	
			
			resultColumns.push({
				"field": resultField["name"],
				"title": resultField["alias"], 
				"template": columnTmpl, 
				"hidden": isIDColumn, 
				"width": columnWidth, 
				"filterable": !isHyperlinkColumn,
				"groupable": !isHyperlinkColumn,
				"sortable": !isHyperlinkColumn
			});
			
			// translate the data type to what kendo understands
			var dataType; 
			switch(resultField["type"]) {
				case "esriFieldTypeString":
				case "esriFieldTypeGUID":
				case "esriFieldTypeGlobalID":
					fieldTypes[resultField["name"]] = {
						type: "string"
					};
					break;
				case "esriFieldTypeOID":
				case "esriFieldTypeSmallInteger":
				case "esriFieldTypeInteger":
				case "esriFieldTypeSingle":
				case "esriFieldTypeDouble":
					fieldTypes[resultField["name"]] = {
						type: "number"
					};
					break; 
				case "esriFieldTypeDate":
					fieldTypes[resultField["name"]] = {
						type: "date", 
						parse: function(t) {
							var d = new Date(t); 
							return d.toLocaleDateString(); 
						}
					}; 
					break; 
				default: 
					dataType = "string"; 
			}
			 
		}
		var actionColumn = fgm._composeActionColumn(results); 
		var dgColumns = $.merge([actionColumn], resultColumns);
		//var dgColumns = $.merge([fgm.actionColumn], resultColumns);
		fgm._writeIntoCache(queryName, dgColumns, "dgColumns"); 
		
		var resultModel = kendo.data.Model.define({
			id: fgm.column_oid, // the identifier of the model
			fields: fieldTypes
		});
		fgm._writeIntoCache(queryName, resultModel, "dgModel"); 
		
		// pack data into array
		var resultItems = [];
		var resultCount = results.features.length;
		for (var i = 0; i < resultCount; i++) {
			resultItems.push(results.features[i].attributes);
		}
		
		// prepare data for a new grid
		var dataSource = new kendo.data.DataSource({
			data: resultItems, 
			schema: {model: resultModel}, 
			pageSize: fgm.options.pageSize
		});
		dataSource.read(); 
		
		fgm._buildResultGrid(dataSource, dgColumns); 
		
		fgm._displayDataOnMap(results); 
	};
	
	fgm._replaceDataInResultGrid = function(results) {
		// cache the query results (limited by fgm.options.pageSize)
		var queryName = fgm._currentQuery; 
		results.features = results.features.slice(0, fgm.options.pageSize); 
		fgm._writeIntoCache(queryName, results, "data");

		// retrieve the column and model definitions from cache 
		var dgColumns = fgm._readFromCache(queryName, "dgColumns"); 
		var resultModel = fgm._readFromCache(queryName, "dgModel"); 
		
		// pack data into array
		var resultItems = [];
		var resultCount = results.features.length;
		for (var i = 0; i < resultCount; i++) {
			resultItems.push(results.features[i].attributes);
		}
		
		// prepare data for a new grid
		var dataSource = new kendo.data.DataSource({
			data: resultItems, 
			schema: {model: resultModel}, 
			pageSize: fgm.options.pageSize
		});
		dataSource.read(); 
		
		fgm._buildResultGrid(dataSource, dgColumns); 
		
		fgm._displayDataOnMap(results); 		
	};
	
	/* DEV: 
	 * data is loaded properly. 
	 * However, sorting or grouping failed silently on the replaced data 
	 */
	fgm._replaceDataInResultGrid_OLD = function(results) {		
		// cache the query results (limited by fgm.options.pageSize)
		var queryName = fgm._currentQuery; 
		results.features = results.features.slice(0, fgm.options.pageSize); 
		fgm._writeIntoCache(queryName, results, "data");

		// load data into grid
		var resultCount = results.features.length;
		var resultItems = [];
		for (var i = 0; i < resultCount; i++) {
			resultItems.push(results.features[i].attributes);
		}
		
		var dataSource = new kendo.data.DataSource({
			data: resultItems, 
			pageSize: fgm.options.pageSize
		});
		dataSource.read(); 
		
		fgm._datagrid.dataSource = dataSource; 		
		fgm._datagrid.refresh();
		
		fgm._displayDataOnMap(results);
	};
	
	fgm._queryFailed = function(err) {
		console.log("query Failed: " + err); 
	};

	fgm._composeActionColumn = function(results) {
		var cmdColumns = []; 
		
		// the remove command
		cmdColumns.push(fgm._cmdColumnConfig["remove"]);
		
		if (results.geometryType) {
			// the zoom to map command
			cmdColumns.push(fgm._cmdColumnConfig["zoomIn"]);
			
			if (results.geometryType === "esriGeometryPolyline") {
				// the line elevation command
				cmdColumns.push(fgm._cmdColumnConfig["elevation"]);
			}
		}
		
		var fieldCount = results.fields.length;  
		var resultField, linkFields;
		for(var f=0; f<fieldCount; f++) {
			resultField = results.fields[f];
			if (resultField["type"] === "esriFieldTypeString") {
				linkFields = $.grep(fgm.options.columnTemplates, function(item) {
					return (resultField["name"] === item["name"])
						&& (fgm._linkTypes.indexOf(item["contentType"]) > -1); 
				});
				if (linkFields.length > 0) {
					// the hyperlink menu command
					cmdColumns.push(fgm._cmdColumnConfig["hyperlink"]); 
					break; 
				}
			}
		}
		
		return /*actionColumn*/ {
			command: cmdColumns,
			locked: true, 
			width: 45 * cmdColumns.length + 6
		};
	}; 

	/* ---------------------------------- */
	/* Private Map-Interaction Functions  */
	/* ---------------------------------- */
	
	fgm._displayDataOnMap = function(results) {
		console.log("display Data On Map");
		
		if (!fgm.options.map) {
			console.log("no map available"); 
			return; 
		} 
		
		fgm._fhlgLayer.clear(); 
		fgm._fgLayer.clear(); 
		
		if (! results || results.features.length === 0) {
			console.log("empty results"); 
			return; 
		}
		
		var symbol; 
		switch(results.geometryType) {
			case "esriGeometryPoint":
				symbol = new SimpleMarkerSymbol(fgm.options.symbols["point"]);
				break; 
			case "esriGeometryPolyline":
				symbol = new SimpleLineSymbol(fgm.options.symbols["line"]); 
				break; 
			case "esriGeometryPolygon":
				symbol = new SimpleFillSymbol(fgm.options.symbols["polygon"]); 
				break; 
		}

		var layerExtent = null; 
		for(var f=0; f<results.features.length; f++) {
			var feature = results.features[f]; 
			var attributes = feature.attributes, 
				geometry = feature.geometry,
				geometryExtent = feature.geometry.getExtent();
			
			if (geometryExtent) {
				if (!layerExtent) {
					layerExtent = new Extent(geometryExtent.toJson());
				} else {
					layerExtent = layerExtent.union(geometryExtent);
				}
			} else {
				if (!layerExtent) {
					layerExtent = new Extent(geometry.x, geometry.y, geometry.x, geometry.y, geometry.spatialReference);
				} else if (!layerExtent.contains(geometry)) {
					if (layerExtent.xmax < geometry.x)
						layerExtent.xmax = geometry.x;
					if (layerExtent.ymax < geometry.y)
						layerExtent.ymax = geometry.y;
					if (layerExtent.xmin > geometry.x)
						layerExtent.xmin = geometry.x;
					if (layerExtent.ymin > geometry.y)
						layerExtent.ymin = geometry.y;
				}
			}

			fgm._fgLayer.add(new Graphic(geometry, symbol, attributes));
		}
		
		if (layerExtent.getHeight() * layerExtent.getWidth() === 0) {
			fgm.options.map.centerAndZoom(layerExtent.getCenter(), 12);
		} else {
			fgm.options.map.setExtent(layerExtent, true);
		}
		
		// cache the extent of features on the current page
		fgm._writeIntoCache(fgm._currentQuery, layerExtent, "extent");
	};
	
	fgm._zoomToFeaturesInPage = function() {
		if (!fgm.options.map) {
			console.log("no map available"); 
			return; 
		} 

		if (!fgm._currentQuery) {
			console.log("no query is available"); 
			return; 
		}
			
		var layerExtent = fgm._readFromCache(fgm._currentQuery, "extent"); 
		if (!layerExtent) {
			console.log("no extent is available"); 
			return; 
		}
		
		if (layerExtent.getHeight() * layerExtent.getWidth() === 0) {
			fgm.options.map.centerAndZoom(layerExtent.getCenter(), 12);
		} else {
			fgm.options.map.setExtent(layerExtent, true);
		}
	};

	fgm._highlightFeature = function(OID, clearFirst) {
		
		if (clearFirst === true) {
			if (fgm._fhlgLayer) {
				fgm._fhlgLayer.clear(); 
			}
		}
		
		var queryName = fgm._currentQuery;
		var results = fgm._readFromCache(queryName, "data"); 
		
		var resultCount = results.features.length;
		for(var f=0; f<resultCount; f++) {
			if (OID === results.features[f].attributes[fgm.column_oid]) {
				var attributes = results.features[f].attributes, 
					geometry = results.features[f].geometry,
					geometryExtent = results.features[f].geometry.getExtent(); 

				var symbol; 
				switch(results.geometryType) {
					case "esriGeometryPoint":
						symbol = new SimpleMarkerSymbol(fgm.options.highlightSymbols["point"]);
						break; 
					case "esriGeometryPolyline":
						symbol = new SimpleLineSymbol(fgm.options.highlightSymbols["line"]); 
						break; 
					case "esriGeometryPolygon":
						symbol = new SimpleFillSymbol(fgm.options.highlightSymbols["polygon"]); 
						break; 
				}
				
				fgm._fhlgLayer.add(new Graphic(geometry, symbol, attributes)); 
				
				break; 
			}
		}
	};
	
	fgm._removeFeature = function(OID) {
			
		var queryName = fgm._currentQuery;
		
		// remove from the cached OID result
		var OIDArray = fgm._readFromCache(queryName, "OIDs");
		var f; 
		for(f=0; f<OIDArray.length; f++) {
			if (OID === OIDArray[f]) {
				OIDArray.splice(f, 1);
				break;
			}
		}
		
		// change the row count
		fgm._writeIntoCache(queryName, OIDArray.length, "rowCount"); 
		
		// reduce the count in the panel title
		var qry = fgm._readFromCache(queryName, "query");
		fgm.selectedPanel.children("span").text(qry["name"] + " (" + OIDArray.length + ")");
		
		// remove it from the pager datasource
		var dataSource = fgm._dataPager.dataSource;
		var dataItem = dataSource.at(f); 
		dataSource.remove(dataItem); 
		//dataSource.sync(); // nothing to be sent to the server side
		
		// reload the features for the current page 
		fgm._queryForDataByPage(fgm._currentPage); 
	};
		
	fgm._zoomToFeature = function(OID, highlighted) {
		var queryName = fgm._currentQuery;
		var results = fgm._readFromCache(queryName, "data");

		var feature = fgm._findFeatureByOID(OID, results); 
		if (feature) {			
			var attributes = feature.attributes, 
				geometry = feature.geometry;
			var geometryExtent = geometry.getExtent(); 

			if (highlighted === true) {
				var symbol; 
				switch(results.geometryType) {
					case "esriGeometryPoint":
						symbol = new SimpleMarkerSymbol(fgm.options.highlightSymbols["point"]);
						break; 
					case "esriGeometryPolyline":
						symbol = new SimpleLineSymbol(fgm.options.highlightSymbols["line"]); 
						break; 
					case "esriGeometryPolygon":
						symbol = new SimpleFillSymbol(fgm.options.highlightSymbols["polygon"]); 
						break; 
				}
				
				fgm._fhlgLayer.add(new Graphic(geometry, symbol, attributes));
			}
			
			if (!geometryExtent) { 
				geometryExtent = new Extent(geometry.x, geometry.y, geometry.x, geometry.y, geometry.spatialReference);
			}
			
			if (geometryExtent.getHeight() === 0 && geometryExtent.getWidth() === 0) {
				// zoom to a point
				fgm.options.map.centerAndZoom(geometryExtent.getCenter(), 12);
			} else {
				fgm.options.map.setExtent(geometryExtent, true);
			}
		}
	};
	
	fgm._popupMenuForFeature = function(OID, anchorElement, anchorPos) {
		
		// remove the eixsting  context menu
		var cxtMenuElement = $("#fgm-hyperlinkMenu"); 
		var cxtMenu;
		if (cxtMenuElement.length === 0) {
			// add a new element
			$("body").append('<ul id="fgm-hyperlinkMenu"></ul>');
			cxtMenuElement = $("#fgm-hyperlinkMenu"); 
		} else {
			// remove the existing element
			cxtMenu = cxtMenuElement.data("kendoContextMenu");
			if (cxtMenu) {
				cxtMenu.destroy(); 
			}
			cxtMenuElement.empty(); 
		}

		// build new context menu
		fgm._cxtMenuItems = []; 

		var queryName = fgm._currentQuery;
		var results = fgm._readFromCache(queryName, "data");
		var resultCount = results.features.length;
		for(var f=0; f<resultCount; f++) {
			if (OID === results.features[f].attributes[fgm.column_oid]) {
				var attributes = results.features[f].attributes; 
				$(results.fields).each(function(idx, field) {
					var attrValue = attributes[field.name]; 
					if ((/^http:\/\/.+$/i).test(attrValue) === true) {
						fgm._cxtMenuItems.push({
							text: field.alias, 
							cssClass: "fgm-cxtmenu-hyperlink",
							hyperlink: attrValue
						}); 
					}
				}); 
				break; 
			}
		}
		
		if (fgm._cxtMenuItems.length === 0) {
			fgm._cxtMenuItems.push({
				text: "no hyperlink",
				cssClass: "fgm-cxtmenu-nohyperlink"
			}); 
		}
		
		cxtMenuElement.kendoContextMenu({
			//showOn: "click",
			//orientation: "vertical",
			target: anchorElement,
			dataSource: fgm._cxtMenuItems,
			select: fgm.onHyperlinkCxtMenuSelect,
			close: fgm.onHyperlinkCxtMenuClose
		});
		
		if (!anchorPos) {
			// align contextMenu to anchor element
			anchorPos = $(anchorElement).offset();
			anchorPos.top += $(anchorElement).height(); 
		}
		// open the ContextMenu at the given anchor position
		cxtMenu = cxtMenuElement.data("kendoContextMenu");
		cxtMenu.open(anchorPos.left, anchorPos.top);
	};
	
	fgm._findFeatureByOID = function(OID, results) {
		if (!results) {
			var queryName = fgm._currentQuery;
			results = fgm._readFromCache(queryName, "data"); 
		}
		
		var resultCount = results.features.length;
		for(var f=0; f<resultCount; f++) {
			if (OID === results.features[f].attributes[fgm.column_oid]) {				
				// return back to any widget caller
				return results.features[f]; 
			}
		}
		return null; 
	}; 
	
	/* ------------------------------------ */
	/* Private TDB-Field Related Functions  */
	/* ------------------------------------ */
	
	fgm._hideTdbLink = function() {
		$(".fgm-layerTool-tdb").css('display', 'none');
	};
	
	fgm._showTdbLink = function() {
		$(".fgm-layerTool-tdb").css('display', 'inline-block');
	};
	
	fgm._checkTdbField = function(queryName, qry) {
		// to retrieve it from the copyright property of a layer description 
		// (such a weird place for such a config). 
		// - ex: Copyright Text:  tdb.field=WELL_NO 
		xhr(qry["serviceUrl"], {
			handleAs: "json",
			query: {"f":"json"}
		}).then(function(layerDef){
			// parse for a tdb field name 
			var tdbDef = layerDef["copyrightText"], tdbField = "none"; 
			if (tdbDef) {
				tdbDef = tdbDef.trim(); 
				if (tdbDef.indexOf("tdb.field=") === 0) {
					tdbField = tdbDef.replace("tdb.field=", ""); 
				}
			}
			// cache the tdb field
			console.log("tdb field for " + queryName + ": " + tdbField);
			fgm._writeIntoCache(queryName, tdbField, "tdbField"); 
			
			// show or hide the toast launch button
			if (tdbField === "none") {
				fgm._hideTdbLink();
			} else {
				fgm._showTdbLink();
			}
		}, function(err){
			console.log("Error in isToastAvailable: " + err.message);
		});
	};
	
	/* ----------------------------------- */
	/* Private external request Functions  */
	/* ----------------------------------- */
	
	// receive from the service the actual Excel binary data over network (better!)
	fgm._exportAsExcel = function() {
		var extReqUrls = fgm.options.extRequestUrls; 
		if (extReqUrls && extReqUrls["excel"]){
			var queryName = fgm._currentQuery; 
			if (!queryName) {
				console.log("no query is available"); 
				return; 
			}
			
			var qry = fgm._readFromCache(queryName, "query"); 
			var OIDArray = fgm._readFromCache(queryName, "OIDs"); 
			var results = fgm._readFromCache(queryName, "data"); 
			
			// parse for layerId
			var urlParts = qry["serviceUrl"].split("/"); 
			// pack field names
			var fieldNames = []; 
			$(results.fields).each(function(idx, field) {
				fieldNames.push(field.name); 
			}); 
			// construct request
			var extRequest = {
				LayerName: qry["name"], 
				LayerId: urlParts[urlParts.length-1],
				FeatureServiceUrl: qry["serviceUrl"],
				Fields: fieldNames,
				OidField: fgm.column_oid,
				OIDs: OIDArray
			}; 
			// send request
			xhr(extReqUrls["excel"], {
				method: "POST", 
				handleAs: "arraybuffer", // treat the response as binary
				headers: {'Content-Type': 'application/json'},
				data: JSON.stringify(extRequest)
			}).then(fgm._prepareExcelData, fgm._exportAsExcelFailed);
		}
	};
	
	fgm._prepareExcelData = function(data){
		var queryName = fgm._currentQuery; 
		var filename = queryName + ".xlsx"; 

		var blob = new Blob([data], {type: "application/vnd.ms-excel"});
	   // IE and Chrome have different ways to download file from Blob
	   // - prompt user to save or open the file
	   if (window.navigator.msSaveOrOpenBlob) {
		  // The IE way 
		  window.navigator.msSaveOrOpenBlob(blob, filename);
		} else {
		  // The HTML5 way
		  // - create a blob (referred by blob:http://host/guid)
		  var objectUrl = URL.createObjectURL(blob);
		  // - programmatically create a hyperlink tag
		  var a = document.createElement("a");
		  a.setAttribute("href", objectUrl);
		  a.setAttribute("download", filename);
		  // - call the click to start download
		  a.click(); 
		  // - remove the blob object
		  URL.revokeObjectURL(objectUrl); 
	   }
	}; 
	
	fgm._exportAsExcelFailed = function(err){
		console.log("Error in exportAsExcel: " + err.message);
	}; 
	
	// receive from the service the url to a dump file on server
	fgm._exportAsExcelByUrl = function() {
		var extReqUrls = fgm.options.extRequestUrls; 
		if (extReqUrls && extReqUrls["excel"]){
			var queryName = fgm._currentQuery; 
			if (!queryName) {
				console.log("no query is available"); 
				return; 
			}
			
			var qry = fgm._readFromCache(queryName, "query"); 
			var OIDArray = fgm._readFromCache(queryName, "OIDs"); 
			var results = fgm._readFromCache(queryName, "data"); 
			
			// parse for layerId
			var urlParts = qry["serviceUrl"].split("/"); 
			// pack field names
			var fieldNames = []; 
			$(results.fields).each(function(idx, field) {
				fieldNames.push(field.name); 
			}); 
			// construct request
			var extRequest = {
				LayerName: qry["name"], 
				LayerId: urlParts[urlParts.length-1],
				FeatureServiceUrl: qry["serviceUrl"],
				Fields: fieldNames,
				OidField: fgm.column_oid,
				OIDs: OIDArray
			}; 
			// send request
			xhr(extReqUrls["excel"], {
				method: "POST", 
				handleAs: "json",
				headers: {'Content-Type': 'application/json'},
				data: JSON.stringify(extRequest)
			}).then(function(data){
				window.open(data["Url"]); 
			}, function(err){
				console.log("Error in exportAsExcel: " + err.message);
			});
		}
	};
	
	fgm._launchToast = function() {
		var extReqUrls = fgm.options.extRequestUrls; 
		if (extReqUrls && extReqUrls["tdb"]){
			var queryName = fgm._currentQuery; 
			if (!queryName) {
				console.log("no query is available"); 
				return;
			}
			
			var tdbField = fgm._readFromCache(queryName, "tdbField"); 
			if (!tdbField || tdbField === "none") {
				console.log("no tdb field defined"); 
				return;
			}
			
			var qry = fgm._readFromCache(queryName, "query"); 
			var OIDArray = fgm._readFromCache(queryName, "OIDs"); 
			var results = fgm._readFromCache(queryName, "data"); 
			
			// parse for layerId
			var urlParts = qry["serviceUrl"].split("/"); 
			// pack field names
			var fieldNames = []; 
			$(results.fields).each(function(idx, field) {
				fieldNames.push(field.name); 
			}); 
			// construct request
			var extRequest = {
				LayerId: urlParts[urlParts.length-1],
				FeatureServiceUrl: qry["serviceUrl"],
				IdField: tdbField,
				OidField: fgm.column_oid,
				OIDs: OIDArray
			}; 
			// send request
			xhr(extReqUrls["tdb"], {
				method: "POST", 
				handleAs: "json",
				headers: {'Content-Type': 'application/json'},
				data: JSON.stringify(extRequest)
			}).then(fgm._openUrlInBrowser, fgm._launchToastFailed);
		}
	};
	
	fgm._openUrlInBrowser = function(data) {
		window.open(data["Url"]); 
	}; 
	
	fgm._launchToastFailed = function(err){
		console.log("Error in launchToast: " + err.message);
	}; 
	
	return fgm; 
}); 