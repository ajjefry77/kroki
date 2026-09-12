let libPromise = null;
let cssPromise = null;

export function loadMapbox() {
  if (!libPromise)
    libPromise = import("mapbox-gl").then((m) => m.default || m);
  return libPromise;
}

export function loadMapboxCss() {
  if (!cssPromise) cssPromise = import("mapbox-gl/dist/mapbox-gl.css");
  return cssPromise;
}

export function loadMap() {
  return Promise.all([loadMapbox(), loadMapboxCss()]).then(([lib]) => lib);
}
