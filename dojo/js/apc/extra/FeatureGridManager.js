define([
	"dojo/_base/declare", 
	"dojo/topic", 
	"dojo/promise/all", 
	"dojo/request/xhr",
	
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
	declare, topic, all, xhr, 
	QueryTask, Query, StatisticDefinition, 
	Point, Polyline, Polygon, Extent, webMercatorUtils, GraphicsLayer, Graphic,
	SimpleMarkerSymbol, SimpleFillSymbol, SimpleLineSymbol
) {	
	var fgm = declare("FeatureGridManager", null, {}); 
	
	/* ------------------ */
	/* Private Variables  */
	/* ------------------ */

	fgm.gridOptions = {
		pageSize: 100, //1000, 
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
	
	fgm._resultWindow = null;
	fgm._datagrid = null; 
	fgm._dataPager = null;

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
				fgm._popupMenuForFeature(dataItem[fgm.column_oid], 
					evt.currentTarget, {left:evt.clientX, top:evt.clientY}); 
			}
		}],
		width: 135
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
		var splitterDiv = $('<div id="fgm-resultSplitter" style="height:98%"></div>'); 
		splitterDiv.append('<div id="fgm-layerPanelbar"></div>');
		var gridContainerDiv = $('<div id="fgm-gridContainer"></div>')
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
			//When closing, remove the FeatureGrid completely rather than dock it. 
			//panelDock.show();
			fgm._removeFeatureGrid();
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
		fgm._removeResultPager(); 
		
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
	}
	
	fgm._buildResultPanels = function() {
		// initiate the async query
		//fgm._queryForStats(); 
		fgm._queryForOID(); 
		
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
		var gridContainerDiv = $("#fgm-gridContainer"); 
		
		var dg = $("#fgm-datagrid").kendoGrid({
			//width: gridContainerDiv.width() - 30, 
			height: gridContainerDiv.height() - 50, 
			//width: 818,
			//height: 470,	height: 405, 
			dataSource: resultData,
			columns: resultColumns, 
			groupable: true,
			filterable: true,
			resizable: true, 
			selectable: "row", 
			sortable: true,
			pageable: false,
			change: fgm.onRowSelect
		});	

		fgm._datagrid = $("#fgm-datagrid").data("kendoGrid"); 
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
		
		fgm._datagrid = null; 
	}
	
	fgm._buildResultPager = function(OIDArray) {		
		var gridContainerDiv = $("#fgm-gridContainer"); 
		
		var dataSource = new kendo.data.DataSource({
			data: OIDArray, 
			pageSize: fgm.gridOptions.pageSize
		});
		dataSource.read();
		
		var pg = $("#fgm-datapager").kendoPager({
			//width: 818,
			//width: gridContainerDiv.width() - 30, 
			height: 65,
			dataSource: dataSource, 
			//refresh: true,
			//pageSizes: true,
			buttonCount: 3, 
			input: true, 
			//info: false,
			change: fgm.onPageChanged
		}); 
				
		fgm._dataPager = $("#fgm-datapager").data("kendoPager"); 
	}
	
	fgm._removeResultPager = function() {
		var pgElement = $("#fgm-datapager"); 
		if (pgElement) {
			if ( pgElement.data("kendoPager")) {
				pgElement.data("kendoPager").destroy();
			}
			pgElement.empty(); 
			//pgElement.remove();
		}
	}
	
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
	}
	
	fgm.onSelectResultPanel = function(evt) {
		// remove the current datagrid
		fgm._removeResultGrid(); 
		fgm._removeResultPager(); 

		var queryName = $(evt.item).attr("udata-name"); 
		if (queryName && (queryName.length > 0)) {
			if (fgm._currentQuery !== queryName) {
				console.log("Panel Selection Changed: " + queryName);
				fgm.selectedPanel = $(evt.item); 
				
				var qry = fgm._readFromCache(queryName, "query"); 
				if(qry) {
					// keep track of currentQuery
					fgm._currentQuery = queryName; 
					fgm._currentPage = 0; 
					// execute the query for data
					fgm._queryForData(qry); 
					// build the pager 
					var OIDArray = fgm._readFromCache(queryName, "OIDs"); 
					fgm._buildResultPager(OIDArray); 
				} else {
					console.log("error: no query for " + queryName); 
				}
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
	
	fgm.onPageChanged = function(evt) {
		console.log("onPageChanged: " + evt); 
		fgm._queryForDataByPage(evt.index - 1); 
	}
	
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
	}
	
	fgm.onHyperlinkCxtMenuClose = function(evt) {
		console.log("Hyperlink CxtMenu Closed");
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
		
		all(promiseDict).then(fgm._prepareOIDResults);
	}
	
	fgm._prepareOIDResults = function(OIDResults) {
		for(var queryName in OIDResults) {
			console.log("OIDs for " + queryName); 
			var panelId = queryName.split(fgm.depthSeparator); 
			var elementId = fgm._normalize(panelId[0]) + fgm.depthSeparator + fgm._normalize(panelId[1]); 
			var queryPanelElement = $("#"+elementId); 

			if (! OIDResults[queryName] || OIDResults[queryName].length === 0) {
				if (queryPanelElement.data("kendoGrid")) {
					queryPanelElement.data("kendoGrid").destroy();
				}
				queryPanelElement.empty(); 
				queryPanelElement.remove();
				
				OIDResults[queryName]= []; 
				
			} else {				
				var itemElement = queryPanelElement.children("span"); 
				itemElement.html(itemElement.html() + " (" + OIDResults[queryName].length + ")");
			}
			
			// cache the query results
			fgm._writeIntoCache(queryName, OIDResults[queryName], "OIDs"); 
			fgm._writeIntoCache(queryName, OIDResults[queryName].length, "rowCount"); 
		}
	}
	
	fgm._queryForStats = function() {

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
	
	fgm._queryForData = function(qry, OIDs) {

		var byOID = (OIDs && OIDs.length > 0); 

		var query = new Query();
		query.returnGeometry = true;
		query.outFields = ["*"];

		if (byOID === true) {
			console.log("query by OIDs on " + qry["serviceUrl"]); 
			query.objectIds = OIDs; 
		} else {
			console.log("query [" + qry["where"] + "] on " + qry["serviceUrl"]); 
			query.where = qry["where"];
			query.geometry = qry["geometry"]; 
		}
		
		if (fgm.gridOptions.map) {
			query.outSpatialReference = fgm.gridOptions.map.spatialReference; 
		}
		
		var queryTask = new QueryTask(qry["serviceUrl"]); 
		if (byOID === true) {
			queryTask.execute(query, fgm._replaceDataInResultGrid);
		} else {
			queryTask.execute(query, fgm._prepareDataResults);
		}		
	}
	
	fgm._prepareDataResults = function(results) {		
		
		// cache the query results (limited by fgm.gridOptions.pageSize)
		var queryName = fgm._currentQuery; 
		results.features = results.features.slice(0, fgm.gridOptions.pageSize); 
		fgm._writeIntoCache(queryName, results, "data");
		
		// prepare results
		var resultFields = []; 
		//DEV: dev only 
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
	
	fgm._replaceDataInResultGrid = function(results) {
		
		// cache the query results (limited by fgm.gridOptions.pageSize)
		var queryName = fgm._currentQuery; 
		results.features = results.features.slice(0, fgm.gridOptions.pageSize); 
		fgm._writeIntoCache(queryName, results, "data");

		var resultCount = results.features.length;
		fgm._writeIntoCache(queryName, results.features.length, "rowCount");

		// load data into grid
		var resultItems = [];
		for (var i = 0; i < resultCount; i++) {
			resultItems.push(results.features[i].attributes);
		}
		
		var dataSource = new kendo.data.DataSource({
			data: resultItems, 
			pageSize: fgm.gridOptions.pageSize
		});
		dataSource.read(); 
		
		fgm._datagrid.dataSource = dataSource; 		
		fgm._datagrid.refresh();
		
		fgm._displayDataOnMap(results);
	}
	
	fgm._queryForDataByPage = function(pageIdx /*zero-based*/) {		
		var queryName = fgm._currentQuery;		
		var rowCount = fgm._readFromCache(queryName, "rowCount");
		if (rowCount === 0) {
			//TODO: no more data 
			var results = fgm._readFromCache(queryName, "data");
			results.features = []; 
			fgm._replaceDataInResultGrid(results); 
		} else {
			var OIDStartIdx = pageIdx * fgm.gridOptions.pageSize; 
			if (OIDStartIdx < rowCount-1) {
				var qry = fgm._readFromCache(queryName, "query");
				var OIDArray = fgm._readFromCache(queryName, "OIDs");
				if (qry && OIDArray) {
					var OIDEndIdx = Math.min(OIDStartIdx + fgm.gridOptions.pageSize, rowCount); 
					var OIDsForPage = OIDArray.slice(OIDStartIdx, OIDEndIdx); 
					fgm._queryForData(qry, OIDsForPage); 

					fgm._currentPage = pageIdx; 					
				}
			} else {
				//TODO: go to the last page instead
				var lastPageIdx = fgm._dataPager.totalPages - 1; 
				fgm._queryForDataByPage(lastPageIdx); 
			}
		}
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
		
		fgm._fhlgLayer.clear(); 
		fgm._fgLayer.clear(); 
		
		if (! results || results.features.length === 0) {
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
			
		}; 
		
		fgm.gridOptions.map.setExtent(layerExtent, true);
		
		// cache the extent of features on the current page
		fgm._writeIntoCache(fgm._currentQuery, layerExtent, "extent"); 
		
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
	
	/*
	 * to remove one triggers data reloading
	 */
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

		// remove the item from data pager 
		/*
		var dataSource = new kendo.data.DataSource({
			data: OIDArray, 
			pageSize: fgm.gridOptions.pageSize
		});
		dataSource.read();
		
		fgm._dataPager.dataSource = dataSource; 
		fgm._dataPager.refresh(); 
		 */
		
		//TODO: (why does it remove two???)
		var dataSource = fgm._dataPager.dataSource;
		var dataItem = dataSource.at(f); 
		dataSource.remove(dataItem); 
		dataSource.sync(); 
		
		// reload the features for the current page 
		fgm._queryForDataByPage(fgm._currentPage); 
	}
	
	
	fgm._removeFeature2 = function(OID) {
		
		// remove the item from data grid
		var ds = fgm._datagrid.dataSource;
		var rawData = ds.data();
		var item, length = rawData.length;
		for(var f=0; f<length; f++){
			item = rawData[f];
			if (OID === item[fgm.column_oid]){
				ds.remove(item);
				break; 
			}
		}
		//fgm._datagrid.dataSource.read(); 
		//fgm._datagrid.refresh(); 
		
		// remove the item from data pager
		ds = fgm._dataPager.dataSource;
		rawData = ds.data();
		length = rawData.length;
		for(var f=0; f<length; f++){
			if (OID === rawData[f]){
				ds.remove(item);
				break; 
			}
		}		
		
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
		
		// remove from the cached data result
		var queryName = fgm._currentQuery;
		var results = fgm._readFromCache(queryName, "data");
		var resultCount = results.features.length;		
		for(var f=0; f<resultCount; f++) {
			if (OID === results.features[f].attributes[fgm.column_oid]) {
				results.features.splice(f, 1);
				break;
			}
		}
		
		// remove from the cached OID result
		var OIDArray = fgm._readFromCache(queryName, "OIDs");
		for(var f=0; f<OIDArray.length; f++) {
			if (OID === OIDArray[f]) {
				OIDArray.splice(f, 1);
				break;
			}
		}
		
		// change the row count
		fgm._writeIntoCache(queryName, OIDArray.length, "rowCount"); 
		
		// reduce the count in the panel title
		var qry = fgm._readFromCache(queryName, "query");
		fgm.selectedPanel.children().text(qry["name"] + " (" + OIDArray.length + ")");
		
	}
	
	fgm._zoomToFeature = function(OID, highlighted) {
		var queryName = fgm._currentQuery;
		var results = fgm._readFromCache(queryName, "data"); 
		
		var resultCount = results.features.length;
		for(var f=0; f<resultCount; f++) {
			if (OID === results.features[f].attributes[fgm.column_oid]) {
				var attributes = results.features[f].attributes, 
					geometry = results.features[f].geometry;
				var geometryExtent = geometry.getExtent(); 

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
	
	fgm._popupMenuForFeature = function(OID, anchorElement, anchorPos) {
		
		// remove the eixsting  context menu
		var cxtMenuElement = $("#fgm-hyperlinkMenu"); 
		var cxtMenu;
		if (cxtMenuElement.length === 0) {
			// add a new element
			$("body").append('<div id="fgm-hyperlinkMenu"></div>');
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
					if ((/^http\:\/\/.+$/i).test(attrValue) === true) {
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
	}
		
	
	return fgm; 
}); 