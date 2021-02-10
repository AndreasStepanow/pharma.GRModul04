sap.ui.define([], function() {
	"use strict";

	return {
		/**
		 * Rounds the currency value to 2 digits
		 * 
		 * @public
		 * @param {string}
		 *            sValue value to be formatted
		 * @returns {string} formatted currency value with 2 digits
		 */
		
		getClient: function(sClient){
			
			if(sClient == null || sClient == ""){
				return this.getResourceBundle().getText("Detail.NotDefined");
			} else {	
				this.getView().getModel().read("/SapClientSet", {});
				var oProp = this.getView().getModel().getProperty("/SapClientSet('" + sClient + "')");
				return oProp ? ( oProp.Mandt + " - " + oProp.Mtext ) : this.getResourceBundle().getText("Detail.NotDefined");
			}
		},
		
		getStateIcon: function(sState){
			
			switch (sState) {
			case "00":
				  return "sap-icon://decline";
			    break;
			case "10":
				  return "sap-icon://arrow-bottom";
			    break;
			  case "20":
				  return "sap-icon://accept";
			    break;
			  case "30":	
				  return "sap-icon://arrow-top";
			    break;
			  default:
			    return "sap-icon://show";
			}
			
		},		
		
		getManufacturerDescription: function(sManufacturerNr){
			if(sManufacturerNr == null || sManufacturerNr == ""){
				return this.getResourceBundle().getText("Detail.NotDefined");
			} else {	
				this.getView().getModel().read("/ContractManufacturerSet", {});
				var oProp = this.getView().getModel().getProperty("/ContractManufacturerSet('" + sManufacturerNr + "')");
				return oProp ? oProp.Description : this.getResourceBundle().getText("Detail.NotDefined");
			}
		},
	
		inProcess: function(bInProcess){			
			if(bInProcess){
				return this.getResourceBundle().getText("Detail.Change");
			} else {
				return this.getResourceBundle().getText("Detail.Show");
			}
		},		
		
		stateToBoole: function( sState ){
			if(sState === "45"){
				return false;
			} else {
				return true;
			}
		},
		
		formatDate: function(sValue){
			return sValue;
			//var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern : "yyyy-MM-dd" });			
			//return dateFormat.format(sValue);
		},
		
		currencyValue : function(sValue) {
			if (!sValue) {
				return "";
			}

			return parseFloat(sValue).toFixed(2);
		},

		formatState : function(sStatus) {
			if (sStatus){
				var oProp = this.getView().getModel().getProperty("/DomainValueSet('" + sStatus + "')");
				if(oProp){
					
					var oObject = this.getView().getBindingContext().getObject();
					var sReason = "";
					if (oObject && oObject.StateReason){
						sReason = oObject.StateReason;
					}
					
					return oProp.Text + (sReason ? " (" + sReason + ")" : sReason);
				}
			}	
		},
		
		formatLocation: function(sLocation) {
			if(sLocation === 'HW'){
				return 'HW1';
			} else {
				return sLocation;
			}
		}
	};

});