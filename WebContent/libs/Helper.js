sap.ui.define([
	"sap/m/Dialog", 'sap/m/Label', 'sap/m/Button', 'sap/m/TextArea', 'de/arvato/GRModul04/libs/Constants',
], function(Dialog, Label, Button, TextArea, Constants) {
    "use strict";

    return {

	isInputValid : function(aInputs, sItems, aGroups) {

	    var that = this;
	    var bValidationError = false;

	    if (aInputs) {
		// check that inputs are not empty
		// this does not happen during data binding as this is only triggered by changes
		jQuery.each(aInputs, function(i, oInput) {
		    bValidationError = that._validateInput(oInput) || bValidationError;
		});
	    }

	    if (sItems) {
		// check that inputs are not empty
		// this does not happen during data binding as this is only triggered by changes
		jQuery.each(sItems, function(i, oInput) {
		    bValidationError = that._validateItems(oInput) || bValidationError;
		});
	    }
	    
	    if (aGroups){		
		jQuery.each(aGroups, function(i, oGroup) {
		    bValidationError = that._validateRadioGroup(oGroup) || bValidationError;
		});
	    }

	    return bValidationError == false;
	},

	_validateRadioGroup: function(oRadioGroup) {
	    
	    var bSelected = false;
	    var bValidationError = false;
	    
	    oRadioGroup.getButtons().forEach(function(oButton){
	    
		if (oButton.getSelected()){
		    bSelected = true;
		}
	    });
	    
	    if(!bSelected){
		oRadioGroup.setValueState("Error");
		bValidationError = true;
	    } else {
		oRadioGroup.setValueState("None");		
	    }
	    
	    return bValidationError;
	},
	
	_validateInput : function(oInput) {

	    var oBinding = oInput.getBinding("value");

	    var sValueState = "None";
	    var bValidationError = false;

	    if (oBinding && oBinding.getType()) {

		try {
		    oBinding.getType().validateValue(oInput.getValue());
		}
		catch (oException) {
		    sValueState = "Error";
		    bValidationError = true;
		}

		oInput.setValueState(sValueState);
	    }

	    return bValidationError;
	},

	_validateItems : function(oInput) {

	    var sValueState = "None";
	    var bValidationError = false;

	    var oBinding = oInput.getBinding("items");
	    if (oBinding) {

		if (oInput.getSelectedItem()) {
		    oBinding = oInput.getSelectedItem().getBinding("key");

		    if (oBinding.getType()) {

			try {
			    oBinding.getType().validateValue(oInput.getValue());
			}
			catch (oException) {
			    sValueState = "Error";
			    bValidationError = true;
			}

			oInput.setValueState(sValueState);
		    }

		}
		else {
		    sValueState = "Error";
		    bValidationError = true;
		}

	    }

	    oInput.setValueState(sValueState);

	    return bValidationError;
	},

	getErrorValue : function(oError) {
	    var oJSONError = JSON.parse(oError.responseText);
	    return oJSONError.error.message.value;
	},

	getReasonDialog : function(oContext) {

	    var oReasonDialog = new Dialog({
		title : oContext.title,
		type : 'Message',
		contentWidth: "500px",
		contentHeight: "200px",
		resizable: true,
		content : [
			new Label({ /* text: oContext.text, */
			    labelFor : 'submitDialogTextarea'
			}), new TextArea('submitDialogTextarea', {
				height: "160px",
				maxLength: Constants.LENGTH_OF_REASON,
			    value: oContext.initValue,
			    liveChange : function(oEvent) {
				var sText = oEvent.getParameter('value');
				var parent = oEvent.getSource().getParent();
				parent.getBeginButton().setEnabled(sText.length > 0);
			    },
			    width : '100%',
			    placeholder : oContext.bundle.getText("General.Placeholder")
			})
		],
		beginButton : new Button({
		    text : oContext.bundle.getText("General.Accept"),
		    enabled : false,
		    press : function() {
			var oTextArea = sap.ui.getCore().byId('submitDialogTextarea');
			oContext.success(oContext.source, oTextArea.getValue());
			oTextArea.setValue("");
			oReasonDialog.close();
		    }
		}),
		endButton : new Button({
		    text : oContext.bundle.getText("General.Abort"),
		    press : function() {
			oContext.abort(oContext.source);
			oReasonDialog.close();
		    }
		}),
		afterClose : function() {
		    oReasonDialog.destroy();
		}
	    });

	    return oReasonDialog;
	},
	
		getReasonListDialog : function(oContext) {

			this.oReasonListDialog = new sap.m.SelectDialog("", {	
				multiSelect: oContext.multiSelect,
		    	rememberSelections: true,
		    	title: oContext.title,
		    	confirm: function(oEvent) {		
		    		
		    		var bAdditional = '';
		    		var oBindingContext, aSelectedItems, oObject = {}, aReasons = []; 
		    		
		    		if (oContext.multiSelect){
		    			aSelectedItems = oEvent.getParameter("selectedItems");
		    			var iIndex = 0;
		    			for(iIndex in aSelectedItems){
		    				var oLocalObject = aSelectedItems[iIndex].getBindingContext("erp").getObject();
		    				aReasons.push(oLocalObject.Number);
		    				if (oLocalObject.Additional === 'X'){
		    					bAdditional = oLocalObject.Additional;
		    				}	    				
		    				
		    				oObject.Number = oLocalObject.Number;
		    				if(oContext.collect){
		    					if(!oObject.Text){
		    						oObject.Text = "";
		    					} 
		    					oObject.Text += oLocalObject.Text + (oLocalObject.Additional === 'X' ? " " : ", ");
		    				}
		    			}
		    			
		    		} else {		    		
			    		oBindingContext = oEvent.getParameter("selectedItem").getBindingContext("erp");
			    		var oLocalObject = oBindingContext.getObject();
			    		bAdditional = oLocalObject.Additional;
			    		oObject = oLocalObject;
		    		}
		    		
		    		
		    		if (bAdditional === 'X'){
		    			
		    			this.getReasonDialog({
		    				bundle: oContext.bundle,
		    				initValue: oContext.initValue,
			   				source : oListItem,
			   				abort : function(oItem) {				   					
			   				}.bind(this),
			   				success : function(oItem, sReasonText) {
			   					oContext.fnConfirm({
				    				reason: oObject.Number,
				    				reasonText: oObject.Text,
				    				reasons: aReasons,
				    				text: sReasonText
				    			});
			   				}.bind(this),
			   				title : oContext.title			   				
			   			}).open();		    			
		    			
		    		} else {
		    			oContext.fnConfirm({
		    				reason: oObject.Number,
		    				reasonText: oObject.Text,
		    				reasons: aReasons
		    			});
		    		}
		    		
				}.bind(this)
		    });			 
		    
		    this.oReasonListDialog.setModel(oContext.model, "erp");
		    this.oReasonListDialog.setRememberSelections(true);
		    
		    var oListItem;
		    
		    if (oContext.multiSelect){
		    	oListItem = new sap.m.StandardListItem({
					title: "{erp>Text}",
					selected: "{erp>Selected}"
				});
		    } else {	    
			    oListItem = new sap.m.StandardListItem({
					title: "{erp>Text}",
					selected: "{=${erp>Number} === '"+ oContext.selectedKey +"'}"
				});
		    }
		    
		    var aFilters = [new sap.ui.model.Filter("Field", "EQ", oContext.field),
		    	new sap.ui.model.Filter("Language", "EQ", sap.ui.getCore().getConfiguration().getLanguage())];		 
		    
		    this.oReasonListDialog.bindAggregation("items", { 
		    	path: "erp>/ReasonSet", 
		    	template: oListItem, 
		    	filters: aFilters,
		    	events: {		    	    
		    	    dataReceived: function(oEvent) {
		    	    	
						if (!oContext.selectedKeys){
							return;
						}
							
						var aItems = this.oReasonListDialog.getItems();
						var iIndex = 0;
						for( iIndex in aItems ){
							var oItem = aItems[iIndex];
							var oObject = oItem.getBindingContext("erp").getObject();
							
							var bFound = oContext.selectedKeys.find(function(element) {
								  return element === oObject.Number;
							});
							
							if (bFound){
								oItem.setSelected(true);
							}
						}
					}.bind(this)		    	    
		    	  }
		    });
		    
		  
	
		    return this.oReasonListDialog;
		}

    };
});
