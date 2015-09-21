define([
	"dojo/_base/declare",
	"dojo/promise/all", 
	"esri/tasks/QueryTask", "esri/tasks/query", "esri/tasks/StatisticDefinition",
	"jquery", "kendo" 
], function(
	declare, all, 
	QueryTask, Query, StatisticDefinition
) {	
	var fgm = declare("FeatureGridManager", null, {}); 
	
	/* ------------------ */
	/* Private Variables  */
	/* ------------------ */
	
	fgm.depthSeparator = "-"; 
	fgm.column_oid = "OBJECTID";
	fgm.searchParams = []; 
	fgm.resultCache = {}; 
	fgm.selectedPanel = null; 
	
	fgm.actionColumn = {
		command: [{ 
			name: "Dismiss",
			text:"",
			class: "ob-icon-only",
			imageClass: "k-icon cmd-icon-dismiss ob-icon-only",
			click: function(e) {
				var dataItem = this.dataItem($(e.currentTarget).closest("tr"));
				console.log("delete this row: " + dataItem[fgm.column_oid]);
			}
		}, { 
			name: "ZoomIn",
			text:"",
			class: "ob-icon-only",
			imageClass: "k-icon cmd-icon-zoomIn ob-icon-only",
			click: function(e) {
				var dataItem = this.dataItem($(e.currentTarget).closest("tr"));
				console.log("zoom to this row: " + dataItem[fgm.column_oid]);
			}
		}, { 
			name: "Hyperlink",
			text:"",
			class: "ob-icon-only",
			imageClass: "k-icon cmd-icon-hyperlink ob-icon-only",
			click: function(e) {
				var dataItem = this.dataItem($(e.currentTarget).closest("tr"));
				console.log("pop up hyperlinks: " + dataItem[fgm.column_oid]);
			}
		}],
		width: 155
	}; 
	
	/* --------------------- */
	/* Private UI Functions  */
	/* --------------------- */
			
	fgm.buildFeatureGrid = function(searchParams) {
		fgm.searchParams = searchParams; 
		
		// remove it if any
		fgm._removeFeatureGrid(); 

		// add the basic html elements
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
					//"Minimize",
					//"Maximize",
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
		$(fgm.searchParams).each(function(idx) {
			var item = this; 
			if (prevGrpName !== item["name"]) {
				prevGrpName = item["name"]; 
				grpElement = $("<li>" + item["name"] + "</li>");
				listElement = $("<ul></ul>"); 
				layerPane.append(grpElement.append(listElement));
			}
			if (listElement) {
				$(item["queries"]).each(function(idx) {
					var qry = this; 
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
			dataSource: resultData,
			height: 450,
			groupable: true,
			resizable: true, 
			sortable: true,
			pageable: {
				//refresh: true,
				//pageSizes: true,
				pageSize: 20, 
				buttonCount: 5
			},
			columns: resultColumns
		});	

		return dg; 
	}
	
	fgm._removeResultGrid = function() {
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
		var usrDataName = $(evt.item).attr("udata-name"); 
		if (usrDataName && (usrDataName.length > 0)) {
			if (fgm.selectedPanel !== usrDataName) {
				console.log("Panel Selection Changed: " + usrDataName);
				fgm.selectedPanel = usrDataName; 
				if(fgm.resultCache[usrDataName]) {
					var rc = fgm.resultCache[usrDataName]; 
					fgm._executeQueryForData(rc["query"]); 
				}
				/*
				var selectedPos = usrDataName.split(fgm.depthSeparator); 
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
	
	/* -------------------------- */
	/* Private Utility Functions  */
	/* -------------------------- */
	
    fgm._normalize = function(name) {
		if (name) {
			return name.replace(/\W/g, "_"); 
		} else {
			return name; 
		}
	}
	
	fgm._writeIntoCache = function(queryName, key, value) {
		if (!fgm.resultCache[queryName]) {
			fgm.resultCache[queryName] = {}; 
		}
		fgm.resultCache[queryName][key] = value;
	}
	
	fgm._readFromCache = function(queryName, key) {
		if (fgm.resultCache[queryName]) {
			return fgm.resultCache[queryName][key];
		}
		return null; 
	}	
	
	fgm._executeQueryForOID = function() {
		
		var promiseDict = {}; 
		$(fgm.searchParams).each(function(idx) {
			var item = this; 
			$(item["queries"]).each(function(idx) {
				var qry = this;
				console.log("query [" + qry["where"] + "] on " + qry["serviceUrl"]); 
				var queryName = item["name"]+fgm.depthSeparator+qry["name"]; 
				
				// cache the query results
				fgm._writeIntoCache(queryName, "query", qry);
				
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
			fgm._writeIntoCache(queryName, "OIDs", OIDResults[queryName]); 
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
		$(fgm.searchParams).each(function(idx) {
			var item = this; 
			$(item["queries"]).each(function(idx) {
				var qry = this;
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
			fgm._cacheResult(queryName, "stats", OIDResults[queryName]); 			
		}
	}
	
	fgm._executeQueryForDataByOID = function(serviceUrl, OIDs) {

		var query = new Query();
		query.objectIds = OIDs; 
		query.returnGeometry = true;
		query.outFields = ["*"];
		
		var queryTask = new QueryTask(qry["serviceUrl"]); 
		queryTask.execute(query, fgm._prepareDataResults);
	}
	
	fgm._executeQueryForData = function(qry) {
		console.log("query [" + qry["where"] + "] on " + qry["serviceUrl"]); 

		var query = new Query();
		query.where = qry["where"];
		query.geometry = qry["geometry"]; 
		query.returnGeometry = true;
		query.outFields = ["*"];
		
		var queryTask = new QueryTask(qry["serviceUrl"]); 
		queryTask.execute(query, fgm._prepareDataResults);
	}
	
	fgm._prepareDataResults = function(results) {
		fgm._removeResultGrid(); 
		
		console.log("show results"); 
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
	}
	
	return fgm; 
}); 