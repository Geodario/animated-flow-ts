/*
  Copyright 2021 Esri
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

/**
 * @module animated-flow-ts/apps/winds
 *
 * An app that uses real UV wind data from an imagery tile layer and combines
 * using blend modes with another layer.
 */

 import EsriMap from "esri/Map";
 import MapView from "esri/views/MapView";
 import { FlowLayer } from "../flow/layer";
 import esriConfig from "esri/config";
import TileLayer from "esri/layers/TileLayer";
import ImageryTileLayer from "esri/layers/ImageryTileLayer";
import GroupLayer from "esri/layers/GroupLayer";
 
// Tell the worker frameworks the location of the modules.
esriConfig.workers.loaderConfig = {
  packages: [
    {
      name: "animated-flow-ts",
      location: location.origin + "/demos/js"
    }
  ]
};

// A tile layer is used as basemap.
const tileLayer = new TileLayer({
  url: "https://tiles.arcgis.com/tiles/nGt4QxSblgDfeJn9/arcgis/rest/services/Spilhaus_Vibrant_Basemap/MapServer",
  effect: "saturate(10%) brightness(0.3)"
});

const currentsLayer = new ImageryTileLayer({
  url: "https://tiledimageservices.arcgis.com/jIL9msH9OI208GCb/arcgis/rest/services/Spilhaus_UV_ocean_currents/ImageServer"
});

const temperatureLayer = new ImageryTileLayer({
  url: "https://tiledimageservices.arcgis.com/jIL9msH9OI208GCb/arcgis/rest/services/HyCOM_Surface_Temperature___Spilhaus/ImageServer"
});

const flowLayer = new FlowLayer({
  url: "https://tiledimageservices.arcgis.com/jIL9msH9OI208GCb/arcgis/rest/services/Spilhaus_UV_ocean_currents/ImageServer",
  useWebWorkers: true,
  blendMode: "destination-in"
} as any);

// We create a group layer to combine temperature and wind in a single visualization
// where the temperature drives the color of the streamlines.
const groupLayer = new GroupLayer({
  effect: "bloom(1.5, 0.5px, 0.2)"
});
groupLayer.add(temperatureLayer);
groupLayer.add(flowLayer);

const map = new EsriMap({
  layers: [tileLayer, currentsLayer, groupLayer]
});

// Create the map view.
new MapView({
  container: "viewDiv",
  map,
  zoom: 4,
  center: [-98, 39]
});
 