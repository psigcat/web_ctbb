/**
     * @constructor
     * @extends {ol.control.Control}
     * @param {Object=} opt_options Control options.
     */
ol.control.olLayerControl = function (opt_options) {

    var options = opt_options || {};
    this.extent_ = options.extent;
    this.baseLayers = options.baseLayers;
    this.mapid = options.mapid;

    var this_ = this;

    // cap selected for map poum
    var activeFoto = "active ";
    var activeCap = "";
    if (this.mapid == "poum") {
        activeFoto = "";
        activeCap = "active ";
    }

    var button1 = document.createElement('button');
    button1.className = activeFoto+'btn-olLayer btn-olLayerMap btn btn-default';
    button1Text = document.createTextNode("Mapa");
    button1.appendChild(button1Text);

    var button2 = document.createElement('button');
    button2.className = 'btn-olLayer btn-olLayerFoto btn btn-default';
    button2Text = document.createTextNode("Fotografia");
    button2.appendChild(button2Text);

    var button3 = document.createElement('button');
    button3.className = activeCap+'btn-olLayer btn-olLayerCap btn btn-default';
    button3Text = document.createTextNode("Cap");
    button3.appendChild(button3Text);

    var btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group';
    btnGroup.setAttribute('role', 'group');
    btnGroup.appendChild(button1);
    btnGroup.appendChild(button2);
    if (this.mapid !== "ortofotos_historial") {
        btnGroup.appendChild(button3);
    }

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
            layer.setVisible(layer.get("name") == "baseLayerTopo" || layer.get("name") == "baseLayerTopoAMB");
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

    ol.control.Control.call(this, {
        element: buttons,
        map: options.map,
        target: options.target
    });
};

var ol_ext_inherits = function(child,parent) {
    child.prototype = Object.create(parent.prototype);
    child.prototype.constructor = child;
};
ol_ext_inherits(ol.control.olLayerControl, ol.control.Control);

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