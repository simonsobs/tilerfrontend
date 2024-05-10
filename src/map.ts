import { map, MapOptions, CRS } from "leaflet";
import 'leaflet/dist/leaflet.css';

import { HistogramControl, HistogramControlOptions, ColorMap } from "./histogramControl";
import { SelectionRegionControl } from "./selectionRegionControl";
import { ChartControl } from "./chartControl";
import { histogram, edges } from "./data";
import { AstroControl } from "./astroControl";
import { LayerLoader, tileRenderingOptions } from "./layerLoader"
import { MutableLayerControl, MutableLayerControlOptions } from "./layerControl";

const api_endpoint_container: HTMLElement = document.getElementById("api-endpoint-server");
const websocket_endpoint_container: HTMLElement = document.getElementById("websocket-endpoint-server");

const SERVER: string = api_endpoint_container.innerHTML;
const WEBSOCKET: string = websocket_endpoint_container.innerHTML;
console.log("Server set to:", SERVER);

const options: MapOptions = {
    "center": [0.0, 0.0],
    "zoom": 2,
    "crs": CRS.EPSG4326,
};

const mymap = map('map', options);


const layers = new LayerLoader(SERVER, WEBSOCKET);
layers.get_tile_layers().then(() => { 
    layers.add_to_map(mymap);

    new MutableLayerControl(
        {position: "topright", layers: layers, mutable_associated_elements: [layers]} as MutableLayerControlOptions
    ).addTo(mymap);

    let starting_options = layers.get_rendering_options()

    layers.histogram_control = new HistogramControl(
        {
            position: "bottomleft",
            size_x: 200,
            size_y: 100,
            color_maps: [
                new ColorMap(starting_options.cmap,`${SERVER}histograms/${starting_options.cmap}.png`),
                new ColorMap("viridis", `${SERVER}histograms/viridis.png`),
                new ColorMap("inferno", `${SERVER}histograms/inferno.png`)
            ],
            /* TODO: Histogram and edges need to come from the endpoint */
            histogram: histogram,
            edges: edges,
            /* TODO: Read these from the endpoint! */
            initial_value: [starting_options.vmin, starting_options.vmax],
            x_label: "T [μK]",
            change_callback: (values, cmap) => {
                const new_options = {
                    cmap: cmap.name,
                    vmin: values[0],
                    vmax: values[1]
                } as tileRenderingOptions;
                layers.update_rendering_options(new_options); 
            },
    } as HistogramControlOptions).addTo(mymap); 
});

/* TODO AstroControl does not believe we are in equirectangular... */
new AstroControl().addTo(mymap);
/* Graticule is pretty nasty, avoid */
// new Graticule().addTo(mymap);

// new SelectionRegionControl({position: "bottomright"}).addTo(mymap);
// new ChartControl({position: "bottomleft"}).addTo(mymap);
