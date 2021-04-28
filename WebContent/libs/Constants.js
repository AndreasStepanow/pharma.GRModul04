sap.ui.define(["sap/ui/model/json/JSONModel"], function(JSONModel) {
    'use strict';
    
    return {
    	LENGTH_OF_COMMENTS: 58,
    	LENGTH_OF_REASON: 200,
    	LENGTH_OF_BATCH: 10,
    	init: function(oComponent){
    		oComponent.setModel(new JSONModel(this), "const");
    	}
    };

});