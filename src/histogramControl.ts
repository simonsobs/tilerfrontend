import {
  SVG,
  PointArray,
  Svg,
  Image,
  Polyline,
  Text,
  Line,
} from "@svgdotjs/svg.js";
import { histogram, edges } from "./data";
import * as L from "leaflet";

var $ = require("jquery");
// TS: ignore - required for build step as jquery no longer exports jQuery
window.$ = window.jQuery = $;
require("jquery-ui-bundle");
import "jquery-ui-bundle/jquery-ui.css";

export class ColorMap {
  /* Name of the color map */
  name: string;
  /* Url pointing to the color map image */
  url: string;

  constructor(name: string, url: string) {
    this.name = name;
    this.url = url;
  }
}

export interface HistogramControlOptions extends L.ControlOptions {
  size_x: number;
  size_y: number;
  color_maps: ColorMap[];
  histogram: number[];
  edges: number[];
  initial_value: number[];
  x_label?: string;
  change_callback?: CallableFunction;
  slide_callback?: CallableFunction;
}

export class HistogramControl extends L.Control {
  options: HistogramControlOptions;

  base_element: HTMLElement;

  /* SVG Background and image */
  draw: Svg;
  image: Image;
  color_map: ColorMap;
  numbers: Text[];
  lines: Line[];
  polygon: PointArray;
  polyline: Polyline;

  /* Histogram values */
  edge_start: number;
  edge_end: number;
  histogram_start: number;
  histogram_end: number;

  /* Slider object */
  value: number[];
  slider: any;
  x_label: HTMLElement;

  /* Popup window and manual settings */
  popup: HTMLElement;

  constructor(options?: HistogramControlOptions) {
    super(options);

    this.color_map = this.options.color_maps[0];
    this.value = this.options.initial_value;
  }

  create_svg() {
    this.draw = SVG().size(this.options.size_x, this.options.size_y);

    /* Draw the first color map */
    this.image = this.draw.image(this.color_map.url);
    this.image.fill("pink");
    /* We want the image to be stretched upwards as much as possible as it's repeating */
    this.image.attr("preserveAspectRatio", "none");
    this.image.addClass("histogram-image");

    /* Image styling! */
    /* Apply the semi-transparent mask */
    const mask = this.draw.gradient("linear", (add) => {
      add.stop({ offset: 0.0, color: "#000" });
      add.stop({ offset: 0.1, color: "#888" });
      add.stop({ offset: 0.2, color: "#ddd" });
      add.stop({ offset: 1, color: "#fff" });
    });
    mask.rotate(90);

    const rect = this.draw.rect(this.options.size_x, this.options.size_y);
    rect.fill(mask);
    this.image.maskWith(rect);

    /* Create line objects */
    this.lines = [
      this.draw.line(0, 0, 0, this.options.size_y),
      this.draw.line(0, 0, 0, this.options.size_y),
    ];
    this.lines.map((x) => {
      x.stroke({ width: 1, color: "white" });
    });

    /* Now create the empty text objects, they will be correctly placed in the update_image function */
    // this.numbers = [this.draw.plain(""), this.draw.plain("")];

    // this.numbers.map((x) => {
    //   x.addClass("histogram-number");
    // });

    this.draw.addTo(this.base_element);

    return;
  }

  _translate(data: number, min: number, max: number, size: number): number {
    return ((data - min) / (max - min)) * size;
  }

  translate_edge(edge: number): number {
    return this._translate(
      edge,
      this.edge_start,
      this.edge_end,
      this.options.size_x
    );
  }

  translate_histogram(hist: number): number {
    return this._translate(
      hist,
      this.histogram_start,
      this.histogram_end,
      this.options.size_y
    );
  }

  update_image() {
    const x_start = this.translate_edge(this.value[0]);
    const x_end = this.translate_edge(this.value[1]);
    this.image.x(x_start);
    this.image.size(x_end - x_start, this.options.size_y);

    /* Now update the color map, if present */
    if (this.color_map) {
      this.image.load(this.color_map.url);
    } else {
      this.image.fill("pink");
    }

    /* Offset from anchor point in pixels */
    const offset = 10;
    /* Y anchor is bottom left */
    // const y_anchor = this.options.size_y * 0.1;

    /* Update line positions */
    this.lines[0].plot(x_start, 0, x_start, this.options.size_y);
    this.lines[1].plot(x_end, 0, x_end, this.options.size_y);

    /* Numbers are not used currently */
    // /* Change the text to be at the correct position */
    // this.numbers[0].text(this.value[0].toFixed(0));
    // this.numbers[0].x(x_start + offset);
    // this.numbers[0].y(y_anchor);
    // this.numbers[0].font({ anchor: "start" });

    // /* For some reason, we need to anchor to the start to set the
    //  * position, and then re-anchor to the end. Otherwise the
    //  * anchor is set incorrectly. */
    // this.numbers[1].font({ anchor: "start" });
    // this.numbers[1].text(this.value[1].toFixed(0));
    // this.numbers[1].x(x_end - offset);
    // this.numbers[1].y(y_anchor);
    // this.numbers[1].font({ anchor: "end" });
  }

  update_x_label() {
    if (this.x_label) {
      this.x_label.textContent = (
        String(this.value[0].toFixed(0)) +
          " < " +
          this.options.x_label +
          " < " +
          String(this.value[1].toFixed(0))
      );
    }
  }

  draw_histogram() {
    const edges = this.options.edges;
    const histogram = this.options.histogram;

    /* Translate the data into pixelization co-ordinates */

    this.edge_start = Math.min(...edges);
    this.edge_end = Math.max(...edges);
    this.histogram_start = Math.min(...histogram);
    /* Add a little buffer, we don't want the histogram to touch the top of the
     * image */
    this.histogram_end = Math.max(...histogram) * 1.05;

    /* Now we have the histogram data, we can re-size the background. */
    this.update_image();

    /* Now we have edges translated, and histograms, we can create the list of points to draw
     * for our polygon */

    const generate_polygon = (
      edges: number[],
      histogram: number[],
      size_x: number,
      size_y: number
    ): PointArray => {
      var polygon: number[] = [];

      /* First point is the bottom left corner */
      polygon.push(0, size_y);
      polygon.push(histogram[0], size_y);

      for (let i = 0; i <= histogram.length - 1; i++) {
        polygon.push(edges[i], size_y - histogram[i]);
        polygon.push(edges[i + 1], size_y - histogram[i]);
      }

      /* Last point is bottom right corner, then wrap back around to the start. */
      polygon.push(edges[edges.length - 1], size_y);
      polygon.push(size_x, size_y);
      polygon.push(0, size_y);

      return new PointArray(polygon);
    };

    this.polygon = generate_polygon(
      edges.map((x) => {
        return this.translate_edge(x);
      }),
      histogram.map((x) => {
        return this.translate_histogram(x);
      }),
      this.options.size_x,
      this.options.size_y
    );

    this.polyline = this.draw
      .polyline(this.polygon)
      .fill("black")
      .stroke({ width: 1, color: "white" });
    this.polyline.attr({ "fill-opacity": 0.5 });

    this.polyline.addClass("histogram-fill");

    return;
  }

  create_color_picker() {
    this.base_element.style.position = "relative";
    const color_selector = L.DomUtil.create(
      "div",
      "histogram-color-selector",
      this.base_element
    );
    color_selector.id = "histogram-color-selector";

    color_selector.style.display = "none";
    (color_selector.style.position = "absolute"),
      (color_selector.style.top = "5px");
    color_selector.style.left = "5px";

    const color_select = L.DomUtil.create(
      "select",
      "histogram-color-select",
      color_selector
    );
    color_select.id = "histogram-color-select";

    /* Tell the map grid to not react when we click on this little box. */
    color_select.addEventListener("mousedown", (e: Event) => {
      e.stopPropagation();
    });
    color_selector.addEventListener("mousedown", (e: Event) => {
      e.stopPropagation();
    });

    color_select.addEventListener("change", (e: Event) => {
      /* Find which map we selected */
      /* Note as this is an arrow function 'this' refers to the parent object,
       * not the select element. We want to update the parent object with this
       * event handler... */
      const new_value = String(color_select.value);
      const new_color_map: ColorMap = this.options.color_maps.filter((item) => {
        return item.name === new_value;
      })[0];

      this.color_map = new_color_map;
      this.update_image();

      /* Call back into our change callback */
      if (this.options.change_callback) {
        this.options.change_callback(this.value, this.color_map);
      }

      e.stopPropagation();

      /* Stop displaying the color selector */
      color_selector.style.display = "none";
    });

    for (let i = 0; i < this.options.color_maps.length; i++) {
      const option = L.DomUtil.create(
        "option",
        "histogram-color-option",
        color_select
      );
      option.value = this.options.color_maps[i].name;
      option.text = this.options.color_maps[i].name;
    }

    /* Add callback to the image to display the selector on click */
    this.image.click((e: Event) => {
      color_selector.style.display = "block";
      e.stopPropagation();
    });
  }

  create_slider() {
    /* Now create the slider bar. */
    const slider_container = L.DomUtil.create(
      "div",
      "histogram-slider",
      this.base_element
    );
    slider_container.id = "histogram-slider-range";
    slider_container.style.width = String(this.options.size_x);
    slider_container.style.marginTop = "-10px";

    this.slider = $(slider_container).slider({
      range: true,
      min: this.edge_start,
      max: this.edge_end,
      values: this.value,
      slide: (e: Event, ui) => {
        this.value = ui.values;
        this.update_image();
        this.update_x_label();
        if (this.options.slide_callback) {
          this.options.slide_callback(this.value, this.color_map);
        }
        e.stopPropagation();
      },
      change: (e: Event, ui) => {
        if (this.options.change_callback) {
          this.options.change_callback(this.value, this.color_map);
        }
        e.stopPropagation();
      },
    });

    slider_container.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });

    /* Now create the x label, if required */
    if (this.options.x_label) {
      this.x_label = L.DomUtil.create("div", "histogram-label ui-corner ui-widget ui-widget-content", this.base_element);
      this.x_label.id = "histogram-x-label";

      this.x_label.style.width = String(this.options.size_x);
      this.x_label.style.textAlign = "center";
      // this.x_label.style.margin = "0.25em";
      this.x_label.style.backgroundColor = "white";
      this.x_label.style.borderRadius = "2px";

      this.x_label.addEventListener("mousedown", (e: Event) => {
        e.stopPropagation();
      });

      this.update_x_label();
    }
  }

  create_popup() {
    /* Creates a pop-up window for manually setting all of the variables */
    this.popup = L.DomUtil.create("div", "histogram-popup", this.base_element);
    this.popup.title = "Custom color map parameters";
    this.popup.id = "histogram-popup";

    const info = L.DomUtil.create("p", "histogram-info", this.popup);
    info.textContent = "Manually set all the colour map values. If your map disappears, you have entered an invalid value.";

    /* Create the form elements */
    const form = L.DomUtil.create("form", "histogram-form", this.popup);
    const fieldset = L.DomUtil.create("fieldset", "histogram-fieldset", form);

    const generate_generic_field = (label: string, id: string, value: string, type: string): [HTMLLabelElement, HTMLInputElement] => {
      const field_label = L.DomUtil.create("label", "histogram-label", fieldset);
      field_label.htmlFor = id;
      field_label.textContent = label;

      const field = L.DomUtil.create("input", "text ui-widget-content ui-corner-all", fieldset);
      field.id = id;
      field.type = type;
      field.value = String(value);
      field.style.display = "block";
      field.style.marginTop = "0.5em";
      field.style.marginBottom = "1em";
      field.style.width = "95%";


      return [field_label, field];
    }

    const [cmap_label, cmap] = generate_generic_field("Color map", "cmap", this.color_map.name, "text");

    const generate_minmax_field = (label: string, id: string, value: string): [HTMLLabelElement, HTMLInputElement] => {
      var new_label = label;

      if (this.options.x_label) {
         new_label += " of " + this.options.x_label;
      }

      return generate_generic_field(new_label, id, value, "number");
    }

    const [vmin_label, vmin] = generate_minmax_field("Minimum", "vmin", String(this.value[0]));
    const [vmax_label, vmax] = generate_minmax_field("Maximum", "vmax", String(this.value[1]));

    const dialog = $(this.popup).dialog({
      autoOpen: false,
      height: 450,
      width: 350,
      modal: false,
      buttons: {
        "Update Map": () => {
          this.value[0] = Number(vmin.value);
          this.value[1] = Number(vmax.value);

          try {
            this.color_map = this.options.color_maps.filter((item) => {
              return item.name === cmap.value;
            })[0];

            if (this.color_map === undefined) {
              throw Error("Unable to match colour map");
            }
          } catch (e) {
            /* Try our best to guess the URL! */
            this.color_map = new ColorMap(
              cmap.value, this.options.color_maps[0].url.replace(this.options.color_maps[0].name, cmap.value),
            );
          }

          this.slider.slider({values: this.value});

          this.update_image();
          this.update_x_label();

          if (this.options.change_callback) {
            this.options.change_callback(this.value, this.color_map);
          }

          dialog.dialog("close");
        }
      }
    })

    /* Open the popup on double click */
    this.base_element.addEventListener("dblclick", (e) => {
      e.stopPropagation(); 

      /* Set the values to their current! */
      cmap.value = this.color_map.name;
      vmin.value = String(this.value[0]);
      vmax.value = String(this.value[1]);
      
      dialog.dialog("open");
    });
  }

  onAdd(map) {
    const leaflet_element = L.DomUtil.create(
      "div",
      "leaflet-control-histogram"
    );
    this.base_element = L.DomUtil.create("div", "", leaflet_element);

    this.create_svg();
    this.draw_histogram();
    this.create_color_picker();
    this.create_slider();
    this.create_popup();

    return leaflet_element;
  }
}
