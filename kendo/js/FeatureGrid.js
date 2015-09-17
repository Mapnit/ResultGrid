function buildResultPanels(layer_schema) {
	var layerPane = $("#layerPanelbar");
	var prevGrpName; 
	var grpElement, listElement; 
	for(var i=0,l=layer_schema.length; i<l; i++) {
		var item = layer_schema[i]; 
		if (prevGrpName !== item["group"]) {
			prevGrpName = item["group"]; 
			grpElement = $("<li>" + item["group"] + "</li>");
			listElement = $("<ul></ul>"); 
			layerPane.append(grpElement.append(listElement));
		}
		if (listElement && item["featureCount"] > 0) {			
			listElement.append(
				$("<li></li>").attr("udata-name", item["name"]).html(item["name"] + " (" + item["featureCount"] + ")")
			); 
		}
	}; 

	$("#layerPanelbar").kendoPanelBar({
		expandMode: "multiple",
		select: onSelectResultPanel
	});

}	

function onSelectResultPanel(evt) {
	var usrDataName = $(evt.item).attr("udata-name"); 
	if (usrDataName && (usrDataName.length > 0)) {
		console.log("Selected Panel: " + usrDataName);
		for(var i=0,l=layer_schema.length; i<l; i++) {
			if (layer_schema[i]["name"] === usrDataName) {
				var columns_tmpl = [column_cmd_tmpl]; 
				$.merge(columns_tmpl, column_data_tmpl)
				buildResultGrid(site_root, columns_tmpl); 
				break; 
			}
		}
	} else {
		var dgElement = $("#datagrid"); 
		if (dgElement.data("kendoGrid")) {
			dgElement.data("kendoGrid").destroy();
			dgElement.empty(); 
			//dgElement.remove();
		}
	}
	/*
	if ($(evt.item).find(".k-group").text() === "") {
		var selectedItem = $(evt.item).find(".k-link").text(); 
		if (selectedItem && (selectedItem.length > 0)) {
			console.log("Selected Panel: " + selectedItem);
			//buildResultGrid(site_root, column_schema); 
		}
	}
	 */
}

function buildResultGrid(site_root, fields) {
	var dg = $("#datagrid").kendoGrid({
		dataSource: {
			type: "odata",
			transport: {
				read: site_root + "/service/Northwind.svc/Customers"
			},
			pageSize: 20
		},
		height: 450,
		groupable: true,
		resizable: true, 
		sortable: true,
		pageable: {
			//refresh: true,
			//pageSizes: true,
			buttonCount: 5
		},
		columns: fields
	});	

	return dg; 
}

function buildResultWindow(layer_schema) {
	
	// datagrid window
	var resultWin = $("#resultWindow"),
		resultSplitter = $('#resultSplitter'),
		panelDock = $("#panelDock")
				.bind("click", function() {
					resultWin.data("kendoWindow").open();
					panelDock.hide();
				});

	var onClose = function() {
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
			resize: resizePanes,
			visible: false
		});
		
		var resultWinKendo = $("#resultWindow").data("kendoWindow");
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
	
function resizePanes(evt) {
    $('#resultContainer').trigger("resize");

	var newGridHeight = evt.height - 55;
	//console.log("resize datagrid height = " + newGridHeight);
	var gridElement = $("#datagrid");
	gridElement.height(newGridHeight);
	if (gridElement.data("kendoGrid")) {
		gridElement.data("kendoGrid").resize();
	}	
}
	