import { map, MapOptions, CRS } from "leaflet";
import 'leaflet/dist/leaflet.css';

import { HistogramControl, HistogramControlOptions, ColorMap } from "./histogramControl";
import { SelectionRegionControl } from "./selectionRegionControl";
import { ChartControl } from "./chartControl";
import { histogram, edges } from "./data";
import { AstroControl } from "./astroControl";
import { LayerLoader, tileRenderingOptions } from "./layerLoader"


const options: MapOptions = {
    "center": [0.0, 0.0],
    "zoom": 2,
    "crs": CRS.EPSG4326,
};

const mymap = map('map', options);

const SERVER: string = "http://127.0.0.1:8000";

const layers =  new LayerLoader(SERVER);
layers.get_tile_layers().then(() => { layers.add_to_map(mymap); });

new AstroControl().addTo(mymap);
/* Graticule is pretty nasty, avoid */
// new Graticule().addTo(mymap);

new HistogramControl(
    {
        position: "bottomleft",
        size_x: 200,
        size_y: 100,
        /* TODO: Available cololur maps need to come from the endpoint */
        color_maps: [new ColorMap("viridis", "./static/viridis.png"), new ColorMap("inferno", "./static/inferno.png")],
        /* TODO: Histogram and edges need to come from the endpoint */
        histogram: histogram,
        edges: edges,
        /* TODO: Read these from the endpoint! */
        initial_value: [-500, 500],
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

new SelectionRegionControl({position: "bottomright"}).addTo(mymap);

new ChartControl({position: "bottomleft"}).addTo(mymap);
