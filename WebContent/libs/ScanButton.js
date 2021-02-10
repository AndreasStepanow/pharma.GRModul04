sap.ui.define([
    "sap/m/Button"
], function(Button) {

    "use strict";
    return Button.extend("de.arvato.GRModul01.libs.ScanButton", {
	metadata : {

	    properties : {
		inputType: {
		    type : "sap.m.InputType"
		},
		inputValue : {
		    type : "string",
		},
		dialogTitle : {
		    type : "string"
		},
		dialogIcon : {
		    type : "string"
		},
		dialogAbortText : {
		    type : "string"
		}
	    },

	    aggregations : {
		_button : {
		    type : "sap.m.Button",
		    multiple : false,
		    visibility : "hidden"
		}
	    },

	    events : {
		inputSuccess : {
		    parameters : {
			value : {
			    type : "string"
			}
		    }
		}
	    }
	},

	init : function() {
	    this.setAggregation("_button", new Button({		
		icon : "sap-icon://bar-code",
		press : this._onPress.bind(this)
	    }));
	},

	_onPress : function(oEvent) {

	    var oInput = new sap.m.Input({
		type: this.getInputType(),
		submit : function(oEvent) {
		    oDialog.close();
		    this.fireEvent("inputSuccess", {
			value : oEvent.getParameter("value")
		    });
		}.bind(this)
	    });

	    var oDialog = new sap.m.Dialog({
		icon : this.getDialogIcon(),
		title : this.getDialogTitle(),
		content : oInput,
		endButton : new sap.m.Button({
		    text : this.getDialogAbortText(),
		    press : function() {
			oDialog.close();
		    }
		})
	    });
	    
	    oDialog.attachAfterOpen(function(oEvent){
		oInput.focus();
	    });

	    oDialog.open();
	},

	renderer : function(oRM, oControl) {
	    oRM.write("<div");
	    oRM.writeControlData(oControl);
	    oRM.write(">");
	    oRM.renderControl(oControl.getAggregation("_button"));
	    oRM.write("</div>");
	}

    });

});
