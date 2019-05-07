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
var printSource, printLayer, translatePrintBox, 
	printTemplate = "plantilla_DIN_A4_horitzontal (1:500)";

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

		baseLayerTopo = new ol.layer.Tile({
							name: 'baseLayerTopo',
	                        title: 'Topogràfic (by ICGC)',
	                        qgistitle: '@ Capes topografiques - gris',
	                        type: 'base',
	                        visible: mapid != "poum",
	                        source: new ol.source.TileWMS({
								url: 'http://geoserveis.icc.cat/icc_mapesmultibase/utm/wms/service?',
					            params: {'LAYERS': 'topogris', 'VERSION': '1.1.1'}
					            //url: urlWMS,
					            //params: {'LAYERS': 'icgc_topo'},
					        })
	                    });

		baseLayerFoto = new ol.layer.Tile({
							name: 'baseLayerFoto',
	                        title: 'Ortofoto (by ICGC)',
	                        qgistitle: '@ Capes ortofotografiques',
	                        type: 'base',
	                        visible: false,
	                        source: new ol.source.TileWMS({
								url: 'http://geoserveis.icc.cat/icc_mapesmultibase/utm/wms/service?',
					            params: {'LAYERS': 'orto', 'VERSION': '1.1.1'}
					            //url: urlWMS,
					            //params: {'LAYERS': 'icgc_orto'},
					        })
	                    });

		baseLayerNull = new ol.layer.Tile({
							name: 'baseLayerNull',
	                        title: 'Cap fons',
	                        type: 'base'
	                    });

		baseLayers = [
			baseLayerNull,
			baseLayerTopo,
			baseLayerFoto,
			//baseLayerMap
		];

		$.when(
            $.getJSON("js/data/"+mapid+".qgs.json", {})   
            .done (function( data ) {

            	overlays = data;
            	//console.log(overlays);

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
										layers: qgisLayers,
										controls: ol.control.defaults({attribution: false}),
		        					});

		        //map.addLayer(raster);
		        map.setView(view);
		        map.set("urlWMSqgis", urlWMSqgis);
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
		        	baseLayers: baseLayers,
		        	mapid: mapid
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
					//$(".infoPanel").hide();
					$(".infoPanelLinks").hide();
					//log("click coordinates: ", evt.coordinate);

					if (!measureActive) {
						$("#infoPanel").show();
						$('#loading').addClass('spinner');
						selectFeatureInfo(evt.coordinate);
						showIcon(evt.coordinate);
					}
				});

				map.on('pointermove', function(evt) {
					if (measureActive) {
						pointerMoveHandler(evt);
					}
				});

				// l'ull del temps
				// get the pixel position with every move
				var container = document.getElementById('map');
				var mousePosition = null;

				container.addEventListener('mousemove', function(event) {
					if ($(".btn-olLayerUll").hasClass("active")) {
						mousePosition = map.getEventPixel(event);
						map.render();
					}
				});

				container.addEventListener('mouseout', function() {
					if ($(".btn-olLayerUll").hasClass("active")) {
						mousePosition = null;
						map.render();
					}
				});

				// before rendering the layer, do some clipping
				baseLayerFoto.on('precompose', function(event) {
					if ($(".btn-olLayerUll").hasClass("active")) {
						var ctx = event.context;
						var pixelRatio = event.frameState.pixelRatio;
						ctx.save();
						ctx.beginPath();
						if (mousePosition) {
							// only show a circle around the mouse
							ctx.arc(mousePosition[0] * pixelRatio, mousePosition[1] * pixelRatio, 100 * pixelRatio, 0, 2 * Math.PI);
							ctx.lineWidth = 5 * pixelRatio;
							ctx.strokeStyle = 'rgba(0,0,0,0.5)';
							ctx.stroke();
						}
						ctx.clip();
					}
				});

				// after rendering the layer, restore the canvas context
				baseLayerFoto.on('postcompose', function(event) {
					if ($(".btn-olLayerUll").hasClass("active")) {
						var ctx = event.context;
						ctx.restore();
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
							color: '#58267b',
							width: 2
						}),
						image: new ol.style.Circle({
							radius: 7,
							fill: new ol.style.Fill({
						  		color: '#58267b'
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
            		type: layer.type,
					source: layerSource,
					showlegend: layer.showlegend,
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
            title: 'Catastro',
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
		//$('#infoPanel').hide();
		$('#infoPanel .content').empty();
		$('#infoPanel .content-catastro').empty();
		$('#infoPanel .content-coord').empty();
		$('#infoPanelLinks iframe').attr("src", "");
		
		if(highLightSource){
	    	highLightSource.clear();
	    }

	    //console.log(qgisSources, renderedLayers);

	    // load feature info process, check if all loaded
	    var itemsProcessed = 0;
	    var itemsTotal = 0;
	    var itemsResult = false;

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
	    				infoLayers[sublayer.name] = sublayer["fields"];
	    			});
	    		}
	    		else if (renderedLayers[key].get("indentifiable")) {
	    			sources = [qgisSources[key]];
	    			infoLayers[key] = renderedLayers[key].get("fields");
				}
    			//console.log("infoLayers", infoLayers);

				sources.forEach(function(source, i) {

	    			// layer source
		    		url = source.getGetFeatureInfoUrl(
						coordinates, map.getView().getResolution(), viewProjection,
						{
							'INFO_FORMAT': 'text/xml', 
							'FEATURE_COUNT': 100,
							'FI_LINE_TOLERANCE': 10,
							'FI_POINT_TOLERANCE': 10,
							'FI_POLYGON_TOLERANCE': 0,

						}
					);

					if (url) {
						log("url", url);
						itemsTotal++;

						$http.get(url).then(function(response){

							if(response) {

						    	var xmlDoc = $.parseXML(response.data), 
									$xml = $(xmlDoc);

								itemsProcessed++;
								
								$($xml.find('Layer')).each(function(){

									if ($(this).children().length > 0) {
										var layer = $(this);
										var layerName = layer.attr('name');

										//console.log(layerName);
										
										$(layer.find('Feature')).each(function(){

											if ($(this).children().length > 0) {

												itemsResult = true;

												var feature = $(this);
												var id = feature.find('Attribute[name="id"]').attr('value');
												if (id == undefined && layerName == "Activitats") 
													id = feature.find('Attribute[name="id_activitat"]').attr('value');

												if (layerName != undefined && id != undefined) {

												    $rootScope.$broadcast('featureInfoReceived',url);

													var ruta = 'files/';

													if (layerName.startsWith("@")) {
														layerName = layerName.substring(2);
													}
													var html = "<h3>"+layerName+"</h3>";

													var l = source.getParams()['LAYERS'];

													if (infoLayers[l] != undefined) {

														infoLayers[l].forEach(function(field){
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

													    $('#infoPanel .content').append(html);
													}
												}
											}
										});
									}
								});
							}

						    if(itemsProcessed === itemsTotal) {
						    	$('#loading').removeClass('spinner');

						    	if (!itemsResult) {
									$('#infoPanel .content').append("<strong>No s'ha trobat cap informació</strong>");
						    	}
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

				//console.log(data.message);

				if (data.message && data.message.refcat !== undefined) {
					// show cadastre info
					var html = "<h3>Cadastre (OVC)</h3>";
					html += "<p>Referencia catastral de la parcela:</p>";
					//html += "<p><a target='_blank' href='https://www1.sedecatastro.gob.es/CYCBienInmueble/SECListaBienes.aspx?del=8&muni=240&rc1="+data.message.pcat1+"&rc2="+data.message.pcat2+"'>"+data.message.refcat+"</a></p>";
					html += "<p><a target='_blank' href='https://www1.sedecatastro.gob.es/CYCBienInmueble/OVCListaBienes.aspx?del=8&muni=240&rc1="+data.message.pcat1+"&rc2="+data.message.pcat2+"'>"+data.message.refcat+"</a></p>";

					if (iconLayer !== null) {
						$('#infoPanel .content-catastro').append(html);
					    $("#infoPanel").show();
					}
				}
			})
			.catch(function (error) {
			 	log("error in getCatasterRefFromPoligon: ", error);
		    });
		}

	    var coordsTxt = "<h3>Coordenades identificades</h3>";
	    var coords = ol.proj.transform([coordinates[0], coordinates[1]], 'EPSG:3857', ol.proj.get('EPSG:25831'));
	    coordsTxt += "<p>X=" + coords[0].toFixed(1);
	    coordsTxt += " Y=" + coords[1].toFixed(1);
	    coordsTxt += "</p>";
		$('#infoPanel .content-coord').append(coordsTxt);
	    //$("#infoPanel").show();
	}

	function getHtmlP(label, content) {
		if (content != 'NULL' && content != '') {
			if (label == "Àrea (m²)") {
				content = Number(content.replace(',','')).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
			}
			
			return "<p>"+label+": "+content+"</p>";
		}
		else {
			return "";
		}
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

			//log("zoomToCoord:"+x+":"+y);

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

		//log("showIcon:"+coord[0]+":"+coord[1]);

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
			        image: new ol.style.Icon(({
						anchor: [0.5, 0],
						anchorOrigin: 'bottom-left',
						color: [255,0,0,1],
						src: 'tpl/default/img/marker.png'
				    }))
				})
			});
			map.addLayer(iconLayer);

            // hide Icon when info panel is closed
            $("#infoPanel").on("click", "a.pull-right", function(){
            	map.removeLayer(iconLayer);
            	iconLayer = null;
                return false;
            });
		}
		else {
			iconPoint.setCoordinates(coord);
		}
	}

	function setVisibleLayer(layerName, visible=true) {
		log("setVisibleLayer "+layerName+" ["+visible+"]");
		//console.log(renderedLayers);
		renderedLayers[layerName].setVisible(visible);
	}

	//log function
	function log(evt,data){
		$rootScope.$broadcast('logEvent',{evt:evt,extradata:data,file:filename});
	}
	
	function setHighLightStyle(){
		var _myStroke = new ol.style.Stroke({
							//color : 'rgba(108, 141, 168, 1)',
							color: 'rgba(88, 38, 123, 1)',
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
						{	
							html: '<svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0 -8)"><path d="m1.5000001 20.5h21v7h-21z" style="overflow:visible;fill:#c7c7c7;fill-rule:evenodd;stroke:#5b5b5c;stroke-width:.99999994;stroke-linecap:square"/><path d="m4.5 21v3" fill="none" stroke="#5b5b5c"/><path d="m7.5 21v3" fill="none" stroke="#5b5b5c"/><path d="m10.5 20v6" fill="none" stroke="#5b5b5c"/><path d="m13.5 21v3" fill="none" stroke="#5b5b5c"/><path d="m16.5 21v3" fill="none" stroke="#5b5b5c"/><path d="m19.5 21v3" fill="none" stroke="#5b5b5c"/><path d="m2.5 13v4" fill="none" stroke="#ffffff"/><path d="m21.5 13v4" fill="none" stroke="#ffffff"/><path d="m2 15h20" fill="none" stroke="#ffffff" stroke-width="1.99999988"/></g></svg>',
							//autoActivate: true,
							onToggle: function(b) { 
								//console.log("Button 1 "+(b?"activated":"deactivated")); 
								measureActive = b;
								enableInteraction(b, true);
							} 
						}),
					new ol.control.Toggle(
						{	
							html: '<svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0 -8)"><path d="m1.5000001 20.5h21v7h-21z" style="overflow:visible;fill:#c7c7c7;fill-rule:evenodd;stroke:#5b5b5c;stroke-width:.99999994;stroke-linecap:square"/><path d="m4.5 21v3" fill="none" stroke="#5b5b5c"/><path d="m7.5 21v3" fill="none" stroke="#5b5b5c"/><path d="m10.5 20v6" fill="none" stroke="#5b5b5c"/><path d="m13.5 21v3" fill="none" stroke="#5b5b5c"/><path d="m16.5 21v3" fill="none" stroke="#5b5b5c"/><path d="m19.5 21v3" fill="none" stroke="#5b5b5c"/><path d="m2.5 9.5h5v2h14v7.5h-6.5v-5h-5v3.5h-7.5z" fill="#6d97c4" fill-rule="evenodd" stroke="#ffffff"/></g></svg>',
							onToggle: function(b) { 
								//console.log("Button 2 "+(b?"activated":"deactivated")); 
								measureActive = b;
								enableInteraction(b, false);
							}
						})
				]
			});
		mainToggle = new ol.control.Toggle(
						{	
							html: '<svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0 -8)"><path d="m1.5000001 20.5h21v7h-21z" style="overflow:visible;fill:#c7c7c7;fill-rule:evenodd;stroke:#5b5b5c;stroke-width:.99999994;stroke-linecap:square"/><path d="m4.5 21v3" fill="none" stroke="#5b5b5c"/><path d="m7.5 21v3" fill="none" stroke="#5b5b5c"/><path d="m10.5 20v6" fill="none" stroke="#5b5b5c"/><path d="m13.5 21v3" fill="none" stroke="#5b5b5c"/><path d="m16.5 21v3" fill="none" stroke="#5b5b5c"/><path d="m19.5 21v3" fill="none" stroke="#5b5b5c"/><path d="m2.5 13v4" fill="none" stroke="#ffffff"/><path d="m21.5 13v4" fill="none" stroke="#ffffff"/><path d="m2 15h20" fill="none" stroke="#ffffff" stroke-width="1.99999988"/></g></svg>',
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
			{	
				autoDeactivate: true,
				controls: [mainToggle],
				className: "ol-bottom ol-left measureBar"
			});
		map.addControl ( mainBar );
		$(".measureBar").attr("title", "Eina de mesurar, longitud i àrea");
		$(".measureBar div div div:first").attr("title", "Eina de mesurar, longitud");
		$(".measureBar div div div:last").attr("title", "Eina de mesurar, àrea");
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

    $(".infoPanelLinks .btn-print").on("click", function(){
        window.frames['printinfo'].focus();
		window.frames['printinfo'].print();
    });

	/****************************************/
	// print
	/****************************************/
    $("#menu").on("click", ".reports", function(){
        cancelPrintBox();
    });
    $("#menu").on("click", ".layers", function(){
        cancelPrintBox();
    });
    $("#menu").on("click", ".search", function(){
        cancelPrintBox();
    });

    $("#menu").on("click", ".print", function(){
        cancelPrintBox();
        initPrintBox();
    });

    $(".window.print").on("click", "h2 .fa-times", function(){
        $(this).closest(".window").hide();
        cancelPrintBox();
    });

    $(".window.print").on("click", ".btn-cancel", function(){
        $(this).closest(".window").hide();
        cancelPrintBox();
    });

    $(".window.print").on("click", ".btn-print", function(){
        printPrint();
    });

	// actual screen scale
	// https://gis.stackexchange.com/questions/242424/how-to-get-map-units-to-find-current-scale-in-openlayers
	function screenScale() {
		var unit = map.getView().getProjection().getUnits();
		var resolution = map.getView().getResolution();
		var inchesPerMetre = 39.3700787;
		var dpi = 96;

		return resolution * ol.proj.METERS_PER_UNIT[unit] * inchesPerMetre * dpi;
	}

	// print map resolution in m/px
	// https://gis.stackexchange.com/questions/158435/how-to-get-current-scale-in-openlayers-3#answer-158518
	function printResolution(scale) {
		var unit = map.getView().getProjection().getUnits();
		var inchesPerMetre = 39.3700787;
		var dpi = 120;

		return scale / (ol.proj.METERS_PER_UNIT[unit] * inchesPerMetre * dpi);
	}

	function initPrintBox() {

		var size = $(".print .format.active").data("size");
		var scale = Number($(".print .format.active").data("scale"));
    	var w = Number(size[0])*printResolution(scale)/screenScale()*18000;
    	var h = Number(size[1])*printResolution(scale)/screenScale()*18000;

		var bounds = map.getView().calculateExtent([w,h]);
		var printBox = [
			[bounds[0], bounds[1]],
			[bounds[0], bounds[3]],
			[bounds[2], bounds[3]],
			[bounds[2], bounds[1]],
			[bounds[0], bounds[1]]
		];
		var printPolygon = new ol.geom.Polygon([printBox]);
		var printFeature = new ol.Feature(printPolygon);

		/*printFeature.on('change',function(){
			console.log('Feature Moved To:' + this.getGeometry().getCoordinates());
		},printFeature);*/

   	    printSource = new ol.source.Vector({wrapX: false});
		printSource.addFeature(printFeature);

		printLayer = new ol.layer.Vector({
			source: printSource,
			zIndex: 1000,
			style: new ol.style.Style({
				fill: new ol.style.Fill({
					color: 'rgba(88,38,123,0.3)' 
				}),
				stroke: new ol.style.Stroke({
					color: 'rgb(88,38,123)',
					width: 2
				}),
				image: new ol.style.Circle({
					radius: 2,
					fill: new ol.style.Fill({
						color: 'rgb(88,38,123)' 
					})
				})
			})
		});
		map.addLayer(printLayer);

		// make box draggable
		translatePrintBox = new ol.interaction.Translate({
	        features: new ol.Collection([printFeature])
	    });

		printLayer.setVisible(true);
		map.addInteraction(translatePrintBox);
	}

	function cancelPrintBox() {
		if (printSource) {
			map.removeInteraction(translatePrintBox);
			printSource.clear();
			printLayer.setVisible(false);
		}
	}

	function printPrint() {
		// print selected area
		$(this).attr("target", "_blank");

    	//var url = urlWMSqgis+'?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetPrint&FORMAT=pdf&TRANSPARENT=true&LAYERS='+mapname+'&CRS=EPSG:3857&map0:STYLES=&map0:extent='+printSource.getExtent()+'&TEMPLATE='+printTemplate+'&DPI=120';

		// get visible layers
		var visibleLayers = [];
		Object.keys(renderedLayers).forEach(function(key){
			if (renderedLayers[key].getVisible()) {
				if (key !== "@ Capes topografiques - gris" &&
					key !== "@ Capes ortofotografiques" &&
					key !== "Catastro") {

					//console.log(key, renderedLayers[key].getVisible());
					visibleLayers.push(key);
				}
				else if (key === "Catastro" && catastroLayer.getVisible()) {

					//console.log(key, catastroLayer.getVisible());
					visibleLayers.push("@ Catastro");
				}
			}
		});

		baseLayers.forEach(function(layer, i) {
			if (layer.getVisible() && layer.get("title") !== "Cap fons") {
            	//console.log(layer);
            	//visibleLayers.push(layer.get("qgistitle"));
				visibleLayers.splice(0, 0, layer.get("qgistitle"));
            }
        });
		//console.log(visibleLayers.toString());

    	var url = urlWMSqgis+'?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetPrint&FORMAT=pdf&TRANSPARENT=true&LAYERS='+visibleLayers.toString()+'&CRS=EPSG:3857&map0:STYLES=&map0:extent='+printSource.getExtent()+'&TEMPLATE='+printTemplate+'&DPI=120&map0:scale='+$(".print .format.active").data("scale");

		console.log(url);

        window.open(url, mapname+" Castellbisbal");
	}

    $(".window.print").on("click", ".format", function(){
    	var clase = $(this).attr('class');
		var dims = {
			a3_hor: [420, 277],
			a3_ver: [277, 420],
			a4_hor: [297, 188],
			a4_ver: [188, 297],
		};
		var dim = dims["a4_hor"];
		var resolution = 120;
		var scale = 500;

    	switch(clase) {
    		case "format a4_hor": 
    			printTemplate = "plantilla_DIN_A4_horitzontal (1:500)"; 
    			dim = dims["a4_hor"];
    			scale = 500;
    			break;
    		case "format a4_ver": 
    			printTemplate = "plantilla_DIN_A4_vertical (1:500)"; 
    			dim = dims["a4_ver"];
    			scale = 500;
    			break;
    		case "format a3_hor": 
    			printTemplate = "plantilla_DIN_A3_horitzontal (1:1.000)"; 
    			dim = dims["a3_hor"];
    			scale = 1000;
    			break;
    		case "format a3_ver": 
    			printTemplate = "plantilla_DIN_A3_vertical (1:1.000)"; 
    			dim = dims["a3_ver"];
    			scale = 1000;
    			break;
    	}
    	$(".window.print a.format").removeClass("active");
    	$(".window.print a."+clase.replace(/ /g, '.')).addClass("active");

		printSource.clear();
    	initPrintBox();

        return false;
    });

	/****************************************/
	// public API
	/****************************************/
	var returnFactory 	= {
					    		map				: map,
								init			: init,
								zoomToCoord		: zoomToCoord,
								highlightPoligon: highlightPoligon,
								resize			: resize,
								setVisibleLayer	: setVisibleLayer
	};
	return returnFactory;
}
})();