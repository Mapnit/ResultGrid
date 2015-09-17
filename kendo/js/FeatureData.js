var site_root = "//demos.telerik.com/kendo-ui"; 
var column_oid = "OBJECTID"; 

var layer_schema = [{
		group: "Equipment",
		name: "Equipment", 
		columns: [
		],
		featureCount: 10, 
		features: []
	}, {
		group: "Equipment",
		name: "Functional Locations", 
		featureCount: 1, 
		features: []
	}, {
		group: "Equipment",
		name: "Rig Status", 
		featureCount: 0, 
		features: []
	}, {
		group: "Landgrid",
		name: "Ownership Parcels", 
		featureCount: 2, 
		features: []
	}, {
		group: "Wells",
		name: "APC Wells", 
		featureCount: 4, 
		features: []
	}, {
		group: "Wells",
		name: "Industry Wells Domestic", 
		featureCount: 2, 
		features: []
	}]; 
	
var column_cmd_tmpl = {
		command: [{ 
			name: "Dismiss",
			text:"",
			class: "ob-icon-only",
			imageClass: "k-icon cmd-icon-dismiss ob-icon-only",
			click: function(e) {
				var dataItem = this.dataItem($(e.currentTarget).closest("tr"));
				console.log("delete this row: " + dataItem[column_oid]);
			}
		}, { 
			name: "ZoomIn",
			text:"",
			class: "ob-icon-only",
			imageClass: "k-icon cmd-icon-zoomIn ob-icon-only",
			click: function(e) {
				var dataItem = this.dataItem($(e.currentTarget).closest("tr"));
				console.log("zoom to this row: " + dataItem[column_oid]);
			}
		}, { 
			name: "Hyperlink",
			text:"",
			class: "ob-icon-only",
			imageClass: "k-icon cmd-icon-hyperlink ob-icon-only",
			click: function(e) {
				var dataItem = this.dataItem($(e.currentTarget).closest("tr"));
				console.log("pop up hyperlinks: " + dataItem[column_oid]);
			}
		}],  
	 /*
		command: [{ 
			name: "Dismiss",
			template: "<div class='k-button'><span class='k-icon cmd-icon-dismiss'></span></div>",
			click: function(e) {
				var dataItem = this.dataItem($(e.currentTarget).closest("tr"));
				console.log("delete this row: " + dataItem[column_oid]);
			}
		}, { 
			name: "ZoomIn",
			template: "<div class='k-button'><span class='k-icon cmd-icon-zoomIn'></span></div>",
			click: function(e) {
				var dataItem = this.dataItem($(e.currentTarget).closest("tr"));
				console.log("zoom to this row: " + dataItem[column_oid]);
			}
		}, { 
			name: "Hyperlink",
			template: "<div class='k-button'><span class='k-icon cmd-icon-hyperlink'></span></div>",
			click: function(e) {
				var dataItem = this.dataItem($(e.currentTarget).closest("tr"));
				console.log("pop up hyperlinks: " + dataItem[column_oid]);
			}
		}],
	 */
		width: 155
	}; 

var column_data_tmpl = [{
		template: "<div class='customer-photo'" +
					"style='background-image: url(" + site_root + "/content/web/Customers/#:CustomerID#.jpg);'></div>" +
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
