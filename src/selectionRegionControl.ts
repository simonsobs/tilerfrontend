import * as L from "leaflet";

export interface SelectionRegionOptions extends L.ControlOptions {}

export class SelectionRegionButton {
  button: HTMLElement;
  base: HTMLElement;
  text: string

  constructor(base: HTMLElement, text: string) {
    this.base = base;
    this.text = text;

    this.createButton();
  }

  private createButton() {
    this.button = L.DomUtil.create("button", "", this.base);
    this.button.innerText = this.text;
  }

  hide() {
    this.button.style.display = "none";
  }

  show() {
    this.button.style.display = "block";
  }

  addEventListener(event: string, callback: Function) {
    this.button.addEventListener(event, (event) => {callback(event); event.stopPropagation();});
  }
}

export class SelectionRegionControl extends L.Control {
  options: SelectionRegionOptions;

  base_element: HTMLElement;
  map: L.Map;

  /* Buttons */
  start_button: SelectionRegionButton;
  remove_button: SelectionRegionButton;
  passive_buttons: SelectionRegionButton[];

  constructor(options?: SelectionRegionOptions) {
    super(options);
  }

  private createButtons() {
    /* First create all the 'passive' buttons, those that will appear once 
     * we've selected the region and provide region-dependent functionality. */
    const download_fits = new SelectionRegionButton(this.base_element, "Download FITS");
    download_fits.addEventListener("click", (event) => {
      /* TODO: Connect these to API endpoints */
      console.log("Download FITS");
    });

    const download_png = new SelectionRegionButton(this.base_element, "Download PNG");
    download_png.addEventListener("click", (event) => {
      /* TODO: Connect these to API endpoints */
      console.log("Download PNG");
    });

    this.passive_buttons = [download_fits, download_png];

    this.start_button = new SelectionRegionButton(this.base_element, "Select Region");
    this.start_button.addEventListener("click", (event) => {
      /* The selection will be disabled by the handler once complete. */
      this.map.selection.enable();
      this.start_button.hide();
      this.map.getContainer().style.cursor = "crosshair";
    });

    this.remove_button = new SelectionRegionButton(this.base_element, "Remove Region");
    this.remove_button.addEventListener("click", (event) => {
      this.map.selection.reset();

      this.remove_button.hide();
      this.passive_buttons.forEach((button) => {button.hide()});

      this.start_button.show();
    });

    /* By default, hide the remove button and all passive buttons */
    this.remove_button.hide();
    this.passive_buttons.forEach((button) => {button.hide()});
  }

  /* Mutates the state of the buttons after drawing */
  mutateStateAfterDrawing() {
    this.remove_button.show();
    this.passive_buttons.forEach((button) => {button.show()});
  }

  onAdd(map: L.Map) {
    /* Map propagation and event addition */
    this.map = map;
    this.map.addHandler("selection", SelectionRegionHandler);

    /* First, create transparent overlay pane for the drawing handler */
    const overlay_pane = map.createPane("overlay");
    overlay_pane.style.zIndex = String(650);

    /* Create element for button controls */
    const leaflet_element = L.DomUtil.create(
      "div",
      "leaflet-control-selection-region"
    );

    this.base_element = L.DomUtil.create("div", "", leaflet_element);

    /* Create initial elements */
    this.createButtons();

    /* Add callback to event handler */

    this.map.selection.registerCallback(() => {
      this.mutateStateAfterDrawing();
    });

    return leaflet_element;
  }
}

export class SelectionRegionHandler extends L.Handler {
  private drawing: boolean = false;

  start_point: L.LatLng;
  end_point: L.LatLng;
  rectangle: L.Rectangle;
  callback: Function;

  private map: L.Map;
  private container: HTMLElement;

  constructor(map: L.Map) {
    super(map);

    /* Register map components in the object */
    this.map = map;
    this.container = map.getContainer();
  }

  addHooks() {
    L.DomEvent.on(this.container, "mousedown", this.onMouseDown, this);
  }

  removeHooks() {
    L.DomEvent.off(this.container, "mousedown", this.onMouseDown, this);
  }

  private onMouseDown(event: MouseEvent) {
    /* Stop messing with my map, dude! */
    this.map.dragging.disable();
    L.DomUtil.disableTextSelection();
    this.drawing = true;

    /* event.latlng seems to be undefined for some reason, so we need to convert manually. */
    this.start_point = this.map.containerPointToLatLng(
      new L.Point(event.x, event.y)
    );

    /* Create the rectangle. We will update it as we move the mouse. */
    this.createRectangle(
      new L.LatLngBounds(this.start_point, this.start_point)
    );

    /* Add drag and stop event listeners */
    L.DomEvent.on(this.container, "mousemove", this.onMouseMove, this);
    L.DomEvent.on(this.container, "mouseup", this.onMouseUp, this);
  }

  private onMouseMove(event: MouseEvent) {
    if (!this.drawing) {
      console.log(
        "This should never happen. Event handler for mouse move should never be called when not drawing"
      );
    } else {
      this.updateRectangleBounds(
        new L.LatLngBounds(
          this.start_point,
          this.map.containerPointToLatLng(new L.Point(event.x, event.y))
        )
      );
    }
  }

  private onMouseUp(event: MouseEvent) {
    this.drawing = false;

    /* event.latlng seems to be undefined for some reason, so we need to convert manually. */
    this.end_point = this.map.containerPointToLatLng(new L.Point(event.x, event.y));

    L.DomEvent.off(this.container, "mousemove", this.onMouseMove, this);
    L.DomEvent.off(this.container, "mouseup", this.onMouseUp, this);

    /* Resume messing with my map, dude! */
    this.map.dragging.enable();
    L.DomUtil.enableTextSelection();
    this.map.getContainer().style.cursor = "";

    /* Remove myself. My job is done here. */
    this.map.selection.disable();

    /* Finalise the style of the rectangle. */
    this.finaliseRectangle();
  }

  private createRectangle(bounds: L.LatLngBounds) {
    this.rectangle = new L.Rectangle(bounds);
    this.rectangle.addTo(this.map);
  }

  private updateRectangleBounds(bounds: L.LatLngBounds) {
    if (!this.rectangle) {
      console.log("Rectangle not created, and you are trying to update it");
    }
    this.rectangle.setBounds(bounds);
  }

  /* Register the callback with the handler. This will be called once the user has finished drawing. */
  registerCallback(callback: Function) {
    this.callback = callback;
  }

  private finaliseRectangle() {
    /* Make sure we are exactly bounding start and stop */
    this.updateRectangleBounds(
      new L.LatLngBounds(this.start_point, this.end_point)
    );

    /* Set the style of the rectangle to something different so they know they've finished. */
    this.rectangle.setStyle({ color: "black", fill: false } as L.PathOptions);

    if (this.callback) {
      this.callback();
    }
  }
  
  reset() {
    if (this.rectangle) {
      this.rectangle.remove();
      this.rectangle = undefined;
    }

    this.drawing = false;
    this.start_point = undefined;
    this.end_point = undefined;
  }
}
