import * as L from "leaflet";

L.TileLayer.MutableWebsocketTileLayer = L.TileLayer.extend({
    // @section
    // @aka MutableWebsocketTileLayer parameters
    options: {
        parameters: {},
        map: "",
        band: 0,
    },

    url: "",
    websocket_ready: false,
    websocket: null,
    current_number_of_tiles: 0,
    queued_dones: {},

    create_websocket: function () {
        /* Set up the websocket connection */
        console.log(this.url);
        this.websocket = new WebSocket(this.url);
        
        var parent = this;
        this.websocket.onopen = () => {
            parent.websocket_ready = true;
            parent.redraw();
            console.log("Connection open.");
        }
        
        this.websocket.onclose = () => {
            console.log("Connection closed.");
        }

        var queued_tiles = this.queued_tiles;
        var queued_dones = this.queued_dones;

        this.websocket.onmessage = (e) => {
            var result = JSON.parse(e.data);

            if (result.error) {
                console.error(result.error);

                /* Need to tell the tile that it didn't succeed. */
                var image = this._tiles[result.tile_id];

                if (image == null) {
                    queued_dones[result.tile_id] = null;
                    return;
                }

                var done = queued_dones[result.tile_id];

                this._tileOnError(done, image.el, result.error);

                queued_dones[result.tile_id] = null;
                return;
            }

            if (result.image) {
                /* We got it! */
                /* Need to tell the tile that it did succeed. */
                var image = this._tiles[result.tile_id];
                
                if (image == null) {
                    queued_dones[result.tile_id] = null;
                    return;
                }

                var done = this.queued_dones[result.tile_id];
                image.el.src = result.image;

                this._tileOnLoad(done, image.el);

                queued_dones[result.tile_id] = null;

                return;
            }
        }
          
    },

    close_websocket: function () {
        this.websocket.close();
        this.websocket_ready = false;
    },

	onAdd() {
		this._initContainer();

        this.create_websocket();

		this._levels = {};
		this._tiles = {};

		this._resetView(); // implicit _update() call
	},

	onRemove(map) {
        this.close_websocket();
		this._removeAllTiles();
		this._container.remove();
		map._removeZoomLimit(this);
		this._container = null;
		this._tileZoom = undefined;
	},

    initialize: function (url, options) {
        this.url = url;
        L.TileLayer.prototype.initialize.call(this, url, options);

        this.setParameters(options.parameters);
    },

    createTile(coords, done) {
		const tile = document.createElement('img');

		// The alt attribute is set to the empty string,
		// allowing screen readers to ignore the decorative image tiles.
		// https://www.w3.org/WAI/tutorials/images/decorative/
		// https://www.w3.org/TR/html-aria/#el-img-empty-alt
		tile.alt = '';

        /* Add to internal queue */
        /* TODO actually handle promise resolutoin here... */
        if (this.websocket_ready) {
            const id = this._tileCoordsToKey(coords);
            this.queued_dones[id] = done;

            /* Submit the websocket request. This will asynchronously
            * request the new tile information */
            var y = coords.y;

            if (this._map && !this._map.options.crs.infinite) {
                const invertedY = this._globalTileRange.max.y - coords.y;
                if (this.options.tms) {
                    y = invertedY;
                }
                y = invertedY;
            }

            this.websocket.send(
                JSON.stringify(
                    {
                        "tile_id": id,
                        "map": this.options.map,
                        "band": this.options.band,
                        "x": coords.x,
                        "y": y,
                        "level": this._getZoomForUrl(),
                        "render_options": this.options.parameters,
                    }
                )
            );

            this.current_number_of_tiles += 1;
        }

		return tile;
	},


    // @method setParameters(parameters: Object): this
    // Resets the layer's parameters
    setParameters: function(parameters) {
        this.options.parameters = parameters;
    },
});

L.tileLayer.mutableWebsocketTileLayer = function (url, options) {
    return new L.TileLayer.MutableWebsocketTileLayer(url, options);
}