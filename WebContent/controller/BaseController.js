/*global history */
sap.ui.define([
		"sap/ui/core/mvc/Controller",
		"sap/ui/core/routing/History"
	], function (Controller, History) {
		"use strict";

		return Controller.extend("de.arvato.GRModul04.controller.BaseController", {
			
			_readPO: function(sPONummer){
				
				 return new Promise( function(resolve, reject) {	    					    		
		    		var oERPModel = this.getModel();
		    		
		    		var sObjectPath = oERPModel.createKey("/POSet", {
		    			PONumber :  sPONummer
					});
					
					this.getView().setBusy(true);
					oERPModel.read(sObjectPath, {
						success : function(oData, oResponse) {
							this.getView().setBusy(false);
							resolve(oData);				
						}.bind(this),
						error : function(oError) {
							this.getView().setBusy(false);
							reject(oError);
						}.bind(this)
					});
		    		
				 }.bind(this));
			},
			
			_readPOItems: function(aPOList, fnSuccess){
				
				var aFilters = [];
								
				var iIndex;
				for (iIndex in aPOList){							
					var oItem = aPOList[iIndex];	    
					aFilters.push(new sap.ui.model.Filter({ path: "PONumber", operator: "EQ", value1: oItem.PONumber }));
				}

				var sCheckId = this.getModel("app").getProperty("/Detail/Object/CheckId");
				aFilters.push(new sap.ui.model.Filter({ path: "CheckId", operator: "EQ", value1: sCheckId }));
				
				var oModel = this.getModel("app");
				var oERPModel = this.getModel();		
				oERPModel.read("/POItemSet", {
					filters: aFilters,
					success : function(oData, oResponse) {
						fnSuccess(oData.results);				
					}.bind(this),
					error : function(oError) {
		
					}
				});
			},
		
			_readLocation: function(sLgnum, fnSuccess){
				
				var oModel = this.getModel("app");
				var oERPModel = this.getModel();		
				oERPModel.read("/LocationSet", {
					filters: [new sap.ui.model.Filter({ path: "Lgnum", operator: sap.ui.model.FilterOperator.EQ, value1: sLgnum })],
					success : function(oData, oResponse) {
						fnSuccess(oData.results);				
					}.bind(this),
					error : function(oError) {}
				});
			},
			
			_readClient: function(sLocID, sLgnum, fnSuccess){
				
				var oModel = this.getModel("app");
				var oERPModel = this.getModel();		
				oERPModel.read("/SapClientSet", {
					filters: [
						new sap.ui.model.Filter({ path: "LocID", operator: sap.ui.model.FilterOperator.EQ, value1: sLocID }),
						new sap.ui.model.Filter({ path: "Lgnum", operator: sap.ui.model.FilterOperator.EQ, value1: sLgnum })
					],
					success : function(oData, oResponse) {		
						fnSuccess(oData.results);
					}.bind(this),
					error : function(oError) {}
				});
			},
			
			/**
			 * Convenience method for accessing the router in every controller of the application.
			 * @public
			 * @returns {sap.ui.core.routing.Router} the router for this component
			 */
			getRouter : function () {
				return this.getOwnerComponent().getRouter();
			},

			/**
			 * Convenience method for getting the view model by name in every controller of the application.
			 * @public
			 * @param {string} sName the model name
			 * @returns {sap.ui.model.Model} the model instance
			 */
			getModel : function (sName) {
				return this.getView().getModel(sName);
			},

			/**
			 * Convenience method for setting the view model in every controller of the application.
			 * @public
			 * @param {sap.ui.model.Model} oModel the model instance
			 * @param {string} sName the model name
			 * @returns {sap.ui.mvc.View} the view instance
			 */
			setModel : function (oModel, sName) {
				return this.getView().setModel(oModel, sName);
			},

			/**
			 * Convenience method for getting the resource bundle.
			 * @public
			 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
			 */
			getResourceBundle : function () {
				return this.getOwnerComponent().getModel("i18n").getResourceBundle();
			},
			
			isInProcess: function() {
				return this.getModel("app").getProperty("/InProcess"); 
			},
						
			setInProcess: function(bInProcess) {
				this.getModel("app").setProperty("/InProcess", bInProcess); 
				//this.getModel("app").setProperty("/POmustBeCompleted", true);
				//this.getView().byId("idObjectHeader").setIcon(bInProcess ? "sap-icon://edit": "");
			},

			/**
			 * Event handler for navigating back.
			 * It there is a history entry or an previous app-to-app navigation we go one step back in the browser history
			 * If not, it will replace the current entry of the browser history with the master route.
			 * @public
			 */
			onNavBack : function() {
				var sPreviousHash = History.getInstance().getPreviousHash(),
					oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

					if (sPreviousHash !== undefined || !oCrossAppNavigator.isInitialNavigation()) {
					history.go(-1);
				} else {
					this.getRouter().navTo("master", {}, true);
				}
			},
			
			onUserDialog: function (fnSuccess) {
				
				var fnCheckUser = function() {
					
					this._oInput = sap.ui.getCore().byId('idUserDialogInput');
					var sText = this._oInput.getValue();
					if(sText){
						
						var oModel = this.getView().getModel();
						
						var sObjectPath = oModel.createKey("/UserSet", {
							Username :  sText
						});
						
						dialog.setBusy(true);
						oModel.read(sObjectPath, {
							
							success: function(oContext) {
								dialog.setBusy(false);
								this.getView().getModel("app").setProperty("/Username", oContext.Username);		
								this.getView().getModel("app").setProperty("/Lgnum", oContext.Lgnum);		
			
								this.getView().getModel("app").setProperty("/EditPermitted", oContext.ChangeAuthorization);
								this.getView().getModel("app").setProperty("/ArticleDataPermitted", oContext.ChangeAuthorization);
								this.getView().getModel("app").setProperty("/GoodsPostingPermitted", oContext.ShowAuthorization);										
								this.getView().getModel("app").setProperty("/ContractManufacturerPermitted", oContext.ChangeAuthorization);																						

								if(!oContext.Lgnum){
									sap.m.MessageToast.show(this.getResourceBundle().getText("Message.LgnumNotFound"), {
										at: "center center",    
									});
								}										
								dialog.setBusy(true);
								this._readLocation(oContext.Lgnum, function(aLocations){
									dialog.setBusy(false);											
									this.getModel("app").setProperty("/Locations", aLocations);
									fnSuccess();
									dialog.close();
								}.bind(this));			
								
								
							}.bind(this),
							error: function(oContext) {
								dialog.setBusy(false);
								this._oInput.setValue("");								
								sap.m.MessageToast.show(this.getResourceBundle().getText("Message.UserNotFound"), {
									at: "center center",    
								});
							}.bind(this)
						});
						
						
					} else {
						sap.m.MessageToast.show(this.getResourceBundle().getText("Message.EnterUser"), {
							at: "center center",    
						});
					}
				}.bind(this);
				
				var dialog = new sap.m.Dialog({
					title: this.getResourceBundle().getText("Message.UserName"),
					content: [
						//new sap.m.Label({ text: 'Bitte Benutzername eingeben!', labelFor: 'idUserDialogInput'}),
						new sap.m.Input('idUserDialogInput', {	
							submit: fnCheckUser.bind(this)			
						})
					],
					beginButton: new sap.m.Button({
						type: sap.m.ButtonType.Emphasized,
						text: 'Ok',						
						press: fnCheckUser.bind(this)
					}),
					afterClose: function() {
						dialog.destroy();
					}
				});

				dialog.open();
			},
			
			_printCheck: function(oData) {   
    			
	   			 return new Promise(function(resolve, reject) {	 
	   				 	   					
		    			this.getModel().callFunction("/PrintCheck", {
			    			method: "GET",   
			    			urlParameters: {
			    				Printer: oData.Printer,
			    				CheckId: oData.CheckId,
			    				Language: oData.Language
			    			},
			    			success: function(oData, response) {
			    				resolve(oData);            
			    			}.bind(this),
			    			error: function(oError) {
			    				reject(oError);
			    			}.bind(this)
		    			}); 
	   			}.bind(this));
			},
			
			_updateCheck: function(oCheck) {
			    
				return new Promise(function(resolve, reject){
								   
				    var oBundle = this.getModel("i18n").getResourceBundle();
				    var oAppModel = this.getModel("app");   
				    var oErpModel = this.getModel();
	
				    var sPath = oErpModel.createKey("/CheckSet", {
						CheckId: oCheck.CheckId		  
				    	});
	
				    oErpModel.update(sPath, oCheck, {				    	
						success : function(oData, oResponse) {							
							resolve(oCheck);
						}.bind(this),
						error : function(oError) {
							reject(oError);
						}.bind(this)
				    });
			    
				}.bind(this));
			},
			
			_updateDocItem: function() {
			    
			    return new Promise(function(resolve, reject){
			    	    
			    	var oErpModel = this.getModel();
			    	var oAppModel = this.getModel("app");
			    	
			    	var cGroupId = "G1";
			    	oErpModel.setUseBatch(true);
			    	oErpModel.setDeferredGroups([cGroupId]);			    	
					
					var aItems = oAppModel.getProperty("/Detail/ArticleData/Items");
					var iIndex;
					for (iIndex in aItems){
								
						var oItem = aItems[iIndex];						
						var oDocItem = oItem;
						oDocItem.ItemId = oItem.ItemId;
		    	  
						var sPath = oErpModel.createKey("/DocItemSet", {
		    	    	    ItemId: oDocItem.ItemId
						});	
		    	    
						oErpModel.update(sPath, oDocItem, {
			    	        success: function(oData, oResponse) {
			    	        	resolve(oData);
			    	        }.bind(this), 
			    	        error: function(oError) {
			    	    	}.bind(this)
			    	    });
					}
		    	    
					oErpModel.submitChanges({
						groupId: cGroupId,
						success: function(oData, oResponse) {
							resolve(oData, oResponse);
						}.bind(this), 
						error: function(oError) {
							reject(oError);
						}.bind(this)
				    });
			    }.bind(this));
			},
			
			registerMassageManager: function(oView) {
    			var oMessageManager = sap.ui.getCore().getMessageManager();    			
    			oView.setModel(oMessageManager.getMessageModel(), "message");
    			oMessageManager.registerObject(oView, true);    		    
			},
			
			_getMessagePopover : function(oView) {
				
    		    // create popover lazily (singleton)
    		    if (!this._oMessagePopover) {
	    			this._oMessagePopover = sap.ui.xmlfragment(oView.getId(),
	    				"de.arvato.GRModul04.fragment.MessagePopover", this);
	    			oView.addDependent(this._oMessagePopover);
    		    }
    		    return this._oMessagePopover;
    		},

		});

	}
);