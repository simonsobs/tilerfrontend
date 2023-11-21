import { TileLayer, latLng, latLngBounds, tileLayer } from "leaflet";
import "./mutableTileLayer";


interface tileLayerOptions {
    initialized: boolean;
    refinement_levels: number;
    base_grid_size: number;
}

export interface tileRenderingOptions {
    cmap: string;
    vmin: number;
    vmax: number;
}

interface fileInfo {
    name: string;
}

export class LayerLoader {
    server: string;
    file_list: fileInfo[];
    base_layers: { [key: string]: TileLayer } = {};
    rendering_options: { [key: string]: tileRenderingOptions } = {};
    current_layer: string;

    constructor(server: string) {
        this.server = server;
    }

    async get_file_list() : Promise<fileInfo[]> {
        const response = await fetch(this.server);

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const raw_file_list = await response.json() ;
        this.file_list = raw_file_list["files"] as fileInfo[];

        return this.file_list;
    }

    async get_tile_layer_metadata(file: string): Promise<tileLayerOptions> {
        const response = await fetch(`${this.server}/${file}`);

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json() as tileLayerOptions;

        return data;
    }

    async get_tile_layers(): Promise<{ [key: string]: TileLayer }> {
        /* Get a fresh file list! */
        await this.get_file_list();

        /* Reset base layers, we might be getting called again and do not want
         * duplicates. */
        this.base_layers = {};
        this.rendering_options = {};

        for (const image_file of this.file_list) {
            const file_name: string = image_file.name;

            const metadata = await this.get_tile_layer_metadata(file_name);
            
            /* TODO: API endpoint needs to provide top left and bottom right */
            const top_left = latLng(23, -180);
            const bottom_right = latLng(-63, 180);
            const bounds = latLngBounds(top_left, bottom_right);
            /* TODO: API endpoint needs to provide max and min zoom */
            const min_native_zoom: number = -3;
            const max_native_zoom: number = 5;
            /* TODO: API endpoint needs to provide rendering options */
            const rendering_options: tileRenderingOptions = {
                cmap:"viridis", vmin:-500, vmax:500
            };

            /* Ignore the linter; mutableTileLayer is added as an extension */
            const layer = tileLayer.mutableTileLayer(`${this.server}/${file_name}/{z}/tile_{x}_{y}.webp`, {
                /* Even if the tile size is not 256, we still need to set it as this. I
                 * have no idea why, but if you set it as the correct value everything breaks */
                tileSize: 256,
                zoomOffset: 0,
                minZoom: 0,
                maxZoom: metadata.refinement_levels + 3,
                noWrap: true,
                minNativeZoom: min_native_zoom,
                maxNativeZoom: max_native_zoom,
                bounds: bounds,
                keepBuffer: 16,
                tms: true,
                parameters: rendering_options,
            });

            this.base_layers[file_name] = layer;
            this.rendering_options[file_name] = rendering_options;
        }

        return this.base_layers;
    }

    /* Add a single layer to the map. If layer_name is not specified, the first
     * layer in the file_list is selected */
    add_to_map(map: L.Map, layer_name?: string) {
        if (layer_name === undefined) {
            if (this.file_list.length === 0) {
                Error("No layers to add to map");
            }

            layer_name = this.file_list[0].name;
        }

        if (this.base_layers[layer_name] === undefined) {
            throw new Error(`Layer ${layer_name} does not exist`);
        }

        this.base_layers[layer_name].addTo(map);
        this.current_layer = layer_name;
    }

    /* Update the _current layer_'s rendering options */
    update_rendering_options(options: tileRenderingOptions) {
        this.rendering_options[this.current_layer] = options;
        this.base_layers[this.current_layer].setParameters(options);
    }
}