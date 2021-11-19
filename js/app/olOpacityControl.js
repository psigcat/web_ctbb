/**
     * @constructor
     * @extends {ol.control.Control}
     * @param {Object=} opt_options Control options.
     */
ol.control.olOpacityControl = function (opt_options) {

    var options = opt_options || {};
    this.extent_ = options.extent;
    this.baseLayers = options.baseLayers;

    var this_ = this;

    var slider = document.createElement('div');
    slider.setAttribute('id', 'opacitySlider');

    var sliderControl = document.createElement('div');
    sliderControl.className = 'opacityControl ol-unselectable';
    sliderControl.appendChild(slider);

    //$( "#opacitySlider" ).slider();

    ol.control.Control.call(this, {
        element: sliderControl,
        map: options.map,
        target: options.target
    });
};

var ol_ext_inherits = function(child,parent) {
    child.prototype = Object.create(parent.prototype);
    child.prototype.constructor = child;
};
ol_ext_inherits(ol.control.olOpacityControl, ol.control.Control);


/**
 * Overload setMap to use the view projection's validity extent
 * if no extent was passed to the constructor.
 * @param {ol.Map} map Map.
 */
ol.control.olOpacityControl.prototype.setMap = function (map) {
    ol.control.Control.prototype.setMap.call(this, map);
    if (map && !this.extent_) {
        this.extent_ = map.getView().getProjection().getExtent();
    }
};