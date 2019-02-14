(function() {
'use strict';

/**
 * Map Service
 */
angular.module('app').factory('mapService', map_service);

var map							= null;		//map
var backgroundMap				= null;		//backgroundMap 1- CartoDB light, 2- CartoDB dark
var backgroundMapUrl			= 'http://{1-4}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
var customLayer					= null;		//wms layer
var highLightLayer				= null;		//layer for highlighted town
var highLightSource				= null;		//source for highlifgted polygon
var viewProjection 				= null;
var viewResolution 				= null;
var raster						= null;		//background raster
var filename 					= "mapService.js";
var lastMouseMove				= new Date().getTime()+5000;
var currentLayer				= null;		//current WMS layer
var urlWMS						= null;		//WMS service url
var urlWMSqgis					= null;		//WMS service url qgis
var highLightStyle				= null;		//ol.style for highlighted feature
var currentZoomLevel			= 13;
var mainLayer					= null;		//main layer, in this case dbwater_rend is a layer that contains layers
var layers						= null;		//layers contained in mainLayer (dbwater_rend)
var zoomTrigger					= null;		//zoom level for trigger active layer change
var activeLayer 				= null;
var iconLayer					= null;
var iconPoint					= null;
var parcelaLayer				= null;
var parcelaSource				= null;
var placesService 				= null;
var renderedLayers				= {};
var qgisSources					= {};
var qgisSublayerSources			= {};
var layerSwitcher;
var mainBar, subBar, mainToggle, catastroLayer;
var overlays, baseLayers, baseLayerMap, baseLayerFoto, baseLayerTopo, baseLayerNull;
var mapid, mapname;

// Measure
var sketch;
var helpTooltipElement;
var helpTooltip;
var measureTooltipElement;
var measureTooltip;
var continuePolygonMsg = 'Click per continuar dibuixant el polígon';
var continueLineMsg = 'Click per continuar dibuixant la línea';
var helpMsg = 'Clica per iniciar el dibuix';
var draw;
var measureSource;
var measureActive = false;

map_service.$inject 	= [ 
    '$http',
    '$rootScope'
];

function map_service($http,$rootScope){
	if (!ol) return {};

	function resize(){
		log("resize()");
		if(map){
			map.updateSize();
		}
	}
	

	function init(_urlWMS,_urlWMSqgis,_backgroundMap,_zoomTrigger,_placesService,_mapid,_mapname){
		log("init("+_urlWMS+","+_urlWMSqgis+","+backgroundMap+","+_zoomTrigger+","+_mapid+","+_mapname+")");

		//****************************************************************
    	//***********************      LOAD MAP    ***********************
    	//****************************************************************
		backgroundMap				= _backgroundMap;
		urlWMS						= _urlWMS;
		urlWMSqgis					= _urlWMSqgis;
		zoomTrigger					= _zoomTrigger;
		placesService 				= _placesService;
		var projection 				= ol.proj.get('EPSG:4326');
		var extent    				= [-1.757,40.306,3.335,42.829];
		mapid						= _mapid;
		mapname						= _mapname;
	
		//background raster
		raster 					= new ol.layer.Tile({ });
		//view
		var view = new ol.View({
								//projection: projection,
		  						//extent: extent,
		  						center: [220636,5082816],
		  						zoom: currentZoomLevel,
		  						minZoom: 12,
		  						maxZoom: 20
		});

		var resolutionsBG 		= new Array(18);
		var matrixIdsBG 		= new Array(18);
		var projectionExtentBG 	= projection.getExtent();
		var sizeBG = ol.extent.getWidth(projectionExtentBG) / 512;
		for (var z = 0; z < 18; ++z) {
			// generate resolutions and matrixIds arrays for this WMTS
			resolutionsBG[z] = sizeBG / Math.pow(2, z);
			matrixIdsBG[z] = "EPSG:4326:" + z;
		}
/*
		baseLayerMap = new ol.layer.Tile({
							name: 'baseLayerMap',
	                        title: 'OpenStreetMap, estilo Positron (by Carto)',
	                        type: 'base',
	                        visible: true,
	                        source: new ol.source.XYZ({
	                        	url: 'http://{1-4}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
	                        })
	                    });
*/

		baseLayerTopo = new ol.layer.Tile({
							name: 'baseLayerTopo',
	                        title: 'Topogràfic 1:5.000 (by ICGC)',
	                        type: 'base',
	                        visible: true,
	                        source: new ol.source.TileWMS({
								//url: 'http://geoserveis.icgc.cat/icc_mapesbase/wms/service?',
					            //params: {'LAYERS': 'mtc5m', 'VERSION': '1.1.1'}
					            url: urlWMS,
					            params: {'LAYERS': 'icgc_topo'},
					            attributions: [
						            'Institut Cartogràfic i Geològic de Catalunya CC-BY-SA-3'
						        ],
					        })
	                    });

		baseLayerFoto = new ol.layer.Tile({
							name: 'baseLayerFoto',
	                        title: 'Ortofoto (by ICGC)',
	                        type: 'base',
	                        visible: false,
	                        source: new ol.source.WMTS({
								url: 'http://www.ign.es/wmts/pnoa-ma',
				                layer: 'OI.OrthoimageCoverage',
								matrixSet: 'EPSG:4326',
								//matrixSet: 'EPSG:3857',
								format: 'image/png',
								projection: ol.proj.get('EPSG:4326'),
								tileGrid: new ol.tilegrid.WMTS({
								  origin: ol.extent.getTopLeft(projectionExtentBG),
								  resolutions: resolutionsBG,
								  matrixIds: matrixIdsBG
								}),
								style: 'default',
					            attributions: [
						            'Institut Cartogràfic i Geològic de Catalunya CC-BY-SA-3'
						        ],
						 	})
	                    });

		baseLayerNull = new ol.layer.Tile({
							name: 'baseLayerNull',
	                        title: 'Cap fons',
	                        type: 'base'
	                    });

		baseLayers = [
			baseLayerNull,
			baseLayerFoto,
			baseLayerTopo,
			//baseLayerMap
		];

		$.when(
            $.getJSON("js/data/"+mapid+".json", {})   
            .done (function( data ) {

            	overlays = data;

            	var qgisLayers = [
							new ol.layer.Group({
				                'title': 'Capes de referència',
				                layers: baseLayers
				            }),
				            new ol.layer.Group({
				                title: 'Capes temàtiques',
				                layers: getLayerOverlays()
				            })
						];

				//map
				map 				= new ol.Map({
										target: 'map',
										layers: qgisLayers
		        					});

		        //map.addLayer(raster);
		        map.setView(view);
				viewProjection = view.getProjection();
				viewResolution = view.getResolution();

				setHighLightStyle();
				setQgisLayerSources();
				setQgisSubLayerSources();

				layerSwitcher = new ol.control.LayerSwitcher({ 
					target: document.getElementById("layerswitcher"),
					urlWMSqgis: urlWMSqgis
				});
			    map.addControl(layerSwitcher);
		        layerSwitcher.showPanel();

		        map.addControl(new ol.control.olLayerControl({
		        	baseLayers: baseLayers
		        }));

		        map.addControl(new ol.control.olOpacityControl({
		        	baseLayers: baseLayers
		        }));

		        // !!! move to olOpacitySlider
				$( "#opacitySlider" ).slider({
					value: 100,
					slide: function( event, ui ) {
						baseLayers.forEach(function(layer, i) {
				            if (layer.getVisible()) {
				            	layer.setOpacity(ui.value/100);
				            }
				        });
					}
				});

		        /* events */
				map.on('click', function(evt) {
					$(".infoPanel").hide();
					$(".infoPanelLinks").hide();
					//log("click coordinates: ", evt.coordinate);

					if (!measureActive) {
						selectFeatureInfo(evt.coordinate);
						showIcon(evt.coordinate);
					}
				});

				map.on('pointermove', function(evt) {
					if (measureActive) {
						pointerMoveHandler(evt);
					}
				});

				/* measure tool */
				measureSource = new ol.source.Vector();

		    	var measureLayer = new ol.layer.Vector({
					source: measureSource,
					style: new ol.style.Style({
						fill: new ol.style.Fill({
							color: 'rgba(255, 255, 255, 0.2)'
						}),
						stroke: new ol.style.Stroke({
							color: '#ffcc33',
							width: 2
						}),
						image: new ol.style.Circle({
							radius: 7,
							fill: new ol.style.Fill({
						  		color: '#ffcc33'
							})
						})
					})
		      	});

		        map.addLayer(measureLayer);

				initMeasureBar();


            })
            .fail(function(data) {    
                console.log("json error in "+mapid+".json");  
            })
        ).then(function() { 
            //console.log("json file "+mapid+".json loaded!");
        });

		$(document).keyup(function(e) {
			if (e.keyCode == 27) { // escape
		    	map.removeInteraction(draw);
		    	map.removeOverlay(measureTooltip);
		    	removeHelpTooltip();
		    	$('.tooltip').addClass('hidden');
		    	mainToggle.toggle();
		    	measureSource.clear();
			}
		});

		$( document ).ready(function() {
			//layerSwitcher.showPanel();
		});
    	
	}

	function getLayerOverlays() {
		var layers = [];
        layers.push(getCatastroOverlay());

	    for (var i=overlays.length-1; i>=0; i--) {

	    	var layer = overlays[i];

			var layerSource = new ol.source.TileWMS({
				url: 		urlWMS,
				params: {
							'LAYERS': layer.name,	// qgis
							//'LAYERS': layer.mapproxy,	// mapproxy
							'TRANSPARENT': true,
				},
				serverType: 'qgis',									
				//gutter: 	256
			});

            var newLayer = 
            	new ol.layer.Tile({
            		title: layer.name,
					source: layerSource,
					//legend: layer.legend
                    visible: layer.visible,
	                hidden: layer.hidden,
	                children: layer.children,
	                fields: layer.fields,
	                indentifiable: layer.indentifiable,
				});
			layers.push(newLayer);
			if (layer.name != "") {
				renderedLayers[layer.name] = newLayer;
			}
		}

		//console.log(renderedLayers);

		return layers;
	}

	function getCatastroOverlay() {
        catastroLayer = new ol.layer.Tile({
            title: 'Cadastre',
            visible: false,
            source: new ol.source.TileWMS({
            	url: 'http://ovc.catastro.meh.es/Cartografia/WMS/ServidorWMS.aspx',
	            params: {
	            	'LAYERS': 'catastro', 
	            	'TILED': true,
	            	'SRS': 'EPSG:3857'
	            },
	            //serverType: 'geoserver'
	        })
        });
        return catastroLayer;
	}

	function setQgisLayerSources() {
		overlays.forEach(function(layer, i) {

			if (layer.name != "") { //&& layer.name != 'ssa_sectorspau') {

				var queryLayers = "";
		    	if (layer.indentifiable) {
		    		queryLayers = layer.name;
		    	}

		    	//console.log("group", layer.indentifiable, layer.name);
            
	            qgisSources[layer.name] = 

					new ol.source.TileWMS({
						url: 		urlWMSqgis,
						params: {
									'LAYERS': layer.name,
									'TRANSPARENT': true,
									'QUERY_LAYERS': queryLayers,
						},
						serverType: 'qgis'  										
					});
			}
        });
	}

	// workaround to GetFeatureInfo
	function setQgisSubLayerSources() {
		overlays.forEach(function(layer, i) {

			if (layer.name != "" && 
				layer.hasOwnProperty('children')) {

				qgisSublayerSources[layer.name] = [];

				layer.children.forEach(function(sublayer, i) {

					if (sublayer.indentifiable) {

			    		//console.log("subgroup", layer.name, sublayer.name);

			            var source = new ol.source.TileWMS({
							url: 		urlWMSqgis,
							params: {
										'LAYERS': sublayer.name,
										'TRANSPARENT': true,
										'QUERY_LAYERS': sublayer.name,
							},
							serverType: 'qgis'  										
						});
						qgisSublayerSources[layer.name].push(source);
					}
				});
			}
        });

        //console.log(qgisSublayerSources);
	}

	/* select feature info */
	function selectFeatureInfo(coordinates){

		//log("selectFeature()", coordinates);

		//empty infoPanel
		$('#infoPanel .content').empty();
		$('#infoPanel .content-catastro').empty();
		$('#infoPanelLinks iframe').attr("src", "");
		
		if(highLightSource){
	    	highLightSource.clear();
	    }

	    //console.log(qgisSources, renderedLayers);

	    //Object.keys(renderedLayers).forEach(function(key){
	    Object.keys(qgisSources).forEach(function(key){

    		//console.log(key, renderedLayers[key].get("indentifiable"), renderedLayers[key].get("children"));

    		if (renderedLayers[key].getVisible()) {

				// request to qgis server on localhost
	    		var sources = [];
	    		var url = "";
	    		var infoLayers = {};

	    		// get sublayers instead of layers GetFeatureInfo
	    		var sublayers = renderedLayers[key].get("children");

	    		//console.log(key, renderedLayers[key], sublayers);

	    		if (sublayers !== undefined) {
					//console.log(key, " -> GetFeatureInfo for sublayers: ", sublayers);
	    			sources = qgisSublayerSources[key];
	    			//console.log(sources);

	    			sublayers.forEach(function(sublayer) {
	    				infoLayers[sublayer.name] = sublayer;
	    			});
	    		}
	    		else if (renderedLayers[key].get("indentifiable")) {
	    			sources = [qgisSources[key]];
	    			infoLayers[key] = renderedLayers[key]["values_"];
				}
    			//console.log("infoLayers", infoLayers);

				sources.forEach(function(source, i) {

	    			// layer source
		    		url = source.getGetFeatureInfoUrl(
						coordinates, map.getView().getResolution(), viewProjection,
						{
							'INFO_FORMAT': 'text/xml', 
							'FEATURE_COUNT': 100,
							//'FI_LINE_TOLERANCE': 0,
							//'FI_POINT_TOLERANCE': 0,
							//'FI_POLYGON_TOLERANCE': 0,

						}
					);

					if (url) {
						log("url",url);

						$http.get(url).then(function(response){

						    if(response) {
						    	var xmlDoc = $.parseXML(response.data), 
									$xml = $(xmlDoc);
								
								$($xml.find('Layer')).each(function(){
									if ($(this).children().length > 0) {
										var layer = $(this);
										var layerName = layer.attr('name');
										
										$(layer.find('Feature')).each(function(){
											if ($(this).children().length > 0) {
												var feature = $(this);
												var id = feature.find('Attribute[name="id"]').attr('value');
												
												//console.log(layerName, id);

												if (layerName != undefined && id != undefined) {

												    $rootScope.$broadcast('featureInfoReceived',url);

													var ruta = 'files/';

													var html = "<h3>"+layerName+"</h3>";

													var l = source.getParams()['LAYERS'];
													//console.log(l, infoLayers[l], infoLayers[l]['fields']);

													infoLayers[l]['fields'].forEach(function(field){
														var value = feature.find('Attribute[name="'+field.name+'"]').attr('value');

														if (value.startsWith("../links/")) {
															html += getHtmlA(field.name, "Veure fitxa", value);
														}
														else {
															html += getHtmlP(field.name, value);
														}
													});

													// for testing only: link to full info
												    //html += '<a target="_blank" href="' + url + '">.</a>';

													$("#infoPanel").show();
													$('#infoPanel .content').append(html);
												}
											}
										});
									}
								});
							}
						});
					}
				});
		    }
		});

		if (catastroLayer.getVisible()) {

			// add cataster reference
			log("getCatasterRefFromCoord: "+coordinates[0]+":"+coordinates[1]);

			coordinates = ol.proj.transform([coordinates[0], coordinates[1]], 'EPSG:3857', ol.proj.get('EPSG:25831'));

			placesService.getCatasterRefFromCoord(coordinates[0],coordinates[1]).then(function(data) {

				console.log(data.message);

				if (data.message && data.message.refcat !== undefined) {
					// show cadastre info
					var html = "<h3>Cadastre (OVC)</h3>";
					html += "<p>Referencia catastral de la parcela:</p>";
					//html += "<p><a target='_blank' href='https://www1.sedecatastro.gob.es/CYCBienInmueble/SECListaBienes.aspx?del=8&muni=240&rc1="+data.message.pcat1+"&rc2="+data.message.pcat2+"'>"+data.message.refcat+"</a></p>";
					html += "<p><a target='_blank' href='https://www1.sedecatastro.gob.es/CYCBienInmueble/OVCListaBienes.aspx?del=8&muni=240&rc1="+data.message.pcat1+"&rc2="+data.message.pcat2+"'>"+data.message.refcat+"</a></p>";

					$('#infoPanel .content-catastro').append(html);
				}
			})
			.catch(function (error) {
			 	log("error in getCatasterRefFromPoligon: ", error);
		    });
		}
	}

	function getHtmlP(label, content) {
		if (content != 'NULL' && content != '')
			return "<p>"+label+": "+content+"</p>";
		else
			return "";
	}

	function getHtmlA(label, linktext, link) {
		var ruta = "files/";

		if (link && link.indexOf("../links/") !== -1) {
			link = link.substring(9);
		}

		if (link && link != 'NULL') {
			var html = "<p>"+label+": <a class='infoLink' href='#' data-href='"+ruta+link+"'>"+linktext+"</a></p>";
			html += "<script>";
			html += "function setInfoPanelLinksWindowPosition(){ $('.window.infoPanelLinks').css({ 'top': $('.window.main').position().top + $('.window.main').outerHeight() + 15, 'left': 15, 'width': 1160, 'height': 605, 'z-index': 10 }).addClass('animated slideInLeft'); }";
			html += "$('.infoLink').click(function(){ $('.infoPanelLinks').show(); setInfoPanelLinksWindowPosition(); $('.infoPanelLinks iframe').attr('src',$(this).data('href')); });";
			html += "</script>";
			return html;
		}
		else {
			return "";
		}
	}

	function zoomToCoord(x,y) {

		// check if in bounds of layers with: 
		// SELECT ST_Extent(geom) from limit_admin.tm_limit_lin;
        // result: "BOX(409978.249378971 4587601.47112343,416985.690776374 4597348.5951092)"
		if (x > 409978.249378971 && x < 416985.690776374 && y > 4587601.47112343 && y < 4597348.5951092) {

			log("zoomToCoord:"+x+":"+y);

			// convert from EPSG:25831 to EPSG:3857
			var coord = ol.proj.transform([x, y], ol.proj.get('EPSG:25831'), 'EPSG:3857');

			map.getView().animate({
				zoom: map.getView().getMaxZoom(), 
				center: coord
			});
			/*AppFFR.view.fit(box, {
				size: map.getSize(), 
				duration: 3000, 
				padding: [0, 50, 0, 50],
				callback: function(e){}
		    });*/

			// show icon
			showIcon(coord);

			// show feature info if radio selected
			if ($('input[name=searchinfo]:checked').val() === "info") {
				selectFeatureInfo(coord);
			}
		}
		else {
			log("zoomToCoord problem, x or y out of bounds: "+x+":"+y);
		}
	}

	// highlight geom of parcela
	function highlightPoligon(geom) {
		if (geom) {
			log("highlightPoligon: "+geom);

			if (parcelaLayer === null) {

				parcelaSource = new ol.source.Vector({
			        features: (new ol.format.GeoJSON()).readFeatures(geom)
			    });

				parcelaLayer = new ol.layer.Vector({
			        source: parcelaSource,
			        style: new ol.style.Style({
						stroke: new ol.style.Stroke({
							color: 'yellow',
						width: 1
						}),
						fill: new ol.style.Fill({
							color: 'rgba(255, 255, 0, 0.1)'
						})
					})
			    });

				map.addLayer(parcelaLayer);
			}

			else {
				parcelaSource.clear();
				parcelaSource.addFeatures((new ol.format.GeoJSON()).readFeatures(geom));
			}
		}
	}

	function showIcon(coord) {

		log("showIcon:"+coord[0]+":"+coord[1]);

		if (iconLayer === null) {
			iconPoint = new ol.geom.Point(coord);
			iconLayer = new ol.layer.Vector({
				source: new ol.source.Vector({
					features: [
						new ol.Feature({
					        geometry: iconPoint,
						})
					]
				}),
				style: new ol.style.Style({
			        image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
						anchor: [0.5, 0],
						anchorOrigin: 'bottom-left',
						color: [255,0,0,1],
						src: 'tpl/default/img/marker.png'
				    }))
				})
			});
			map.addLayer(iconLayer);
		}
		else {
			iconPoint.setCoordinates(coord);
		}
	}

	function setVisibleLayer(layerName, visible) {
		//log("setVisibleLayer "+layerName+" ["+visible+"]");
		renderedLayers[layerName].setVisible(visible);
	}

	//log function
	function log(evt,data){
		$rootScope.$broadcast('logEvent',{evt:evt,extradata:data,file:filename});
	}
	
	function setHighLightStyle(){
		var _myStroke = new ol.style.Stroke({
							color : 'rgba(108, 141, 168, 1)',
							width : 6 
						});
			
		highLightStyle = new ol.style.Style({
							stroke : _myStroke,
							//fill : _myFill
						});
	}

	// Measure bar
	function initMeasureBar() {
		subBar = new ol.control.Bar(
			{	toggleOne: true,
				autoDeactivate: true,
				controls:
				[	new ol.control.Toggle(
						{	//html:'<i class="fa fa-arrows-h"></i>', 
							html: '<svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0 -8)"><path d="m1.5000001 20.5h21v7h-21z" style="overflow:visible;fill:#c7c7c7;fill-rule:evenodd;stroke:#5b5b5c;stroke-width:.99999994;stroke-linecap:square"/><path d="m4.5 21v3" fill="none" stroke="#5b5b5c"/><path d="m7.5 21v3" fill="none" stroke="#5b5b5c"/><path d="m10.5 20v6" fill="none" stroke="#5b5b5c"/><path d="m13.5 21v3" fill="none" stroke="#5b5b5c"/><path d="m16.5 21v3" fill="none" stroke="#5b5b5c"/><path d="m19.5 21v3" fill="none" stroke="#5b5b5c"/><path d="m2.5 13v4" fill="none" stroke="#415a75"/><path d="m21.5 13v4" fill="none" stroke="#415a75"/><path d="m2 15h20" fill="none" stroke="#415a75" stroke-width="1.99999988"/></g></svg>',
							//autoActivate: true,
							onToggle: function(b) { 
								//console.log("Button 1 "+(b?"activated":"deactivated")); 
								measureActive = b;
								enableInteraction(b, true);
							} 
						}),
					new ol.control.Toggle(
						{	//html:'<i class="fa fa-arrows-alt"></i>', 
							html: '<svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0 -8)"><path d="m1.5000001 20.5h21v7h-21z" style="overflow:visible;fill:#c7c7c7;fill-rule:evenodd;stroke:#5b5b5c;stroke-width:.99999994;stroke-linecap:square"/><path d="m4.5 21v3" fill="none" stroke="#5b5b5c"/><path d="m7.5 21v3" fill="none" stroke="#5b5b5c"/><path d="m10.5 20v6" fill="none" stroke="#5b5b5c"/><path d="m13.5 21v3" fill="none" stroke="#5b5b5c"/><path d="m16.5 21v3" fill="none" stroke="#5b5b5c"/><path d="m19.5 21v3" fill="none" stroke="#5b5b5c"/><path d="m2.5 9.5h5v2h14v7.5h-6.5v-5h-5v3.5h-7.5z" fill="#6d97c4" fill-rule="evenodd" stroke="#415a75"/></g></svg>',
							onToggle: function(b) { 
								//console.log("Button 2 "+(b?"activated":"deactivated")); 
								measureActive = b;
								enableInteraction(b, false);
							}
						})
				]
			});
		mainToggle = new ol.control.Toggle(
						{	html: 'M',
							bar: subBar,
							onToggle: function(b) {
								//console.log("main button "+(b?"activated":"deactivated"))
								if (!b) {
									removeMeasure();
									this.toggle();
								}
							}
						});
		mainBar = new ol.control.Bar(
			{	autoDeactivate: true,
				controls: [mainToggle],
				className: "ol-bottom ol-left measureBar"
			});
		map.addControl ( mainBar );
	}

	/****************************************/
	// Distance and area messurement
	/****************************************/
    function enableInteraction(enable, distance) {
    	enable ? addInteraction(distance) : removeMeasure();
    }

    function addInteraction(distance) {
        var type = (distance ? 'LineString' : 'Polygon');
        draw = new ol.interaction.Draw({
			source: measureSource,
			type: type,
			style: new ol.style.Style({
				fill: new ol.style.Fill({
					color: 'rgba(255, 255, 255, 0.2)'
				}),
				stroke: new ol.style.Stroke({
					color: 'rgba(0, 0, 0, 0.5)',
					lineDash: [10, 10],
					width: 2
				}),
				image: new ol.style.Circle({
					radius: 5,
					stroke: new ol.style.Stroke({
						color: 'rgba(0, 0, 0, 0.7)'
					}),
					fill: new ol.style.Fill({
						color: 'rgba(255, 255, 255, 0.2)'
					})
				})
	    	})
    	});

		map.addInteraction(draw);

        createMeasureTooltip();
        createHelpTooltip();

        var listener;

		draw.on('drawstart',
	        function(evt) {
				// set sketch
				sketch = evt.feature;

				var tooltipCoord = evt.coordinate;

				listener = sketch.getGeometry().on('change', function(evt) {
				var geom = evt.target;
				var output;
				if (geom instanceof ol.geom.Polygon) {
					output = formatArea(geom);
					tooltipCoord = geom.getInteriorPoint().getCoordinates();
				} else if (geom instanceof ol.geom.LineString) {
					output = formatLength(geom);
					tooltipCoord = geom.getLastCoordinate();
				}
				measureTooltipElement.innerHTML = output;
				measureTooltip.setPosition(tooltipCoord);
				});
	        }, this);

	    draw.on('drawend',
	    	function() {
				measureTooltipElement.className = 'tooltip tooltip-static';
				measureTooltip.setOffset([0, -7]);
				// unset sketch
				sketch = null;
				// unset tooltip so that a new one can be created
				measureTooltipElement = null;
				createMeasureTooltip();
	      		ol.Observable.unByKey(listener);
	        }, this);
    }

    function removeMeasure() {
    	measureActive = false;
    	map.removeInteraction(draw);
    	map.removeOverlay(measureTooltip);
    	removeHelpTooltip();
    	$('.tooltip').addClass('hidden');
    	mainToggle.toggle();
    	measureSource.clear();
    }

	function createHelpTooltip() {
        removeHelpTooltip();
        helpTooltipElement = document.createElement('div');
        helpTooltipElement.className = 'tooltip hidden';
        helpTooltip = new ol.Overlay({
          element: helpTooltipElement,
          offset: [15, 0],
          positioning: 'center-left'
        });
        map.addOverlay(helpTooltip);

        map.getViewport().addEventListener('mouseout', helpTooltipEventListener);
    }

    var helpTooltipEventListener = function() {
       	helpTooltipElement.classList.add('hidden');
    }

    function removeHelpTooltip() {
        map.removeOverlay(helpTooltip);
	    map.getViewport().removeEventListener('mouseout', helpTooltipEventListener);
	}

    function createMeasureTooltip() {
        if (measureTooltipElement) {
        	measureTooltipElement.parentNode.removeChild(measureTooltipElement);
        }
        measureTooltipElement = document.createElement('div');
        measureTooltipElement.className = 'tooltip tooltip-measure';
        measureTooltip = new ol.Overlay({
			element: measureTooltipElement,
			offset: [0, -15],
			positioning: 'bottom-center'
        });
        map.addOverlay(measureTooltip);
    }

	var pointerMoveHandler = function(evt) {
		if (evt.dragging) {
			return;
		}

		if (sketch) {
			var geom = (sketch.getGeometry());
			if (geom instanceof ol.geom.Polygon) {
				helpMsg = continuePolygonMsg;
			} else if (geom instanceof ol.geom.LineString) {
				helpMsg = continueLineMsg;
			}
		}

	    if (helpTooltipElement && helpTooltipElement !== undefined) {
			helpTooltipElement.innerHTML = helpMsg;
			helpTooltip.setPosition(evt.coordinate);
			helpTooltipElement.classList.remove('hidden');
		}
	};

    var formatLength = function(line) {
        var length = ol.Sphere.getLength(line);
        var output;
        if (length > 100) {
          output = (Math.round(length / 1000 * 100) / 100) +
              ' ' + 'km';
        } else {
          output = (Math.round(length * 100) / 100) +
              ' ' + 'm';
        }
        return output;
    };	

    var formatArea = function(polygon) {
        var area = ol.Sphere.getArea(polygon);
        var output;
        if (area > 10000) {
          output = (Math.round(area / 1000000 * 100) / 100) +
              ' ' + 'km<sup>2</sup>';
        } else {
          output = (Math.round(area * 100) / 100) +
              ' ' + 'm<sup>2</sup>';
        }
        return output;
    };

    // GetPrint request
    /*$("#menu").on("click", ".print", function(){
    	var bbox = map.getView().calculateExtent().join(',');
        var url = urlWMSqgis+'?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetPrint&FORMAT=pdf&TRANSPARENT=true&LAYERS=POUM%20SSA&CRS=EPSG:3857&map0:STYLES=&map0:extent='+bbox+'&TEMPLATE=DinA4%201:500&DPI=120';
        $(this).attr("target", "_blank");
        window.open(url);
        return false;
    });*/

    $(".window.print").on("click", ".format", function(){
    	var clase = $(this).attr('class');
    	var template = "";
		var dims = {
			a3_hor: [420, 277],
			a3_ver: [277, 420],
			a4_hor: [297, 188],
			a4_ver: [188, 297],
		};
		var dim = dims["a4_hor"];
		var resolution = 120;

    	switch(clase) {
    		case "format a4_hor": 
    			template = "plantilla_DIN_A4_horitzontal (1:500)"; 
    			dim = dims["a4_hor"];
    			break;
    		case "format a4_ver": 
    			template = "plantilla_DIN_A4_vertical (1:500)"; 
    			dim = dims["a4_ver"];
    			break;
    		case "format a3_hor": 
    			template = "plantilla_DIN_A3_horitzontal (1:1.000)"; 
    			dim = dims["a3_hor"];
    			break;
    		case "format a3_ver": 
    			template = "plantilla_DIN_A3_vertical (1:1.000)"; 
    			dim = dims["a3_ver"];
    			break;
    	}

		var width = Math.round(dim[0] * resolution / 25.4);
        var height = Math.round(dim[1] * resolution / 25.4);
        //var size = /** @type {module:ol/size~Size} */ (map.getSize());

    	var extent = map.getView().calculateExtent([width, height]);
    	var url = urlWMSqgis+'?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetPrint&FORMAT=pdf&TRANSPARENT=true&LAYERS='+mapname+'&CRS=EPSG:3857&map0:STYLES=&map0:extent='+extent+'&TEMPLATE='+template+'&DPI=120';
		$(this).attr("target", "_blank");
        window.open(url);
        return false;
    });

    // public API	
	var returnFactory 	= {
					    		map				: map, // ol.Map
								init			: init,
								zoomToCoord		: zoomToCoord,
								highlightPoligon: highlightPoligon,
								resize			: resize,
								setVisibleLayer	: setVisibleLayer						};
	return returnFactory;
}
})();