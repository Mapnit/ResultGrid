define([
	"dojo/_base/declare", 
	"dojo/topic", 
	"dojo/promise/all", 
	
	"esri/tasks/QueryTask", 
	"esri/tasks/query", 
	"esri/tasks/StatisticDefinition",
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
	
	"jquery", "kendo" 
], function(
	declare, topic, all, 
	QueryTask, Query, StatisticDefinition, 
	Point, Polyline, Polygon, Extent, webMercatorUtils, GraphicsLayer, Graphic,
	SimpleMarkerSymbol, SimpleFillSymbol, SimpleLineSymbol
) {	
	var fgm = declare("FeatureGridManager", null, {}); 
	
	/* ------------------ */
	/* Private Variables  */
	/* ------------------ */

	fgm.gridOptions = {
		pageSize: 1000, 
		map: null, 		
		highlightSymbols: {
			"point": {
				"type": "esriSMS",
				"style": "esriSMSCircle",
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
				"width": 1
			},
			"polygon": {
				"type": "esriSFS",
				"style": "esriSFSSolid",
				"color": [0,0,0,75],
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
				"color": [255,255,0,255],
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
				"style": "esriSLSDash",
				"color": [255,255,0,255],
				"width": 2
			},
			"polygon": {
				"type": "esriSFS",
				"style": "esriSFSSolid",
				"color": [0,0,0,75],
				"outline": {
					"type": "esriSLS",
					"style": "esriSLS",
					"color": [255,255,0,255],
					"width": 2
				}
			}
		}
	}; 
	
	fgm.depthSeparator = "-"; 
	fgm.column_oid = "OBJECTID";
	fgm.searchParams = []; 
	fgm.resultCache = {}; 
	
	fgm._currentPage = -1; 
	fgm._currentQuery = null; 
	fgm.selectedPanel = null; 
	fgm.selectedRowOID = null;
	
	fgm._fgLayerId = "fgm_dataLayer";
    fgm._fgLayer = null; 
	
	fgm._fhlgLayerId = "fgm_highlightLayer";
    fgm._fhlgLayer = null; 
	
	fgm.actionColumn = {
		command: [{ 
			name: "Dismiss",
			text:"",
			class: "ob-icon-only",
			imageClass: "k-icon cmd-icon-dismiss ob-icon-only",
			click: function(evt) {
				var dataItem = this.dataItem($(evt.currentTarget).closest("tr"));
				console.log("delete this row: " + dataItem[fgm.column_oid]);
				fgm._removeFeature(dataItem[fgm.column_oid]); 
			}
		}, { 
			name: "ZoomIn",
			text:"",
			class: "ob-icon-only",
			imageClass: "k-icon cmd-icon-zoomIn ob-icon-only",
			click: function(evt) {
				var dataItem = this.dataItem($(evt.currentTarget).closest("tr"));
				console.log("zoom to this row: " + dataItem[fgm.column_oid]);
				fgm._zoomToFeature(dataItem[fgm.column_oid]); 
			}
		}, { 
			name: "Hyperlink",
			text:"",
			class: "ob-icon-only",
			imageClass: "k-icon cmd-icon-hyperlink ob-icon-only",
			click: function(evt) {
				var dataItem = this.dataItem($(evt.currentTarget).closest("tr"));
				console.log("pop up hyperlinks: " + dataItem[fgm.column_oid]);
				fgm._popupMenuForFeature(dataItem[fgm.column_oid]); 
			}
		}],
		width: 155
	}; 
	
	/* --------------------- */
	/* Private UI Functions  */
	/* --------------------- */

	fgm.buildFeatureGrid = function(searchParams, gridOptions) {
		fgm.searchParams = searchParams; 
		fgm._mixInOptions(gridOptions);
		
		// remove it if any
		fgm._removeFeatureGrid(); 

		// prepare the graphic layers
		if (!fgm._fgLayer) {
			fgm._fgLayer = new GraphicsLayer({id: fgm._fgLayerId}); 
		}
		if (fgm.gridOptions.map.getLayer(fgm._fgLayerId)) {
			fgm._fgLayer.clear(); 
		} else {
			fgm.gridOptions.map.addLayer(fgm._fgLayer);
		}
		
		if (!fgm._fhlgLayer) {
			fgm._fhlgLayer = new GraphicsLayer({id: fgm._fhlgLayerId}); 
		}		
		if (fgm.gridOptions.map.getLayer(fgm._fhlgLayerId)) {
			fgm._fhlgLayer.clear(); 
		} else {
			fgm.gridOptions.map.addLayer(fgm._fhlgLayer);
		}
		
		// add the html skeleton
		var splitterDiv = $('<div id="fgm-resultSplitter" style="height:98%">'); 
		splitterDiv.append('<div id="fgm-layerPanelbar"></div>');
		splitterDiv.append('<div id="fgm-datagrid"></div>');
		
		var winDiv = $('<div id="fgm-resultWindow"></div>'); 
		winDiv.append(splitterDiv);
		$("body").append(winDiv); 

		var dockerDiv = $('<span id="fgm-panelDock">Show Results</span>'); 
		dockerDiv.addClass("k-button"); 
		dockerDiv.hide(); 
		$("body").append(dockerDiv);
		
		// build UI widgets
		fgm._buildResultWindow(); 
		fgm._buildResultPanels();
		
		topic.publish("featureGrid/ready", "fgm ready"); 
	}
	
	fgm._buildResultWindow = function() {
		// datagrid window
		var resultWin = $("#fgm-resultWindow"),
			resultSplitter = $('#fgm-resultSplitter'),
			panelDock = $("#fgm-panelDock")
					.bind("click", function() {
						resultWin.data("kendoWindow").open();
						panelDock.hide();
					});

		var onClose = function(evt) {
			panelDock.show();
		}

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
			
			var resultWinKendo = $("#fgm-resultWindow").data("kendoWindow");
			resultWinKendo.center().open(); 
		}
		
		resultSplitter.kendoSplitter({
			orientation: 'horizontal',
			panes: [
				{ collapsible: false, resizable: true, size: "200px"},
				{ collapsible: false, resizable: true }
			]
		});	
		
	}
	
	fgm._removeFeatureGrid = function() {
		
		// remove the graphic layer from map 
		$([fgm._fgLayer, fgm._fhlgLayer]).each(function(idx, gLayer) {
			if (gLayer) {
				fgm.gridOptions.map.removeLayer(gLayer);
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
	}
	
	fgm._buildResultPanels = function() {
		// initiate the async query
		//fgm._executeQueryForStats(); 
		fgm._executeQueryForOID(); 
		
		// build the panelbar UI
		var layerPane = $("#fgm-layerPanelbar");
		var prevGrpName; 
		var grpElement, listElement; 
		$(fgm.searchParams).each(function(idx, item) {
			if (prevGrpName !== item["name"]) {
				prevGrpName = item["name"]; 
				grpElement = $("<li>" + item["name"] + "</li>");
				listElement = $("<ul></ul>"); 
				layerPane.append(grpElement.append(listElement));
			}
			if (listElement) {
				$(item["queries"]).each(function(idx, qry) {
					var normalizedQueryName = fgm._normalize(qry["name"]); 
					listElement.append(
						$("<li></li>").attr("id", fgm._normalize(item["name"]) + fgm.depthSeparator + fgm._normalize(qry["name"]))
									  .attr("udata-name", item["name"]+fgm.depthSeparator+qry["name"])
									  .html(qry["name"])
					);
				}); 
			}
		}); 

		$("#fgm-layerPanelbar").kendoPanelBar({
			expandMode: "multiple",
			select: fgm.onSelectResultPanel
		});
	}
	
	fgm._buildResultGrid = function(resultData, resultColumns) {
		var dg = $("#fgm-datagrid").kendoGrid({
			height: 450,
			dataSource: resultData,
			columns: resultColumns, 
			groupable: true,
			filterable: true,
			resizable: true, 
			selectable: "row", 
			sortable: true,
			pageable: {
				//refresh: true,
				//pageSizes: true,
				pageSize: fgm.gridOptions["pageSize"], 
				buttonCount: 5
			},
			change: fgm.onRowSelect
		});	

		return dg; 
	}
	
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
	}
	
	/* ----------------------- */
	/* Private Event Handlers  */
	/* ----------------------- */	

	fgm.resizePanes = function (evt) {
		$('#fgm-resultSplitter').trigger("resize");

		var newGridHeight = evt.height - 55;
		//console.log("resize datagrid height = " + newGridHeight);
		var gridElement = $("#fgm-datagrid");
		gridElement.height(newGridHeight);
		if (gridElement.data("kendoGrid")) {
			gridElement.data("kendoGrid").resize();
		}	
	}
	
	fgm.onSelectResultPanel = function(evt) {
		// remove the current datagrid
		fgm._removeResultGrid(); 

		var queryName = $(evt.item).attr("udata-name"); 
		if (queryName && (queryName.length > 0)) {
			if (fgm.selectedPanel !== queryName) {
				console.log("Panel Selection Changed: " + queryName);
				fgm.selectedPanel = queryName;
				
				var qry = fgm._readFromCache(queryName, "query"); 
				if(qry) {
					// keep track of currentQuery
					fgm._currentQuery = queryName; 
					fgm._currentPage = 0; 
					// clear the cache for any result of currentQuery
					fgm._writeIntoCache(queryName, null); 
					// reset the cache for query of currentQuery
					fgm._writeIntoCache(queryName, qry, "query"); 
					// execute the query for data
					fgm._executeQueryForData(qry); 
				} else {
					console.log("error: no query for " + queryName); 
				}
				/*
				var selectedPos = queryName.split(fgm.depthSeparator); 
				for(var i=0,l=fgm.searchParams.length; i<l; i++) {
					var item = fgm.searchParams[i]; 
					if (item["name"] === selectedPos[0]) {
						for(var q=0,ql=item["queries"].length; q<ql; q++) {
							var qry = item["queries"][q]; 
							if (qry["name"] === selectedPos[1]) {
								fgm._executeQueryForData(qry);
								break; 
							}
						}
						break; 
					}
				}
				 */
			}
		}
	}
	
	fgm.onRowSelect = function(evt) {
		var dg = this; 
		var rowData = dg.dataItem(dg.select()); 
		var rowOID = rowData[fgm.column_oid]; 
		
		if (fgm.selectedRowOID !== rowOID) {
			console.log("onRowSelect: " + rowOID); 
			
			fgm._highlightFeature(rowOID, true); 
		}
	}
	
	fgm.prevPage = function() {
		if (fgm._currentPage - 1 >= 0) {
			fgm.gotoPage(--fgm._currentPage); 
			return true; 
		}
		return false; 
	}
	
	fgm.nextPage = function() {
		var queryName = fgm._currentQuery;
		if (queryName) {
			var rowCount = fgm._readFromCache(queryName, "rowCount")
			var maxRowIndex = fgm._currentPage * fgm.gridOptions["pageSize"]; 
			if  (rowCount > maxRowIndex) {
				fgm.gotoPage(++fgm._currentPage); 
				return true; 
			} 
		}
		return false; 
	}
	
	fgm.gotoPage = function(pageIdx) {
		
		var queryName = fgm._currentQuery;
		if (queryName) {
			var OIDStartIdx = pageIdx * fgm.gridOptions["pageSize"]; 
			var qry = fgm._readFromCache(queryName, "query");
			var OIDArray = fgm._readFromCache(queryName, "OIDs");
			if (qry && OIDArray) {
				var OIDEndIdx = OIDStartIdx + fgm.gridOptions["pageSize"]; 
				var OIDsForPage = OIDArray.slice(OIDStartIdx, OIDEndIdx); 
				fgm._executeQueryForData(qry, OIDArray); 
				return true; 
			}
		}
		return false; 
	}
	
	/* -------------------------- */
	/* Private Utility Functions  */
	/* -------------------------- */
	
	fgm._mixInOptions = function(usrOptions) {
		if (usrOptions) {
			for(var k in usrOptions) {
				fgm.gridOptions[k] = usrOptions[k]; 
			}
		}
	}
	
    fgm._normalize = function(name) {
		if (name) {
			return name.replace(/\W/g, "_"); 
		} else {
			return name; 
		}
	}
	
	fgm._writeIntoCache = function(queryName, value, key) {
		if (key) {
			if (!fgm.resultCache[queryName]) {
				fgm.resultCache[queryName] = {}; 
			}
			fgm.resultCache[queryName][key] = value;
		} else {
			fgm.resultCache[queryName] = value;
		}
	}
	
	fgm._readFromCache = function(queryName, key) {
		if (fgm.resultCache[queryName]) {
			if (key) {
				return fgm.resultCache[queryName][key];
			} else {
				return fgm.resultCache[queryName]; 
			}			
		}
		return null; 
	}	
	
	/* ------------------------ */
	/* Private Query Functions  */
	/* ------------------------ */

	fgm._executeQueryForOID = function() {
		
		var promiseDict = {}; 
		$(fgm.searchParams).each(function(idx, item) {
			$(item["queries"]).each(function(idx, qry) {
				console.log("query [" + qry["where"] + "] on " + qry["serviceUrl"]); 
				var queryName = item["name"]+fgm.depthSeparator+qry["name"]; 
				
				// cache the query results
				fgm._writeIntoCache(queryName, qry, "query");
				
				var query = new Query();
				query.where = qry["where"];
				query.geometry = qry["geometry"]; 
		
				var queryTask = new QueryTask(qry["serviceUrl"]); 
				 
				promiseDict[queryName] = queryTask.executeForIds(query); 
			});
		}); 
		
		all(promiseDict).then(fgm._prepareOIDResults);
	}
	
	fgm._prepareOIDResults = function(OIDResults) {
		for(var queryName in OIDResults) {
			console.log("statistics for " + queryName); 
			var panelId = queryName.split(fgm.depthSeparator); 
			var elementId = fgm._normalize(panelId[0]) + fgm.depthSeparator + fgm._normalize(panelId[1]); 
			var queryPanelElement = $("#"+elementId); 

			if (OIDResults[queryName].length === 0) {
				if (queryPanelElement.data("kendoGrid")) {
					queryPanelElement.data("kendoGrid").destroy();
				}
				queryPanelElement.empty(); 
				queryPanelElement.remove();
				
			} else {
				
				var itemElement = queryPanelElement.children("span"); 
				itemElement.html(itemElement.html() + " (" + OIDResults[queryName].length + ")");
			}
			
			// cache the query results
			fgm._writeIntoCache(queryName, OIDResults[queryName], "OIDs"); 
			fgm._writeIntoCache(queryName, OIDResults[queryName].length, "rowCount"); 
		}
	}
	
	fgm._executeQueryForStats = function() {

		var statsMaxDef = new StatisticDefinition(); 
		statsMaxDef.statisticType = "max";
		statsMaxDef.onStatisticField = fgm.column_oid;
		statsMaxDef.outStatisticFieldName = "maxOID";

		var statsMinDef = new StatisticDefinition(); 
		statsMinDef.statisticType = "min";
		statsMinDef.onStatisticField = fgm.column_oid;
		statsMinDef.outStatisticFieldName = "minOID";

		var statsCntDef = new StatisticDefinition(); 
		statsCntDef.statisticType = "count";
		statsCntDef.onStatisticField = fgm.column_oid;
		statsCntDef.outStatisticFieldName = "cntOID";
		
		var promiseDict = {}; 
		$(fgm.searchParams).each(function(idx, item) {
			$(item["queries"]).each(function(idx, qry) {
				console.log("query [" + qry["where"] + "] on " + qry["serviceUrl"]); 
				var queryName = item["name"]+fgm.depthSeparator+qry["name"]; 
				
				var query = new Query();
				query.where = qry["where"];
				query.geometry = qry["geometry"]; 
				query.returnGeometry = false;
				query.outStatistics = [statsMaxDef, statsMinDef, statsCntDef];
		
				var queryTask = new QueryTask(qry["serviceUrl"]); 
				/*
				queryTask.execute(query, fgm._prepareStatsResults);
				 */
				 
				promiseDict[queryName] = queryTask.execute(query); 
			});
		}); 
		
		all(promiseDict).then(fgm._prepareStatsResults);
	}
	
	fgm._prepareStatsResults = function(statsResults) {
		for(var queryName in statsResults) {
			console.log("statistics for " + queryName); 
			var panelId = queryName.split(fgm.depthSeparator); 
			var elementId = fgm._normalize(panelId[0]) + fgm.depthSeparator + fgm._normalize(panelId[1]); 
			var queryPanelElement = $("#"+elementId); 

			if (statsResults[queryName].features.length === 0) {
				if (queryPanelElement.data("kendoGrid")) {
					queryPanelElement.data("kendoGrid").destroy();
				}
				queryPanelElement.empty(); 
				queryPanelElement.remove();
				
			} else {
				var statsResult = statsResults[queryName].features[0].attributes;
				
				queryPanelElement.attr("udata-min", statsResult.minOID)
								 .attr("udata-max", statsResult.maxOID)
								 .attr("udata-cnt", statsResult.cntOID); 
				
				var itemElement = queryPanelElement.children("span"); 
				itemElement.html(itemElement.html() + " (" + statsResult.cntOID + ")");
			}
			
			// cache the query results
			fgm._writeIntoCache(queryName, OIDResults[queryName], "stats");
		}
	}
	
	fgm._executeQueryForData = function(qry, OIDs) {

		var query = new Query();
		if (OIDs && OIDs.length > 0) {
			console.log("query by OIDs on " + qry["serviceUrl"]); 
			query.objectIds = OIDs; 
		} else {
			console.log("query [" + qry["where"] + "] on " + qry["serviceUrl"]); 
			query.where = qry["where"];
			query.geometry = qry["geometry"]; 
		}
		query.returnGeometry = true;
		
		if (fgm.gridOptions.map) {
			query.outSpatialReference = fgm.gridOptions.map.spatialReference; 
		}
		query.outFields = ["*"];
		
		var queryTask = new QueryTask(qry["serviceUrl"]); 
		queryTask.execute(query, fgm._prepareDataResults);
	}
	
	fgm._prepareDataResults = function(results) {		
		
		// cache the query results
		var queryName = fgm._currentQuery; 
		fgm._writeIntoCache(queryName, results, "data");
		
		// prepare results
		var resultFields = []; 
		var fieldCount = Math.min(results.fields.length, 10); 
		for(var i=0; i<fieldCount; i++) {
			var resultField = results.fields[i]; 
			var isIDColumn = (resultField["type"] === "esriFieldTypeOID");
			if (isIDColumn === true) {
				fgm.column_oid = resultField["name"]; 
			}
			resultFields.push({
				"field": resultField["name"],
				"alias": resultField["title"], 
				"hidden": isIDColumn
			});
		}
		var dgColumns = $.merge([fgm.actionColumn], resultFields);
		
		var resultItems = [];
		var resultCount = results.features.length;
		for (var i = 0; i < resultCount; i++) {
			resultItems.push(results.features[i].attributes);
		}
		
		fgm._buildResultGrid(resultItems, dgColumns); 
		
		fgm._displayDataOnMap(results); 
	}
	
	/* ---------------------------------- */
	/* Private Map-Interaction Functions  */
	/* ---------------------------------- */
	
	fgm._displayDataOnMap = function(results) {
		console.log("_displayDataOnMap: ");
		
		if (!fgm.gridOptions.map) {
			console.log("no map available"); 
			return; 
		} 
		
		fgm._fgLayer.clear(); 
		
		if (! results) {
			console.log("empty results"); 
			return; 
		}
		
		var symbol; 
		switch(results.geometryType) {
			case "esriGeometryPoint":
				symbol = new SimpleMarkerSymbol(fgm.gridOptions.symbols["point"]);
				break; 
			case "esriGeometryPolyline":
				symbol = new SimpleLineSymbol(fgm.gridOptions.symbols["line"]); 
				break; 
			case "esriGeometryPolygon":
				symbol = new SimpleFillSymbol(fgm.gridOptions.symbols["polygon"]); 
				break; 
		}

		// limit the number of features to the page size
		var startIndex = fgm._currentPage * fgm.gridOptions["pageSize"]; 
		var endIndex = Math.min(fgm.gridOptions["pageSize"], results.features.length - startIndex); 
		
		var layerExtent = null; 
		for(var f=startIndex; f<endIndex; f++) {
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
			
		}; 
		
		fgm.gridOptions.map.setExtent(layerExtent, true);
		
	}

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
						symbol = new SimpleMarkerSymbol(fgm.gridOptions.highlightSymbols["point"]);
						break; 
					case "esriGeometryPolyline":
						symbol = new SimpleLineSymbol(fgm.gridOptions.highlightSymbols["line"]); 
						break; 
					case "esriGeometryPolygon":
						symbol = new SimpleFillSymbol(fgm.gridOptions.highlightSymbols["polygon"]); 
						break; 
				}
				
				fgm._fhlgLayer.add(new Graphic(geometry, symbol, attributes)); 
				
				break; 
			}
		}
		
	}
	
	fgm._removeFeature = function(OID) {
		
		var dg = $("#fgm-datagrid").data("kendoGrid"); 
		var rawData = dg.dataSource.data();
		var length = rawData.length;

		// iterate and remove the item
		var item;
		for(var f=0; f<length; f++){
			item = rawData[f];
			if (OID === item[fgm.column_oid]){
				dg.dataSource.remove(item);
				break; 
			}
		}
		//dg.dataSource.read(); 
		//dg.refresh(); 
		
		// remove from the highlight graphic layer
		var graphicCount = fgm._fhlgLayer.graphics.length; 
		for(var f=0; f<graphicCount; f++) {
			if (OID === fgm._fhlgLayer.graphics[f].attributes[fgm.column_oid]) {
				// remove from the graphic layer 
				var graphic = fgm._fhlgLayer.graphics[f]; 
				fgm._fhlgLayer.remove(graphic); 
				break;
			}
		}

		// remove from the graphic layer
		graphicCount = fgm._fgLayer.graphics.length; 
		for(var f=0; f<graphicCount; f++) {
			if (OID === fgm._fgLayer.graphics[f].attributes[fgm.column_oid]) {
				// remove from the graphic layer 
				var graphic = fgm._fgLayer.graphics[f]; 
				fgm._fgLayer.remove(graphic); 
				break;
			}
		}
		
		// remove from the cached results
		var queryName = fgm._currentQuery;
		var results = fgm._readFromCache(queryName, "data");
		var resultCount = results.features.length;		
		for(var f=0; f<resultCount; f++) {
			if (OID === results.features[f].attributes[fgm.column_oid]) {
				results.features.splice(f, 1);
				break;
			}
		}
		
	}
	
	fgm._zoomToFeature = function(OID, highlighted) {
		var queryName = fgm._currentQuery;
		var results = fgm._readFromCache(queryName, "data"); 
		
		var resultCount = results.features.length;
		for(var f=0; f<resultCount; f++) {
			if (OID === results.features[f].attributes[fgm.column_oid]) {
				var attributes = results.features[f].attributes, 
					geometry = results.features[f].geometry,
					geometryExtent = results.features[f].geometry.getExtent(); 

				if (highlighted === true) {
					var symbol; 
					switch(results.geometryType) {
						case "esriGeometryPoint":
							symbol = new SimpleMarkerSymbol(fgm.gridOptions.highlightSymbols["point"]);
							break; 
						case "esriGeometryPolyline":
							symbol = new SimpleLineSymbol(fgm.gridOptions.highlightSymbols["line"]); 
							break; 
						case "esriGeometryPolygon":
							symbol = new SimpleFillSymbol(fgm.gridOptions.highlightSymbols["polygon"]); 
							break; 
					}
					
					fgm._fhlgLayer.add(new Graphic(geometry, symbol, attributes)); 					
				}
				
				if (!geometryExtent) { 
					geometryExtent = new Extent(geometry.x, geometry.y, geometry.x, geometry.y, geometry.spatialReference);
				}
				
				fgm.gridOptions.map.setExtent(geometryExtent, true);
				
				break; 
			}
		}
	}
	
	fgm._popupMenuForFeature = function(OID) {

	}
	
	return fgm; 
}); 