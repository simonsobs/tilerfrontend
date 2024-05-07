import { TileLayer, latLng, latLngBounds, tileLayer } from "leaflet";
import "./mutableTileLayer";
import { histogramControl } from "./histogramControl";


interface bandOptions {
    id: number;
    map_name: string;
    frequency: number;
    stokes_parameter: string;
    tiles_available: boolean;
    levels: number;
    tile_size: number;
    bounding_left: number;
    bounding_right: number;
    bounding_top: number;
    bounding_bottom: number;
    units: string;
    recommended_cmap_min: number;
    recommended_cmap_max: number;
    recommended_cmap: string;
}

interface tileLayerOptions {
    name: string;
    description: string;
    telescope: string;
    data_release: string;
    season: string;
    tags: string;
    patch: string;
    bands: bandOptions[];
}

export interface tileRenderingOptions {
    cmap: string;
    vmin: number;
    vmax: number;
}

interface fileInfo {
    name: string;
    description: string;
}

interface histogramResponse {
    edges: number[];
    histogram: number[];
    band_id: number;
}

function map_and_band_to_names(tile_layer: tileLayerOptions, band: bandOptions): string {
    return `${tile_layer.telescope} ${tile_layer.data_release} ${band.frequency} GHz (${band.stokes_parameter}, ${tile_layer.tags})`
}

export class LayerLoader {
    server: string;
    file_list: fileInfo[];
    layer_list: string[] = [];
    base_layers: { [key: string]: TileLayer } = {};
    histograms: { [key: string] : histogramResponse } = {};
    rendering_options: { [key: string]: tileRenderingOptions } = {};
    current_layer: string;

    histogram_control: histogramControl;

    constructor(server: string) {
        this.server = server;
    }

    async get_map_list() : Promise<fileInfo[]> {
        const response = await fetch(`${this.server}maps`);

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const raw_file_list = await response.json() ;

        this.file_list = raw_file_list as fileInfo[];

        return this.file_list;
    }

    async get_tile_layer_metadata(map: string): Promise<tileLayerOptions> {
        const response = await fetch(`${this.server}maps/${map}`);

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json() as tileLayerOptions;

        return data;
    }

    async get_histogram_for_band(band_id: number): Promise<histogramResponse> {
        const response = await fetch(`${this.server}histograms/data/${band_id}`);

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json() as histogramResponse;

        return data;
    }

    async get_tile_layers(): Promise<{ [key: string]: TileLayer }> {
        /* Get a fresh file list! */
        await this.get_map_list();

        /* Reset base layers, we might be getting called again and do not want
         * duplicates. */
        this.base_layers = {};
        this.rendering_options = {};

        for (const image_file of this.file_list) {
            const file_name: string = image_file.name;
            const file_metadata = await this.get_tile_layer_metadata(file_name);

            for (const metadata of file_metadata.bands) {
                const layer_name = map_and_band_to_names(file_metadata, metadata);
                
                this.histograms[layer_name] = await this.get_histogram_for_band(metadata.id);

                const top_left = latLng(metadata.bounding_top, metadata.bounding_left);
                const bottom_right = latLng(metadata.bounding_bottom, metadata.bounding_right);
                const bounds = latLngBounds(top_left, bottom_right);

                const min_native_zoom: number = metadata.levels - 4;
                const max_native_zoom: number = metadata.levels - 1;

                const rendering_options: tileRenderingOptions = {
                    cmap: metadata.recommended_cmap, vmin: metadata.recommended_cmap_min, vmax:metadata.recommended_cmap_max
                };

                /* Ignore the linter; mutableTileLayer is added as an extension */
                const layer = tileLayer.mutableTileLayer(`${this.server}maps/FITS_Image/${metadata.id}/{z}/{y}/{x}/tile.webp`, {
                    /* Even if the tile size is not 256, we still need to set it as this. I
                    * have no idea why, but if you set it as the correct value everything breaks */
                    tileSize: 256,
                    zoomOffset: 0,
                    minZoom: 0,
                    maxZoom: metadata.levels + 3,
                    noWrap: true,
                    minNativeZoom: min_native_zoom,
                    maxNativeZoom: max_native_zoom,
                    bounds: bounds,
                    keepBuffer: 16,
                    tms: true,
                    parameters: rendering_options,
                });

                this.base_layers[layer_name] = layer;
                this.rendering_options[layer_name] = rendering_options;
                this.layer_list.push(layer_name)
            }
        }
        return this.base_layers;
    }

    /* Add a single layer to the map. If layer_name is not specified, the first
     * layer in the file_list is selected */
    add_to_map(map: L.Map, layer_name?: string) {
        if (layer_name === undefined) {
            if (this.layer_list.length === 0) {
                Error("No layers to add to map");
            }

            layer_name = this.layer_list[0];
        }

        if (this.base_layers[layer_name] === undefined) {
            throw new Error(`Layer ${layer_name} does not exist`);
        }

        this.base_layers[layer_name].addTo(map);
        this.current_layer = layer_name;
    }

    get_rendering_options(): tileRenderingOptions {
        return this.rendering_options[this.current_layer];
    }

    /* Update the _current layer_'s rendering options */
    update_rendering_options(options: tileRenderingOptions) {
        this.rendering_options[this.current_layer] = options;
        this.base_layers[this.current_layer].setParameters(options);
    }

    beforeLayerSwap(layer_name: string) {
        // Update the rendering options of the new
        // folks to the current rendering options.
        this.rendering_options[layer_name] = this.rendering_options[this.current_layer];
        // It's important to set these before swapping, as otherwise
        // the properties will only change on the next movement.
        this.base_layers[layer_name].setParameters(this.rendering_options[this.current_layer]);

        // Update the histogram control with the new histogram.
        const histogram = this.histograms[layer_name];
        this.histogram_control.options.edges = histogram.edges;
        // Log 10 the histogram...
        const histogram_logged = histogram.histogram.map(Math.log10);
        this.histogram_control.options.histogram = histogram_logged;
        this.histogram_control.draw_histogram();
    }

    afterLayerSwap(layer_name: string) {

    }
}
