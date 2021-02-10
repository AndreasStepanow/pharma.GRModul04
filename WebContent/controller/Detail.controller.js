/*global location */
sap.ui.define([
		"de/arvato/GRModul04/controller/BaseController",
		"sap/ui/model/json/JSONModel",
		"de/arvato/GRModul04/model/formatter",
		"de/arvato/GRModul04/libs/Helper",
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator",
		"sap/ui/core/Fragment", "sap/m/MessageBox", 'de/arvato/GRModul04/libs/Constants'
	], function (BaseController, JSONModel, formatter, Helper, Filter, FilterOperator, Fragment, MessageBox, Constants) {
		"use strict";

		return BaseController.extend("de.arvato.GRModul04.controller.Detail", {

			formatter: formatter,

			/* =========================================================== */
			/* lifecycle methods */
			/* =========================================================== */

			onInit : function () {
				 
				// Model used to manipulate control states. The chosen values
				// make sure,
				// detail page is busy indication immediately so there is no
				// break in
				// between the busy indication for loading the view's meta data
				var oViewModel = new JSONModel({
					busy : false,
					delay : 0,
					lineItemListTitle : this.getResourceBundle().getText("detailLineItemTableHeading")
				});

				this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
				this.setModel(oViewModel, "detailView");
				this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
			},
			
			 _showServiceError: function(sDetails) {
				 
			     if (this._bMessageOpen) {
			            return;
			     }
			     
			     this._bMessageOpen = true;
			     
			     MessageBox.error( this._sErrorText, {
			                id: "serviceErrorMessageBox",
			                details: sDetails, 			                
			                actions: [MessageBox.Action.CLOSE],
			                onClose: function() {
			                    this._bMessageOpen = false;
			                }.bind(this)
			            }
			        );
			},
			
			_getContractManufacturerPopover: function () {
				
				if (!this._oContractManufacturerPopover) {
										
					this._oContractManufacturerPopover = sap.ui.xmlfragment(this.getView().getId(),
		    				"de.arvato.GRModul04.fragment.ContractManufacturerPopover", this);
					this.getView().addDependent(this._oContractManufacturerPopover);
					
					return this._oContractManufacturerPopover;
//					return Fragment.load({
//						type: "XML",
//						name: "de.arvato.GRModul04.fragment.ContractManufacturerPopover",
//						controller: this
//					}).then(function (oPopover) {
//						this._oContractManufacturerPopover = oPopover;
//						this.getView().addDependent(this._oContractManufacturerPopover);
//					}.bind(this));					
				}
				return this._oContractManufacturerPopover;
			},
			
			onBatchLinkPress: function(oPressEvent){
	
				var oSource = oPressEvent.getSource();
				var oCustomData = oSource.getCustomData()[0];
				var oBindObject = oSource.getBindingContext().getObject();
				
				this.getModel("app").setProperty("/BatchEditContent", {
					ItemId: oBindObject.ItemId,					
					Field: oCustomData.getValue(),
					Path: oSource.getBindingContext().getPath()
				});
				
				if (!this.oBatchEditDialog) {								
					this.oBatchEditDialog = new sap.m.Dialog({
						type: sap.m.DialogType.Message,
						title: this.getResourceBundle().getText("GoodsPostingData.ChangeBatchDialogTitle"),
						content: [
							new sap.m.Label({
								text: this.getResourceBundle().getText("GoodsPostingData.ChangeBatchDialogBatch"),
								labelFor: "idBatchInput"
							}),
							new sap.m.Input("idBatchInput", {
								value: "{Charg}",
								width: "100%",
								maxLength: Constants.LENGTH_OF_BATCH,
								placeholder: "Add note (required)",
								liveChange: function (oEvent) {
									var sText = oEvent.getParameter("value");
									this.oBatchEditDialog.getBeginButton().setEnabled(sText.length > 0);
								}.bind(this)
							}),
							new sap.m.Label({
								text: this.getResourceBundle().getText("GoodsPostingData.ChangeBatchDialogExpireDate"),
								labelFor: "idExpireDatePicker"
							}),							
							new sap.m.DatePicker("idExpireDatePicker",{
								dateValue: "{path: 'Vfdat'}",
								change: function(oEvent){
									this.oBatchEditDialog.getBeginButton().setEnabled(true);
								}.bind(this)							
							})					
						],
						beginButton: new sap.m.Button({
							type: sap.m.ButtonType.Emphasized,
							text: this.getResourceBundle().getText("General.Change"),
							enabled: false,
							press: function (oEvent) {		
								var oEditContext = this.getModel("app").getProperty("/BatchEditContent");
								oEditContext.Value = this.oBatchEditDialog.getContent()[1].getValue();
								
								this.saveChangedItemData(oEditContext);
								
								oEditContext.Field = "Vfdat";								
								var oDate = new Date();	
								var oTemp = new Date(this.oBatchEditDialog.getContent()[3].getDateValue());
								oDate.setDate(oTemp.getDate());
								oDate.setMonth(oTemp.getMonth());
								oDate.setYear(oTemp.getFullYear());								
								oEditContext.Value = oDate;
								
								this.saveChangedItemData(oEditContext);
								
								this.getView().setBusy(true);
								this._updateDocItem().then(function(){
									this.getView().setBusy(false);
									this.oBatchEditDialog.close();
								}.bind(this));
													
							}.bind(this)
						}),
						endButton: new sap.m.Button({
							text: "Cancel",
							press: function () {
								this.oBatchEditDialog.close();								
							}.bind(this)
						})
					});
				}
				
				this.oBatchEditDialog.setModel(this.getModel());
				this.oBatchEditDialog.bindElement({
					path : oPressEvent.getSource().getBindingContext().getPath()
				});
				this.oBatchEditDialog.open();
			},
			
			onPONumberSubmit: function(oSubmitEvent){
				var sValue = oSubmitEvent.getParameter("value");
				if(sValue){
					this._readPO(sValue).then(
						function(oData){
							this.getView().byId("idPONumberInput").setValue("");		
							this._addPONumber(oData.PONumber)
						}.bind(this), 
						function(oData){
							var sClient = this.getModel("app").getProperty("/Detail/Object/Client");
							sap.m.MessageToast.show(this.getResourceBundle().getText("Message.PONotFound",[sValue, sClient]), {
								at: "center center",    
							});
						}.bind(this));					
				}
			},
			
			onPONumberLinkPress: function(oPressEvent){
				
				var oStateData = {}, oWerksData = {};
				var sStatusText = "";
				var aCustomData = oPressEvent.getSource().getCustomData();
				if(aCustomData){					
					oStateData = aCustomData.find(function(oObj, index) {
						return oObj.getKey() === "State";
					});
					oWerksData = aCustomData.find(function(oObj, index) {
						return oObj.getKey() === "Werks";
					});
					
					sStatusText = this.getPOItemStateText(oStateData.getValue()); //+ "\n\t" + oWerksData.getValue();
				}
				
//				var sContent = [
//					new sap.ui.core.Icon({ src : "sap-icon://cart-2"}),
//					new sap.m.Label({ text: sStatusText })	
//				];
					
				if (!this._oPOItemPopover) {
					this._oPOItemPopover = new sap.m.Popover({		
						title: sStatusText
						//content: sContent
					});
					this.getView().addDependent(this._oPOItemPopover);
				} else {
					this._oPOItemPopover.setTitle(sStatusText);
				}				
				
				this._oPOItemPopover.openBy(oPressEvent.getSource());
				 
			},
			
			getPOItemStateText: function(sState){
				
				var sStateText = "";
				
				switch (sState) {
				case "00": // Offen
					sStateText = this.getResourceBundle().getText("POItemState.Open"); 
					break;
				case '20': // Voll
					sStateText = this.getResourceBundle().getText("POItemState.FullDelivered");
					break;
				case '10': // Teilgeliefert					
					sStateText = this.getResourceBundle().getText("POItemState.PartDelivered");
					break;
				case '30': // Überliefert					
					sStateText = this.getResourceBundle().getText("POItemState.Overdelivered");
					break;
				default:
					break;
				}
				
				return sStateText;				
			},
			
			_addPONumber: function(sNumber){
				
				var oAppModel = this.getModel("app");
				var aList = oAppModel.getProperty("/Detail/POData/List");
				var iIndex = aList.findIndex(obj => obj.PONumber == sNumber);
				if(iIndex < 0) {
					aList.push({ PONumber: sNumber });
					oAppModel.refresh();
					
					var aSelectedInList = [];
					aList.forEach(function(item){
						aSelectedInList.push(item.PONumber);
					});
					
					oAppModel.setProperty("/Detail/POData/SelectedInList", aSelectedInList);
				}
			}, 
			
			_removePONumber: function(sNumber){
				
				var oAppModel = this.getModel("app");
				var aList = oAppModel.getProperty("/Detail/POData/List");
				var aSelectedInList = oAppModel.getProperty("/Detail/POData/SelectedInList");
				
				var iIndex = aList.findIndex(obj => obj.PONumber == sNumber);
				if (iIndex > -1){
					aList.splice(iIndex, 1);
					oAppModel.refresh();
				
					var aSelectedInList = [];
					aList.forEach(function(item){
						aSelectedInList.push(item.PONumber);
					});	
				
					oAppModel.setProperty("/Detail/POData/SelectedInList", aSelectedInList);
				}
			},
						
			onPopoverItemSelect: function (oEvent) {	
		
				var oItem = oEvent.getParameter("listItem");
				var oObject = oItem.getBindingContext().getObject();		
						
				var oCheck = this.getModel("app").getProperty("/Master/Check");					
				oCheck.ManufacturerNr = oObject.ManuNumber;	
				oCheck.Aenam = this.getModel("app").getProperty("/Username");
				oCheck.Aedat = new Date();				
				if (oCheck){
					this.getView().setBusy(true);
					this._updateCheck(oCheck).then(function(oData){
						this.getView().setBusy(false);
					}.bind(this));
				}
				
				this._oContractManufacturerPopover.close();
			},

			onContractManufacturerPress: function (oEvent) {
				
				if( this.isInProcess() ){				
					var oPopoverFragment = this._getContractManufacturerPopover(),
						oSourceControl = oEvent.getSource(),
						oControlDomRef = oEvent.getParameter("domRef");
		
					if (oPopoverFragment instanceof Promise) {
						
						oPopoverFragment.then(function(oPopover) {
							this._oContractManufacturerPopover.setModel(oSourceControl.getModel());
							this._oContractManufacturerPopover.openBy(oControlDomRef);
						}.bind(this));
					} else {
						oPopoverFragment.setModel(oSourceControl.getModel());
						oPopoverFragment.openBy(oControlDomRef);
					}
				}
			},
			
			onComboBoxSelectionChange: function(oEvent) {
				
				var oSource = oEvent.getSource();
				var oCustomData = oSource.getCustomData()[0];
				var oListItem = oSource.getParent();
				var oBindObject = oListItem.getBindingContext().getObject();
		
//				var oAppModel = this.getModel("app");
//				var aItems = oAppModel.getProperty("/Detail/ArticleData/Items");
//				var oItem = {};
//				
//				var iIndex = aItems.findIndex(obj => obj.ItemId === oBindObject.ItemId);
//				if (iIndex >= 0){
//					aItems[iIndex][oCustomData.getValue()] = oEvent.getParameter("selectedItem").getKey();
//				} else {
//					oItem.ItemId = oBindObject.ItemId;
//					oItem[oCustomData.getValue()] = oEvent.getParameter("selectedItem").getKey();
//					aItems.push( oItem );
//				}
//				
//				oAppModel.refresh(true);
				
				this.saveChangedItemData({
					ItemId: oBindObject.ItemId,					
					Field: oCustomData.getValue(),
					Value: oEvent.getParameter("selectedItem").getKey()
				});
			},
			
			saveChangedItemData: function(oContext){
				
				var oAppModel = this.getModel("app");
				var aItems = oAppModel.getProperty("/Detail/ArticleData/Items");
				var oItem = {};
				
				var iIndex = aItems.findIndex(obj => obj.ItemId === oContext.ItemId);
				if (iIndex >= 0){
					aItems[iIndex][oContext.Field] = oContext.Value;
				} else {
					oItem.ItemId = oContext.ItemId;
					oItem[oContext.Field] = oContext.Value;
					aItems.push( oItem );
				}
				oAppModel.refresh(true);
			},			
			
			onTitleSelectorPress: function (oEvent) {
				if( this.isInProcess() ){
					//this.getModel("app").setProperty("/CmrRef", oEvent.getSource().getTitle());
					this.showCmrRefInputDialog();
				}
			},
			
			showCmrRefInputDialog: function (oEvent) {
				
				if (!this.oCmrRefChangeDialog) {
					
					this.oCmrRefChangeDialog = new sap.m.Dialog({
						type: sap.m.DialogType.Message,
						title: this.getResourceBundle().getText("Generel.TitleChangeCmrRef"),
						content: [
							new sap.m.Label({
								text: this.getResourceBundle().getText("Generel.MessageChangeCmrRef"),
								labelFor: "idCmrRefInput"
							}),
							new sap.m.Input("idCmrRefInput", {value: "{app>/Detail/Object/CmrRef}"})
						],
						beginButton: new sap.m.Button({
							type: sap.m.ButtonType.Emphasized,
							text: this.getResourceBundle().getText("General.Change"),
							press: function () {

								var oCheck = this.getModel("app").getProperty("/Master/Check");					
								oCheck.CmrRef = this.getModel("app").getProperty("/Detail/Object/CmrRef");
								oCheck.Aenam = this.getModel("app").getProperty("/Username");
								oCheck.Aedat = new Date();				
								if (oCheck){
									this.getView().setBusy(true);
									this._updateCheck(oCheck).then(function(oData){
										this.getView().setBusy(false);
									}.bind(this));
								}
								
								this.oCmrRefChangeDialog.close();
							}.bind(this)
						}),
						endButton: new sap.m.Button({
							text: this.getResourceBundle().getText("General.Cancel"),
							press: function () {
								this.oCmrRefChangeDialog.close();
							}.bind(this)
						})
					});
					
					this.getView().addDependent(this.oCmrRefChangeDialog);
				}

				this.oCmrRefChangeDialog.open();	
			},
			
			onRadioButtonGroupSelect: function(oEvent) {
			
				var oBindObject = oEvent.getSource().getBindingContext().getObject();				
				var oAppModel = this.getModel("app");
				var oCheck = oAppModel.getProperty("/Master/Check");
				
				// Hier kann oEvent.getParameter("selectedIndex") fuer Ja/Nein
				// verwendet werden,
				// da Button "Ja" an der Nullten Stelle und Button "Nein" an der
				// ersten Stelle steht und
				// unseren Komponation 0=Ja und 1=Nein genau passt!
				
				oCheck.CheckId = oBindObject.CheckId;
				oCheck[oEvent.getSource().data("Name")] = oEvent.getParameter("selectedIndex").toString();								
				oAppModel.refresh(true);
			},
			
			onComboBoxSelectionChange1: function(oEvent) {
				
				var oBindObject = oEvent.getSource().getBindingContext().getObject();				
				var oAppModel = this.getModel("app");
				var oCheck = oAppModel.getProperty("/Master/Check");
				
				// Hier kann oEvent.getParameter("selectedIndex") fuer Ja/Nein
				// verwendet werden,
				// da Button "Ja" an der Nullten Stelle und Button "Nein" an der
				// ersten Stelle steht und
				// unseren Komponation 0=Ja und 1=Nein genau passt!
				
				oCheck.CheckId = oBindObject.CheckId;
				oCheck[oEvent.getSource().data("Name")] = oEvent.getParameter("selectedItem").getKey();								
				oAppModel.refresh(true);
			},
			
			onCommentButtonPress: function(oEvent) {
				
				var oBundle = this.getModel("i18n").getResourceBundle();
				
				var oBindObject = oEvent.getSource().getBindingContext().getObject();				
				var oAppModel = this.getModel("app");
				var oCheck = oAppModel.getProperty("/Master/Check");				
				oCheck.CheckId = oBindObject.CheckId;
				var sAttributeName = oEvent.getSource().data("Name");
				
				Helper.getReasonDialog({
					bundle: oBundle,
		    		initValue : oCheck[sAttributeName],
		    		source : oEvent.getSource(),
		    		abort : function(oSource) {
		    		}.bind(this),
		    		success : function(oSource, sReasonText) {
		    			oCheck[sAttributeName] = sReasonText;
		    			oAppModel.refresh(true);
		    		}.bind(this),
		    		title : oBundle.getText("Detail.Comment"),
		    		text : oBundle.getText("Detail.Comment")
		    	}).open();
				
			},
			
			onPrintPress: function(oEvent) {	
				
				var oData = this.getModel("app").getData();				
				this._printCheck({
					Printer: "IHEM", // Wird in Benutzerstamm gelesen.
										// Tabelle usr01, Feld spld
					CheckId: oData.Master.Check.CheckId,
					Language: sap.ui.getCore().getConfiguration().getLanguage()
				}).then(function(oData) {
					sap.m.MessageBox.show(							
							this.getResourceBundle().getText("Detail.PringDone"), {
								icon: sap.m.MessageBox.Icon.INFORMATION,
								title: "Print",
								actions: [sap.m.MessageBox.Action.OK],
								onClose: function(oAction) { / * do something * / }
							}
						);
				}.bind(this));
			},
			
			onEditPress: function(oEvent) {
				this.setInProcess(true);
				
				var oBindObject = this.getView().getBindingContext().getObject();
				this.setPOmustBeCompleted(oBindObject ? oBindObject.State : "00");				
			},
			
			onSavePress: function(oEvent) {
			
				var oCheck = this.getModel("app").getProperty("/Master/Check");
				var oInput = this.getView().byId("idStateCommentInput");
				
//				var sNewCmrRef = this.getModel("app").getProperty("/CmrRef");
//				if( sNewCmrRef ){
//					oCheck.CmrRef = sNewCmrRef;
//				}
			
				oCheck.StateCom = oInput.getValue();
				oCheck.Aenam = this.getModel("app").getProperty("/Username");
				oCheck.Aedat = new Date();

				var oRadioGeodataCrct = this.getView().byId("idRadioGeodataCrct"); 
				var oRadioAccordance = this.getView().byId("idRadioAccordance");
				
				oCheck.Accordance = oRadioAccordance.getSelectedButton().getCustomData()[0].getValue();
				oCheck.GeodataCrct = oRadioGeodataCrct.getSelectedButton().getCustomData()[0].getValue();
				
				if (oCheck){
					this._updateCheck(oCheck).then(function(oData){
						this.getModel("app").setProperty("/CmrRef", "");						
						this.setPOmustBeCompleted(oData.State);
					}.bind(this));
				}
				
				this._updateDocItem(); 
				
				this.setInProcess(false);
			},		
			
			onFlagPress: function(oEvent) {
				this.onUserDialog();
			},
			
			onMessagesButtonPress:function(oEvent){			
			    this._getMessagePopover(this.getView()).openBy(oEvent.getSource());
			},
			
			onUpdatePOItemsPress: function(oPressEvent){
				this.getView().setBusy(true);
				this._readPOItems(
						this.getModel("app").getProperty("/Detail/POData/List"),
						function(aPOItems){
							this.getView().setBusy(false);
							this.getModel("app").setProperty("/Detail/POData/Items", aPOItems);							
						}.bind(this)
				);
			},	
			
			onProblemCheckStatePress: function(oPressEvent){	
			   
				var oBindObject = oPressEvent.getSource().getBindingContext().getObject();
		    	var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
		    	var oAppModel = this.getModel("app");
		    	var oCheck = oAppModel.getProperty("/Master/Check");
		    	oCheck.CheckId = oBindObject.CheckId;
		    	var sAttributeName = oPressEvent.getSource().data("Name");
		    	
				Helper.getReasonListDialog({
					bundle: oBundle,
					multiSelect: true,
					collect: true, 
					//selectedKey: this.getView().getModel("app").getProperty("/WrongAvis/Reason/key"),
					//initValue: this.getView().getModel("app").getProperty("/WrongAvis/Reason/Other"),
					field: "05", // Feld: Grund (WE nicht korrekt), Siehe Definition Gründe: ZPHA_GR_REASONS
					title: oBundle.getText("GoodsPostingData.ProblemReasonTitle"),
					model: this.getView().getModel(),
					fnConfirm: function(oData) {
	
						oCheck[sAttributeName] = oData.reasonText + (oData.text ? ": " + oData.text: "");
		    			oAppModel.refresh(true);
		    			
		    			this._updateCheck({ 
							CheckId: this.getModel("app").getProperty("/Detail/Object/CheckId"),					
							State: "48", // WE nicht vollständig
							StateDate: new Date(),
							StateReason: oCheck[sAttributeName]
						}).then(function(oData){
							this.getModel().refresh(true);
							this.setPOmustBeCompleted(oData.State);
						}.bind(this));
					}.bind(this)
				}).open();			        
			},
			
			onSaveCheckStatePress: function(oPressEvent){
				this._updateCheck({ 
					CheckId: this.getModel("app").getProperty("/Detail/Object/CheckId"),					
					State: "49", // WE vollständig
					StateReason: "",
					StateDate: new Date()
				}).then(function(oData){
					this.setPOmustBeCompleted(oData.State);
				}.bind(this));
			},
			
			onPOListDeletion: function(oDeletionEvent){
				var oDeletObject = oDeletionEvent.getParameter("listItem").getBindingContext("app").getObject();
				var aObjectList = this.getModel("app").getProperty("/Detail/POData/List");
				var iIndex = aObjectList.findIndex(obj => obj.PONumber == oDeletObject.PONumber);
				aObjectList.splice(iIndex, 1);
				this.getModel("app").refresh();
			},	
			
			onPOListSelectionChange: function(oSelectionEvent){			
				var oChangedObject = oSelectionEvent.getParameter("changedItem");
				var bSelected = oSelectionEvent.getParameter("selected");
				if(!bSelected){					
					this._removePONumber(oChangedObject.getKey());
				}
			},


			/* =========================================================== */
			/* event handlers */
			/* =========================================================== */

			/**
			 * Event handler when the share by E-Mail button has been clicked
			 * 
			 * @public
			 */
			onShareEmailPress : function () {
				var oViewModel = this.getModel("detailView");

				sap.m.URLHelper.triggerEmail(
					null,
					oViewModel.getProperty("/shareSendEmailSubject"),
					oViewModel.getProperty("/shareSendEmailMessage")
				);
			},

			/**
			 * Event handler when the share in JAM button has been clicked
			 * 
			 * @public
			 */
			onShareInJamPress : function () {
				var oViewModel = this.getModel("detailView"),
					oShareDialog = sap.ui.getCore().createComponent({
						name : "sap.collaboration.components.fiori.sharing.dialog",
						settings : {
							object :{
								id : location.href,
								share : oViewModel.getProperty("/shareOnJamTitle")
							}
						}
					});

				oShareDialog.open();
			},

			/**
			 * Updates the item count within the line item table's header
			 * 
			 * @param {object}
			 *            oEvent an event containing the total number of items
			 *            in the list
			 * @private
			 */
			onListUpdateFinished : function (oEvent) {
				
				var sTitle,
					iTotalItems = oEvent.getParameter("total"),
					oViewModel = this.getModel("detailView");
				
				var oItemsTable = this.byId("lineItemsList");
				
				// only update the counter if the length is final
				if (oItemsTable.getBinding("items").isLengthFinal()) {
					if (iTotalItems) {
						sTitle = this.getResourceBundle().getText("detailLineItemTableHeadingCount", [iTotalItems]);
					} else {
						// Display 'Line Items' instead of 'Line items (0)'
						sTitle = this.getResourceBundle().getText("detailLineItemTableHeading");
					}
					oViewModel.setProperty("/lineItemListTitle", sTitle);					
				}
			},
			
			onPOListUpdateFinished : function (oEvent) {
				
				var sTitle,
					iTotalItems = oEvent.getParameter("total"),
					oViewModel = this.getModel("detailView");
				
				var oItemsTable = this.byId("idPOItemsList");
				
				// only update the counter if the length is final
				if (oItemsTable.getBinding("items").isLengthFinal()) {
					if (iTotalItems) {
						sTitle = this.getResourceBundle().getText("GoodsPostingData.POItemTableHeadingCount", [iTotalItems]);
					} else {
						// Display 'Line Items' instead of 'Line items (0)'
						sTitle = this.getResourceBundle().getText("GoodsPostingData.POItemTableHeading");
					}
					oViewModel.setProperty("/POItemListTitle", sTitle);					
				}
			},

			/* =========================================================== */
			/* begin: internal methods */
			/* =========================================================== */

			/**
			 * Binds the view to the object path and expands the aggregated line
			 * items.
			 * 
			 * @function
			 * @param {sap.ui.base.Event}
			 *            oEvent pattern match event in route 'object'
			 * @private
			 */
			_onObjectMatched : function (oEvent) {
				
				this.registerMassageManager(this.getView());
				this.getView().setBusy(false);
//				
//				 this.getModel().attachRequestFailed(function(oEvent) {
//					 var oParams = oEvent.getParameters("message");			
//			         this._showServiceError(oParams.response);
//				 }, this);
				
				var sObjectId =  oEvent.getParameter("arguments").objectId;
				this.getModel().metadataLoaded().then( function() {
					
					var sObjectPath = this.getModel().createKey("CheckSet", {
						CheckId :  sObjectId
					});
					
					this._bindView("/" + sObjectPath);
					this.getModel("app").setProperty("/Master/Check", {CheckId: sObjectId});
					
				}.bind(this));
								
			},

			/**
			 * Binds the view to the object path. Makes sure that detail view
			 * displays a busy indicator while data for the corresponding
			 * element binding is loaded.
			 * 
			 * @function
			 * @param {string}
			 *            sObjectPath path to the object to be bound to the
			 *            view.
			 * @private
			 */
			_bindView : function (sObjectPath) {
				
				// Set busy indicator during view binding
				var oViewModel = this.getModel("detailView");

				// If the view was not bound yet its not busy, only if the
				// binding requests data it is set to busy again
				oViewModel.setProperty("/busy", false);

				this.getView().bindElement({
					path : sObjectPath,
					events: {
						change : this._onBindingChange.bind(this),
						dataRequested : function () {
							oViewModel.setProperty("/busy", true);
						},
						dataReceived: function (oContext) {
							oViewModel.setProperty("/busy", false);							
						}.bind(this)
					}
				});
			},

			_onBindingChange : function () {
											
					var oView = this.getView(),
						oElementBinding = oView.getElementBinding();
	
					// No data for the binding
					if (!oElementBinding.getBoundContext()) {
						
						this.getRouter().getTargets().display("detailObjectNotFound");
						// if object could not be found, the selection in the
						// master
						// list
						// does not make sense anymore.
						this.getOwnerComponent().oListSelector.clearMasterListSelection();
						return;
					}
	
					var sPath = oElementBinding.getPath(),
						oResourceBundle = this.getResourceBundle(),
						oObject = oView.getModel().getObject(sPath),
						sObjectId = oObject.CheckId,
						sObjectName = oObject.CmrRef,
						oViewModel = this.getModel("detailView");
					
					this.getModel().setHeaders({ mandt: oObject.Client });
					this.getModel("app").setProperty("/Detail/Object", oObject);
					
					this._bindRoughGR(oObject);
					this._bindTemperature(oObject);
					this._bindReasonText(oObject);
					this._bindLogger(oObject);
					this._bindPO(oObject);
					this._bindDocItems(oObject);
	
					this.getOwnerComponent().oListSelector.selectAListItem(sPath);
	
					oViewModel.setProperty("/saveAsTileTitle",oResourceBundle.getText("shareSaveTileAppTitle", [sObjectName]));
					oViewModel.setProperty("/shareOnJamTitle", sObjectName);
					oViewModel.setProperty("/shareSendEmailSubject",
						oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
					oViewModel.setProperty("/shareSendEmailMessage",
						oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
				
			},
			
			_bindDocItems: function(oObject){		
				this.getModel("app").setProperty("/Detail/ArticleData/Items",[]);
			},
			
			_bindPO: function(oObject){				
				this.getModel("app").setProperty("/Detail/POData/Nummer", []);
				this.getModel("app").setProperty("/Detail/POData/List", []);
				this.getModel("app").setProperty("/Detail/POData/Items", []);				
				this.getModel("app").setProperty("/Detail/POData/SelectedInList", []);
				
				this.setPOmustBeCompleted(oObject.State);
			},
			
			setPOmustBeCompleted: function(sState){		
				if(sState){
					if(parseInt(sState, 10) >= 49){
						this.getModel("app").setProperty("/POmustBeCompleted", false);					
					} else {
						this.getModel("app").setProperty("/POmustBeCompleted", true);	
					}
				}
			},			
			
			_bindRoughGR: function(oObject) {	
				
				if(oObject.Zgweno){
					var oModel = this.getView().getModel();
					
					var sPath = oModel.createKey("/RoughGRSet", {
						Zgweno: oObject.Zgweno		  
					});
					
					var oModel = this.getModel();
					oModel.read(sPath, {
						success: function(oResult) {
							this.oView.setModel(new JSONModel({							
								Standort: oResult.Zbetrst
							}), "roughGR");
						}.bind(this)
					});
				}
			},
			
			_bindTemperature: function(oObejct) {
				
				this.oView = this.getView();
				this.oData = oObejct;	
				var oModel = this.getModel();
				oModel.read("/DomainValueSet", {
					filters: [new Filter("Name", FilterOperator.EQ, "ZPHA_GR_TEMP_RANGE")],
					success: function(oResult) {
						if (oResult.results.length > 0){
							
							var oTemperature0 = oResult.results.find(function(e) { 
								  return e.Value === this.oData.Temperature0; 
							}.bind(this));	
							
							var oTemperature1 = oResult.results.find(function(e) { 
								  return e.Value === this.oData.Temperature1; 
							}.bind(this));	
							
							var oTemperature2 = oResult.results.find(function(e) { 
								  return e.Value === this.oData.Temperature2; 
							}.bind(this));	
							
							var oTemperature3 = oResult.results.find(function(e) { 
								  return e.Value === this.oData.Temperature3; 
							}.bind(this));	
							
							var oTemperature4 = oResult.results.find(function(e) { 
								  return e.Value === this.oData.Temperature4; 
							}.bind(this));	
																		
							this.oView.setModel(new JSONModel({								
								Temperature0Text: oTemperature0 ? oTemperature0.Text : "",
								Temperature1Text: oTemperature1 ? oTemperature1.Text : "",
								Temperature2Text: oTemperature2 ? oTemperature2.Text : "",
								Temperature3Text: oTemperature3 ? oTemperature3.Text : "",
								Temperature4Text: oTemperature4 ? oTemperature4.Text : "",
								TemperatureCom: this.oData.TemperatureCom,		
							}), "info");
							
						}
						
					}.bind(this)
				});
			},
			
			_bindLogger: function(oObejct) {
				
				var oModel = this.getView().getModel();
				
				var sPath = oModel.createKey("/CheckSet", {
						CheckId: oObejct.CheckId		  
				});
				
				var oItemTemplate = new sap.m.Label({					
					text: "{SerialNumber}",
					design: "Bold"
				});
				
				var oFlexBox = this.getView().byId("idTemperatureLoggerFlexBox");
				oFlexBox.bindAggregation("items", {					
					path: sPath + "/LoggerSerialSet",
					template: oItemTemplate,
				});
			},
			
			_bindReasonText: function(oObject) {
				
				this.oView = this.getView();
				this.oData = oObject;	
				var oModel = this.getModel();
				
			    var aFilters = [new sap.ui.model.Filter("Language", "EQ", sap.ui.getCore().getConfiguration().getLanguage())];		 
				
				oModel.read("/ReasonSet", {
					filters: aFilters,
					success: function(oResult) {
						
						if (oResult.results.length > 0){
							
							var oExistPlombCom = oResult.results.find(function(e) { 
								  return e.Field === '01' && e.Number === this.oData.ExistPlombCom; 
								}.bind(this));
							
							var oExistColliSttCom = oResult.results.find(function(e) { 
								  return e.Field === '02' && e.Number === this.oData.ExistColliSttCom; 
								}.bind(this)); 
							
							var oPalettHtCom0 = oResult.results.find(function(e) { 
								  return e.Field === '03' && e.Number === this.oData.PalettHtCom0; 
							}.bind(this)); 
							
							var oPalettHtCom1 = oResult.results.find(function(e) { 
								  return e.Field === '03' && e.Number === this.oData.PalettHtCom1; 
							}.bind(this)); 
							
							var oPalettHtCom2 = oResult.results.find(function(e) { 
								  return e.Field === '03' && e.Number === this.oData.PalettHtCom2; 
							}.bind(this)); 
							
							var oPalettHtCom3 = oResult.results.find(function(e) { 
								  return e.Field === '03' && e.Number === this.oData.PalettHtCom3; 
							}.bind(this)); 
							
							var oPalettHtCom4 = oResult.results.find(function(e) { 
								  return e.Field === '03' && e.Number === this.oData.PalettHtCom4; 
							}.bind(this)); 
																						
							this.oView.setModel(new JSONModel({
								ExistPlombComText: oExistPlombCom ? oExistPlombCom.Text : "",
								ExistColliSttComText: oExistColliSttCom ? oExistColliSttCom.Text : "",
								PalettHtCom0Text: oPalettHtCom0 ? oPalettHtCom0.Text : "",
								PalettHtCom1Text: oPalettHtCom1 ? oPalettHtCom1.Text : "",
								PalettHtCom2Text: oPalettHtCom2 ? oPalettHtCom2.Text : "",
								PalettHtCom3Text: oPalettHtCom3 ? oPalettHtCom3.Text : "",
								PalettHtCom4Text: oPalettHtCom4 ? oPalettHtCom4.Text : ""
							}), "detail");
							
						}
						
					}.bind(this)
				});
				
			},

			_onMetadataLoaded : function () {
				
				// Store original busy indicator delay for the detail view
				var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
					oViewModel = this.getModel("detailView"),
					oLineItemTable = this.byId("lineItemsList"),
					iOriginalLineItemTableBusyDelay = oLineItemTable.getBusyIndicatorDelay();

				// Make sure busy indicator is displayed immediately when
				// detail view is displayed for the first time
				oViewModel.setProperty("/delay", 0);
				oViewModel.setProperty("/lineItemTableDelay", 0);

				oLineItemTable.attachEventOnce("updateFinished", function() {
					// Restore original busy indicator delay for line item table
					oViewModel.setProperty("/lineItemTableDelay", iOriginalLineItemTableBusyDelay);
				});

				// Binding the view will set it to not busy - so the view is
				// always busy if it is not bound
				oViewModel.setProperty("/busy", true);
				// Restore original busy indicator delay for the detail view
				oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
			}

		});

	}
);