import * as L from "leaflet";
var $ = require("jquery");
// TS: ignore - required for build step as jquery no longer exports jQuery
window.$ = window.jQuery = $;
require("jquery-ui-bundle");
import "jquery-ui-bundle/jquery-ui.css";
import { histogram, edges, centers } from "./data";
import * as Plot from "@observablehq/plot";

export class ChartControl extends L.Control {
  map: L.Map;
  popup: HTMLElement;
  base_element: HTMLElement;

  constructor(options?: L.ControlOptions) {
    super(options);

  }

  createButton() {
    const button = L.DomUtil.create("button", "", this.base_element);
    button.innerText = "Analyse";
    button.addEventListener("click", (event) => {
      $(this.popup).dialog("open");
    });
  }

  createDialog() {
    this.popup = L.DomUtil.create("div", "leaflet-control-chart-popup", this.base_element);

    const dialog = $(this.popup).dialog({
      autoOpen: false,
      height: 450,
      width: 600,
    })

    let data = [];

    for (let i = 0; i < centers.length - 1; i++) {
      data.push({"Temperature (mK)": centers[i], "Histogram": histogram[i]});
    }

    /* TODO: Sizing and Resizing Automagically */

    const plot = Plot.plot({
      marks: [
        Plot.frame(),
        Plot.lineY(data, {x: "Temperature (mK)", y: "Histogram"}),
      ]
    });


    this.popup.appendChild(plot);
  }

  onAdd(map: L.Map): HTMLElement {
    this.map = map;
    this.base_element = L.DomUtil.create("div", "leaflet-control-chart");

    this.createDialog();
    this.createButton();

    return this.base_element;
  }
}