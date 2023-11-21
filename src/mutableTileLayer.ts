L.TileLayer.MutableTileLayer = L.TileLayer.extend({
    // @section
    // @aka MutableTileLayer parameters
    options: {
        parameters: {},
    },

    base_url: "",

    initialize: function (url, options) {
        this.base_url = url;

        L.TileLayer.prototype.initialize.call(this, url, options);

        this.setParameters(options.parameters);
    },

    // @method setParameters(parameters: Object): this
    // Resets the layer's parameters
    setParameters: function(parameters) {
        this.options.parameters = parameters;

        var url_options_string = "";

        for (const key in this.options.parameters) {
            url_options_string += `${key}=${encodeURIComponent(this.options.parameters[key])}&`;
        }

        const new_url = this.base_url + "?" + url_options_string;

        this.setUrl(new_url, false);
    },
});

L.tileLayer.mutableTileLayer = function (url, options) {
    return new L.TileLayer.MutableTileLayer(url, options);
}