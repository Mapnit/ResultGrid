define([
	"dojo/_base/declare",
	"jquery", "kendo" 
], function(
	declare
) {	
	var fgridMgr = declare("FeatureGridManager", null, {}); 
	
	fgridMgr.site_root = "//demos.telerik.com/kendo-ui"; 
	fgridMgr.column_oid = "OBJECTID"; 	
	
	fgridMgr.column_data_tmpl = [{
		template: "<div class='customer-photo'" +
					"style='background-image: url(" + fgridMgr.site_root + "/content/web/Customers/#:CustomerID#.jpg);'></div>" +
					"<div class='customer-name'>#: ContactName #</div>",
		field: "ContactName",
		title: "Contact Name",
		width: 240
	}, {
		field: "ContactTitle",
		title: "Contact Title"
	}, {
		field: "CompanyName",
		title: "Company Name"
	}, {
		field: "Country",
		width: 150
	}]; 
	
	fgridMgr.column_cmd_tmpl = {
		command: [{ 
			name: "Dismiss",
			text:"",
			class: "ob-icon-only",
			imageClass: "k-icon cmd-icon-dismiss ob-icon-only",
			click: function(e) {
				var dataItem = this.dataItem($(e.currentTarget).closest("tr"));
				console.log("delete this row: " + dataItem[fgridMgr.column_oid]);
			}
		}, { 
			name: "ZoomIn",
			text:"",
			class: "ob-icon-only",
			imageClass: "k-icon cmd-icon-zoomIn ob-icon-only",
			click: function(e) {
				var dataItem = this.dataItem($(e.currentTarget).closest("tr"));
				console.log("zoom to this row: " + dataItem[fgridMgr.column_oid]);
			}
		}, { 
			name: "Hyperlink",
			text:"",
			class: "ob-icon-only",
			imageClass: "k-icon cmd-icon-hyperlink ob-icon-only",
			click: function(e) {
				var dataItem = this.dataItem($(e.currentTarget).closest("tr"));
				console.log("pop up hyperlinks: " + dataItem[fgridMgr.column_oid]);
			}
		}],
		width: 155
	}; 
	
	fgridMgr.buildFeatureGrid = function(searchParams) {
		fgridMgr.searchParams = searchParams; 
		fgridMgr._buildResultWindow(); 
		fgridMgr._buildResultPanels();
	}
	
	fgridMgr._buildResultWindow = function() {
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
				resize: fgridMgr.resizePanes, 
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
	
	fgridMgr.resizePanes = function (evt) {
		$('#resultSplitter').trigger("resize");

		var newGridHeight = evt.height - 55;
		//console.log("resize datagrid height = " + newGridHeight);
		var gridElement = $("#datagrid");
		gridElement.height(newGridHeight);
		if (gridElement.data("kendoGrid")) {
			gridElement.data("kendoGrid").resize();
		}	
	}
	
	fgridMgr._buildResultPanels = function() {
		var layerPane = $("#layerPanelbar");
		var prevGrpName; 
		var grpElement, listElement; 
		$(fgridMgr.searchParams).each(function(idx) {
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
					listElement.append(
						$("<li></li>").attr("udata-name", qry["name"]).html(qry["name"])
					);
				}); 
			}
		}); 

		$("#layerPanelbar").kendoPanelBar({
			expandMode: "multiple",
			select: fgridMgr.onSelectResultPanel
		});
	}
	
	fgridMgr.onSelectResultPanel = function(evt) {
		var usrDataName = $(evt.item).attr("udata-name"); 
		if (usrDataName && (usrDataName.length > 0)) {
			console.log("Selected Panel: " + usrDataName);
			for(var i=0,l=fgridMgr.searchParams.length; i<l; i++) {
				var item = fgridMgr.searchParams[i]; 
				if (item["name"] === usrDataName) {
					var columns_tmpl = [fgridMgr.column_cmd_tmpl]; 
					$.merge(columns_tmpl, fgridMgr.column_data_tmpl)
					fgridMgr._buildResultGrid(fgridMgr.site_root, columns_tmpl); 
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
	}

	fgridMgr._buildResultGrid = function(site_root, fields) {
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
	
	return fgridMgr; 
}); 