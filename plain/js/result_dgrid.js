function buildDataGrid(site_root, column_schema) {
	$("#grid").kendoGrid({
		dataSource: {
			type: "odata",
			transport: {
				read: site_root + "/service/Northwind.svc/Customers"
			},
			pageSize: 20
		},
		height: 550,
		groupable: true,
		sortable: true,
		pageable: {
			refresh: true,
			pageSizes: true,
			buttonCount: 5
		},
		columns: column_schema
	});
	
	// datagrid window
	var panel = $("#resultPanel"),
		panelDock = $("#panelDock")
				.bind("click", function() {
					panel.data("kendoWindow").open();
					panelDock.hide();
				});

	var onClose = function() {
		panelDock.show();
	}

	if (!panel.data("kendoWindow")) {
		panel.kendoWindow({
			width: "1050px",
			//height: "500px",
			title: "Query Results",
			actions: [
				//"Pin",
				//"Minimize",
				//"Maximize",
				"Close"
			],
			close: onClose,
			visible: false
		});
		var dg_panel = $("#resultPanel").data("kendoWindow");
		dg_panel.bind("resize", resize_dgrid); 
		
		dg_panel.center().open(); 
	}
	
}

	
function resize_dgrid(evt) {
	var gridElement = $("#grid");
	var newGridHeight = evt.height - 50;
	//console.log("resize datagrid height = " + newGridHeight);

	gridElement.height(newGridHeight);
	gridElement.data("kendoGrid").resize();
}
	