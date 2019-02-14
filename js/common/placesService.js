(function() {
'use strict';

	/**
	 * Search Service
	 */
	 
	angular.module('app').factory('placesService', ['$http', function ($http) {
		var baseHref,
			token;
		
		//****************************************************************
    	//***********************   HELPER METHODS   *********************
    	//****************************************************************
    	
		function formatDateForDb(date){
			var d = new Date(date),
		        month = '' + (d.getMonth() + 1),
		        day = '' + d.getDate(),
		        year = d.getFullYear();
		    if (month.length < 2) month = '0' + month;
		    if (day.length < 2) day = '0' + day;
		    return [year, month, day].join('-');		
		}
	
		//****************************************************************
    	//***********************   END HELPER METHODS   *****************
    	//****************************************************************
    	
		var dataFactory = {};
		
		dataFactory.init	= function(_baseHref,_token){
			console.log("placesServices init("+_baseHref+","+_token+")");
			baseHref		= _baseHref;
			token			= _token;
		}

		//gets street num by ID
		dataFactory.getStreetNum	= function(id){
			var vars2send 			= {};
			vars2send.id			= id;
			vars2send.what			= "STREET_NUM";
			vars2send.token			= token;
			return $http.post(baseHref+'ajax.places.php', vars2send).then(function(response){
				return response.data;
    		});
		}

		//gets cataster by reference
		dataFactory.getCatasterRef	= function(id){
			var vars2send 			= {};
			vars2send.id			= id;
			vars2send.what			= "CATASTER_REF";
			vars2send.token			= token;
			return $http.post(baseHref+'ajax.places.php', vars2send).then(function(response){
				return response.data;
    		});
		}

		//gets cataster by reference
		dataFactory.getCatasterRefFromPoligon = function(id){
			var vars2send 			= {};
			vars2send.id			= id;
			vars2send.what			= "CATASTER_REF_POLIGON";
			vars2send.token			= token;
			return $http.post(baseHref+'ajax.places.php', vars2send).then(function(response){
				return response.data;
    		});
		}

		//gets cataster by reference
		dataFactory.getCatasterRefFromCoord = function(x,y){
			var vars2send 			= {};
			vars2send.x				= x;
			vars2send.y				= y;
			vars2send.what			= "CATASTER_REF_COORD";
			vars2send.token			= token;
			return $http.post(baseHref+'ajax.places.php', vars2send).then(function(response){
				return response.data;
    		});
		}

		//gets cataster by reference
		dataFactory.getEquipament	= function(tipus){
			var vars2send 			= {};
			vars2send.tipus			= tipus;
			vars2send.what			= "EQUIPAMENT";
			vars2send.token			= token;
			return $http.post(baseHref+'ajax.places.php', vars2send).then(function(response){
				return response.data;
    		});
		}
		
		return dataFactory;		
	}])

})();
