/**
     * @constructor
     * @extends {ol.control.Control}
     * @param {Object=} opt_options Control options.
     */
ol.control.olLayerControl = function (opt_options) {

    var options = opt_options || {};
    this.extent_ = options.extent;
    this.baseLayers = options.baseLayers;

    var this_ = this;

    var button1 = document.createElement('button');
    button1.className = 'active btn-olLayer btn-olLayerMap btn btn-default';
    button1Text = document.createTextNode("Mapa");
    button1.appendChild(button1Text);

    var button2 = document.createElement('button');
    button2.className = 'btn-olLayer btn-olLayerFoto btn btn-default';
    button2Text = document.createTextNode("Fotografia");
    button2.appendChild(button2Text);

    var button3 = document.createElement('button');
    button3.className = 'btn-olLayer btn-olLayerCap btn btn-default';
    button3Text = document.createTextNode("Cap");
    button3.appendChild(button3Text);

    /*var button4 = document.createElement('button');
    button4.className = 'btn-olLayer btn-olLayerUll btn btn-default';
    button4Text = document.createTextNode("L'ull del temps");
    button4.appendChild(button4Text);*/

    var btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group';
    btnGroup.setAttribute('role', 'group');
    btnGroup.appendChild(button1);
    btnGroup.appendChild(button2);
    btnGroup.appendChild(button3);
    //btnGroup.appendChild(button4);

    var buttons = document.createElement('div');
    buttons.className = 'layerControl ol-unselectable';
    buttons.appendChild(btnGroup);

    // Topo
    button1.onclick = function (e) {
        e = e || window.event;
        $(".layerControl .btn.active").removeClass("active");
        $(this).addClass("active");
        e.preventDefault();

        this_.baseLayers.forEach(function(layer, i) {
            layer.setVisible(layer.get("name") == "baseLayerTopo");
            layer.setOpacity($("#opacitySlider").slider("value")/100);
        });
    };

    // Fotografia
    button2.onclick = function (e) {
        e = e || window.event;
        $(".layerControl .btn.active").removeClass("active");
        $(this).addClass("active");
        e.preventDefault();

        this_.baseLayers.forEach(function(layer, i) {
            layer.setVisible(layer.get("name") == "baseLayerFoto");
            layer.setOpacity($("#opacitySlider").slider("value")/100);
        });
    };

    // Cap
    button3.onclick = function (e) {
        e = e || window.event;
        $(".layerControl .btn.active").removeClass("active");
        $(this).addClass("active");
        e.preventDefault();

        this_.baseLayers.forEach(function(layer, i) {
            layer.setVisible(layer.get("name") == "baseLayerNull");
            layer.setOpacity($("#opacitySlider").slider("value")/100);
        });
    };

    // L'Ull del temps
    /*button4.onclick = function (e) {
        e = e || window.event;
        $(".layerControl .btn.active").removeClass("active");
        $(this).addClass("active");
        e.preventDefault();

        this_.baseLayers.forEach(function(layer, i) {
            layer.setVisible(layer.get("name") == "baseLayerTopo" || layer.get("name") == "baseLayerFoto");
            layer.setOpacity($("#opacitySlider").slider("value")/100);
        });
    };*/

    ol.control.Control.call(this, {
        element: buttons,
        map: options.map,
        target: options.target
    });
};
ol.inherits(ol.control.olLayerControl, ol.control.Control);


/**
 * Overload setMap to use the view projection's validity extent
 * if no extent was passed to the constructor.
 * @param {ol.Map} map Map.
 */
ol.control.olLayerControl.prototype.setMap = function (map) {
    ol.control.Control.prototype.setMap.call(this, map);
    if (map && !this.extent_) {
        this.extent_ = map.getView().getProjection().getExtent();
    }
};