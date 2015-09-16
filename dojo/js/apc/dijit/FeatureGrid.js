define([
	"dijit/_WidgetBase",
	"dojo/Evented",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array", 
	"dojo/ready", 
	
	"dojo/dom", 
	"dojo/dom-construct", 
	
	"jquery", "kendo" 
], function(
	_WidgetBase, Evented, declare, lang, array, ready, 
	dom, domConstruct, 
	jq, kendo
) {
	var htmlContent = 
		jq("<button>push me</button>")[0].outerHTML; 
		//domConstruct.create("button", {innerHTML: "push me"});
	
	var featureGrid = declare("FeatureGrid", [_WidgetBase], {
		buildRendering: function(){
            // create the DOM for this widget
            this.domNode = domConstruct.toDom(htmlContent); 
        }

	}); 
	
	ready(function() {
		console.log("The FeatureGrid widget is ready!");
	}); 
	
	return featureGrid; 
}); 