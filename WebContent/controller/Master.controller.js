/*global history */
sap.ui.define([
		"de/arvato/GRModul04/controller/BaseController",
		"sap/ui/model/json/JSONModel",
		"sap/ui/core/routing/History",
		"sap/ui/core/Fragment",
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator",
		"sap/m/GroupHeaderListItem",
		"sap/ui/Device",
		"de/arvato/GRModul04/model/formatter"
	], function (BaseController, JSONModel, History, Fragment, Filter, FilterOperator, GroupHeaderListItem, Device, formatter) {
		"use strict";

		return BaseController.extend("de.arvato.GRModul04.controller.Master", {

			formatter: formatter,

			/* =========================================================== */
			/* lifecycle methods                                           */
			/* =========================================================== */

			/**
			 * Called when the master list controller is instantiated. It sets up the event handling for the master/detail communication and other lifecycle tasks.
			 * @public
			 */
			onInit : function () {
				 
				// Control state model
				var oList = this.byId("list"),
					oViewModel = this._createViewModel(),
					// Put down master list's original value for busy indicator delay,
					// so it can be restored later on. Busy handling on the master list is
					// taken care of by the master list itself.
					iOriginalBusyDelay = oList.getBusyIndicatorDelay();


				this._oList = oList;
				// keeps the filter and search state
				this._oListFilterState = {
					aFilter : [],
					aSearch : []
				};

				this.setModel(oViewModel, "masterView");
				// Make sure, busy indication is showing immediately so there is no
				// break after the busy indication for loading the view's meta data is
				// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
				oList.attachEventOnce("updateFinished", function(){
					// Restore original busy indicator delay for the list
					oViewModel.setProperty("/delay", iOriginalBusyDelay);
				});

				this.getView().addEventDelegate({
					onBeforeFirstShow: function () {
						this.getOwnerComponent().oListSelector.setBoundMasterList(oList);
						this.onUserDialog(function(){
							 var oLocationComboBox = this.getView().byId("idLocationComboBox");							 	
							 oLocationComboBox.setSelectedItem(oLocationComboBox.getItemAt(0));
							 this.onDetailSearch();
							 oLocationComboBox.fireEvent("selectionChange", {
								    selectedItem : oLocationComboBox.getSelectedItem()
								});
						}.bind(this));
					}.bind(this)
				});

				
				this.getRouter().getRoute("master").attachPatternMatched(this._onMasterMatched, this);
				this.getRouter().attachBypassed(this.onBypassed, this);
				
				
				//this.onUserDialog();
				
			},

			/* =========================================================== */
			/* event handlers                                              */
			/* =========================================================== */

			/**
			 * After list data is available, this handler method updates the
			 * master list counter and hides the pull to refresh control, if
			 * necessary.
			 * @param {sap.ui.base.Event} oEvent the update finished event
			 * @public
			 */
			onUpdateFinished : function (oEvent) {
				// update the master list object counter after new data is loaded
				this._updateListItemCount(oEvent.getParameter("total"));
				// hide pull to refresh if necessary
				this.byId("pullToRefresh").hide();
			},

			/**
			 * Event handler for the master search field. Applies current
			 * filter value and triggers a new search. If the search field's
			 * 'refresh' button has been pressed, no new search is triggered
			 * and the list binding is refresh instead.
			 * @param {sap.ui.base.Event} oEvent the search event
			 * @public
			 */
			onSearch : function (oEvent) {
				
				if (oEvent.getParameters().refreshButtonPressed) {
					// Search field's 'refresh' button has been pressed.
					// This is visible if you select any master list item.
					// In this case no new search is triggered, we only
					// refresh the list binding.
					this.onRefresh();
					return;
				}					
				
//				var aSelectionSet = oEvent.getParameter("selectionSet");
//				if (aSelectionSet) {
//					
//					aSelectionSet.forEach( function(oItem, iIndex, aArray){
//						if (oItem.bOutput){
//							var oValue = oItem.getValue();
//						}
//					});
//					
//					this._oListFilterState.aSearch = [new Filter("CmrRef", FilterOperator.Contains, sQuery)];
//				} else {
//					this._oListFilterState.aSearch = [];
//				}
				

				var sQuery = oEvent.getParameter("query");

				if (sQuery) {
					this._oListFilterState.aSearch = [new Filter("CmrRef", FilterOperator.Contains, sQuery)];
				} else {
					this._oListFilterState.aSearch = [];
				}
				
				this._applyFilterSearch();

			},
			
			onLocationComboBoxSelectionChange: function(oEvent){
				var oSelectedItem = oEvent.getParameter("selectedItem");
				if (oSelectedItem){
					var sLocID = oEvent.getParameter("selectedItem").getKey();
					var sLgnum = this.getModel("app").getProperty("/Lgnum");
					this.getView().setBusy(true);
					this._readClient(sLocID, sLgnum, function(aClients) {
						this.getModel("app").setProperty("/SapClients", aClients);
						this.getView().setBusy(false);
					}.bind(this));
				}
			},
			
			onDetailSearch: function(oEvetn) {
				
				var sSearch = "";
				var aFilterItems = this.byId("idCmrFilterBar").getAllFilterItems(true);
				this._oListFilterState.aSearch = [];
			
				aFilterItems.forEach( function(oItem, iIndex, aArray){
					
					switch (oItem.getName()) {
					case "GROBWE":
						var oControl = this.getView().byId("idGrobWEInput");						
						sSearch = oControl.getValue();
						if (sSearch.length > 0){		
							sSearch = sSearch.toUpperCase();
							this._oListFilterState.aSearch.push(new Filter("Zgweno", FilterOperator.Contains, sSearch));
						}
						
						break;
					
					 case "CMRREF":
						var oControl = this.getView().byId("idCmrRefInput");						
						sSearch = oControl.getValue();
						if (sSearch.length > 0){		
							sSearch = sSearch.toUpperCase();
							this._oListFilterState.aSearch.push(new Filter("CmrRef", FilterOperator.Contains, sSearch));
						}
						
						break;
					  case "PRIO":
					    break;
					  case "STATE":		
						  var oControl = this.getView().byId("idStateComboBox");	
						  sSearch = oControl.getProperty("selectedKey");
						  if (sSearch.length > 0){
							  this._oListFilterState.aSearch.push(new Filter("State", FilterOperator.EQ, sSearch));
						  }
						break;
					  case "DATE":	
						var oControl = this.getView().byId("idDateDateRangeSelection");	
						var sSearchFrom = oControl.getProperty("dateValue");
						var sSearchTo = oControl.getProperty("secondDateValue");
						if (sSearchFrom !== null){
							//var timezoneOffset = new Date().getTimezoneOffset();
							var oDateFrom = new Date();
							var oDateTo = new Date();
							
							var oTempFrom = new Date(sSearchFrom);
							var oTempTo = new Date(sSearchTo);
							
							oDateFrom.setDate(oTempFrom.getDate());
							oDateFrom.setMonth(oTempFrom.getMonth());
							oDateFrom.setYear(oTempFrom.getFullYear());
							
							oDateTo.setDate(oTempTo.getDate());
							oDateTo.setMonth(oTempTo.getMonth());
							oDateTo.setYear(oTempTo.getFullYear());
							
							//oDate.setTime(oDate.getTime() + timezoneOffset);	
							this._oListFilterState.aSearch.push(new Filter("Erdat", FilterOperator.BT, oDateFrom.toUTCString(), oDateTo.toUTCString()));
						}
					    break;
					  case "MANDANT":	
						  var oControl = this.getView().byId("idMandantComboBox");	
						sSearch = oControl.getProperty("selectedKey");
						if (sSearch.length > 0) {
							this._oListFilterState.aSearch.push(new Filter("Client", FilterOperator.EQ, sSearch));
						}
					    break;
					    
					  case "LOCATION":
						  
						  var oInputFilter;
						  var oControl = this.getView().byId("idLocationComboBox");
						  var aLocationFilters = this.getLocationFilters(oControl);						  
						  sSearch = oControl.getProperty("selectedKey");						 
						  if (sSearch.length > 0) {							 
						  }
						  // Feld: Zbetrst nur temporär in ZPHA_GR_CHECK eingebaut, damit Suche funktioniert
						  // Auf Odata-Seite wird mit dem Wert zusätzlich gefiltert							  
						  oInputFilter = new sap.ui.model.Filter({
							  filters: aLocationFilters,
							  and: false
							});
						  
						  this._oListFilterState.aSearch.push(oInputFilter);
						  break;						  
					  case "TEMPERATURE":
						  
						  var oControl = this.getView().byId("idTemperatureComboBox");	
						  sSearch = oControl.getProperty("selectedKey");
						  if (sSearch.length > 0) {
							  
							  var oInputFilter = new sap.ui.model.Filter({
								  filters: [
									  new Filter("Temperature0", FilterOperator.EQ, sSearch),
									  new Filter("Temperature1", FilterOperator.EQ, sSearch),
									  new Filter("Temperature2", FilterOperator.EQ, sSearch),
									  new Filter("Temperature3", FilterOperator.EQ, sSearch),
									  new Filter("Temperature4", FilterOperator.EQ, sSearch)
								  ],
								  and: false
								});
							  
								this._oListFilterState.aSearch.push(oInputFilter);
							}
						  break;
					  default:
					    break;
					}
				}.bind(this));
				
				this._applyFilterSearch();
			},
			
			getLocationFilters: function(oControl){				
				var aLocationFilters = [];
				if (oControl){
					oControl.getItems().forEach(function(oItem) {
						aLocationFilters.push(new Filter("Zbetrst", FilterOperator.EQ, oItem.getProperty("key")));		
					});					
				}
				
				return aLocationFilters;
			},

			/**
			 * Event handler for refresh event. Keeps filter, sort
			 * and group settings and refreshes the list binding.
			 * @public
			 */
			onRefresh : function () {
				this._oList.getBinding("items").refresh();
			},



			/**
			 * Event handler for the list selection event
			 * @param {sap.ui.base.Event} oEvent the list selectionChange event
			 * @public
			 */
			onSelectionChange : function (oEvent) {
				
				if(this.isInProcess()){
					sap.m.MessageToast.show("Bitte erst die Änderungen speichern!", {
						at: "center center",    
					});
				} else {				
					// get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
					this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
				}
			},

			/**
			 * Event handler for the bypassed event, which is fired when no routing pattern matched.
			 * If there was an object selected in the master list, that selection is removed.
			 * @public
			 */
			onBypassed : function () {
				this._oList.removeSelections(true);
			},
			
			/**
			 * Event handler for the filter, sort and group buttons to open the ViewSettingsDialog.
			 * @param {sap.ui.base.Event} oEvent the button press event
			 * @public
			 */
			onOpenViewSettings : function (oEvent) {
				var sDialogTab = "filter";
				if (oEvent.getSource() instanceof sap.m.Button) {
					var sButtonId = oEvent.getSource().getId();
					if (sButtonId.match("sort")) {
						sDialogTab = "sort";
					} else if (sButtonId.match("group")) {
						sDialogTab = "group";
					}
				}
				// load asynchronous XML fragment
				if (!this.byId("viewSettingsDialog")) {
					Fragment.load({
						id: this.getView().getId(),
						name: "de.arvato.GRModul04.view.ViewSettingsDialog",
						controller: this
					}).then(function(oDialog){
						// connect dialog to the root view of this component (models, lifecycle)
						this.getView().addDependent(oDialog);
						oDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
						oDialog.open(sDialogTab);
					}.bind(this));
				} else {
					this.byId("viewSettingsDialog").open(sDialogTab);
				}
			},

			/**
			 * Used to create GroupHeaders with non-capitalized caption.
			 * These headers are inserted into the master list to
			 * group the master list's items.
			 * @param {Object} oGroup group whose text is to be displayed
			 * @public
			 * @returns {sap.m.GroupHeaderListItem} group header with non-capitalized caption.
			 */
			createGroupHeader : function (oGroup) {
				return new GroupHeaderListItem({
					title : oGroup.text,
					upperCase : false
				});
			},

			/**
			 * Event handler for navigating back.
			 * It there is a history entry or an previous app-to-app navigation we go one step back in the browser history
			 * If not, it will navigate to the shell home
			 * @public
			 */
			onNavBack : function() {
				var sPreviousHash = History.getInstance().getPreviousHash(),
					oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

				if (sPreviousHash !== undefined || !oCrossAppNavigator.isInitialNavigation()) {
					history.go(-1);
				} else {
					oCrossAppNavigator.toExternal({
						target: {shellHash: "#Shell-home"}
					});
				}
			},

			/* =========================================================== */
			/* begin: internal methods                                     */
			/* =========================================================== */


			_createViewModel : function() {
				
				return new JSONModel({
					isFilterBarVisible: false,
					filterBarLabel: "",
					delay: 0,
					title: this.getResourceBundle().getText("masterTitleCount", [0]),
					noDataText: this.getResourceBundle().getText("masterListNoDataText"),
					sortBy: "CmrRef",
					groupBy: "None"
				});
			},
			
			onCheckListUpdateFinished: function(oEvent){

				var sTitle,
					iTotalItems = oEvent.getParameter("total"),
					oViewModel = this.getModel("masterView");
			
				var oItemsList = this.byId("list");
			
				// only update the counter if the length is final
				if (oItemsList.getBinding("items").isLengthFinal()) {
					if (iTotalItems) {
						sTitle = this.getResourceBundle().getText("masterTitleCount", [iTotalItems]);
					} else {
						// Display 'Line Items' instead of 'Line items (0)'
						sTitle = this.getResourceBundle().getText("masterTitleCount");
					}
					oViewModel.setProperty("/title", sTitle);					
				}
			},

			/**
			 * If the master route was hit (empty hash) we have to set
			 * the hash to to the first item in the list as soon as the
			 * listLoading is done and the first item in the list is known
			 * @private
			 */
			_onMasterMatched :  function() {
				
				this.getOwnerComponent().oListSelector.oWhenListLoadingIsDone.then(
					function (mParams) {
						if (mParams.list.getMode() === "None") {
							return;
						}
						var sObjectId = mParams.firstListitem.getBindingContext().getProperty("CheckId");
						this.getRouter().navTo("object", {objectId : sObjectId}, true);
					}.bind(this),
					function (mParams) {
						if (mParams.error) {
							return;
						}
						this.getRouter().getTargets().display("detailNoObjectsAvailable");
					}.bind(this)
				);
			},

			/**
			 * Shows the selected item on the detail page
			 * On phones a additional history entry is created
			 * @param {sap.m.ObjectListItem} oItem selected Item
			 * @private
			 */
			_showDetail : function (oItem) {
				var bReplace = !Device.system.phone;
				this.getRouter().navTo("object", {
					objectId : oItem.getBindingContext().getProperty("CheckId")
				}, bReplace);
			},

			/**
			 * Sets the item count on the master list header
			 * @param {integer} iTotalItems the total number of items in the list
			 * @private
			 */
			_updateListItemCount : function (iTotalItems) {
				var sTitle;
				// only update the counter if the length is final
				if (this._oList.getBinding("items").isLengthFinal()) {
					sTitle = this.getResourceBundle().getText("masterTitleCount", [iTotalItems]);
					this.getModel("masterView").setProperty("/title", sTitle);
				}
			},

			/**
			 * Internal helper method to apply both filter and search state together on the list binding
			 * @private
			 */
			_applyFilterSearch : function () {
				var aFilters = this._oListFilterState.aSearch.concat(this._oListFilterState.aFilter),
					oViewModel = this.getModel("masterView");
				this._oList.getBinding("items").filter(aFilters, "Application");
				// changes the noDataText of the list in case there are no filter results
				if (aFilters.length !== 0) {
					oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataWithFilterOrSearchText"));
				} else if (this._oListFilterState.aSearch.length > 0) {
					// only reset the no data text to default when no new search was triggered
					oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataText"));
				}
			},

			/**
			 * Internal helper method to apply both group and sort state together on the list binding
			 * @param {sap.ui.model.Sorter[]} aSorters an array of sorters
			 * @private
			 */
			_applyGroupSort : function (aSorters) {
				this._oList.getBinding("items").sort(aSorters);
			},

			/**
			 * Internal helper method that sets the filter bar visibility property and the label's caption to be shown
			 * @param {string} sFilterBarText the selected filter value
			 * @private
			 */
			_updateFilterBar : function (sFilterBarText) {
				var oViewModel = this.getModel("masterView");
				oViewModel.setProperty("/isFilterBarVisible", (this._oListFilterState.aFilter.length > 0));
				oViewModel.setProperty("/filterBarLabel", this.getResourceBundle().getText("masterFilterBarText", [sFilterBarText]));
			}

		});

	}
);