import * as L from "leaflet";

import { LayerLoader } from "./layerLoader";

export interface MutableLayerControlOptions extends L.ControlOptions {
    // A bit naughty, can probably create a shared interface.
    mutable_associated_elements: any[];

    // Also stores the current layer.
    layers: LayerLoader;
}

export class MutableLayerControl extends L.Control {
    map: L.map;
    base_element: HTMLElement;
    options: MutableLayerControlOptions;

    constructor(options?: MutableLayerControlOptions) {
        super(options);
    }

    createButtonForLayer(layer_name: string) {
        const button = L.DomUtil.create("button", "", this.base_element);
        button.innerText = layer_name;
        button.style.display = "block";
        button.addEventListener("click", (event) => {
            event.stopPropagation();

            for (const element of this.options.mutable_associated_elements) {
                element.beforeLayerSwap(layer_name);
            }

            this.swapLayerTo(layer_name);

            for (const element of this.options.mutable_associated_elements) {
                element.afterLayerSwap(layer_name);
            }
        });
    }

    createButtons() {
        for (const layer_name of this.options.layers.layer_list) {
            this.createButtonForLayer(layer_name);
        }
    }

    swapLayerTo(layer_name: string) {
        if (this.options.layers.current_layer == layer_name) {
            return;
        }

        this.map.addLayer(
            this.options.layers.base_layers[layer_name]
        );
        this.map.removeLayer(
            this.options.layers.base_layers[
                this.options.layers.current_layer
            ]
        );
        this.options.layers.current_layer = layer_name;
    }

    onAdd(map: L.Map) {
        this.map = map;

        /* Create element for button controls */
        const leaflet_element = L.DomUtil.create(
            "div",
            "leaflet-control-mutable-layer"
        );
  
        this.base_element = L.DomUtil.create("div", "", leaflet_element);

        this.createButtons();
        
        return leaflet_element;
    }
}