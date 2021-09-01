import Color from "esri/Color";
import Extent from "esri/geometry/Extent";
import SpatialReference from "esri/geometry/SpatialReference";
import { MapUnits, VisualizationRenderParams } from "../core/types";
import { defined } from "../core/util";
import { MainFlowProcessor } from "../flow/processors";
import { FlowVisualizationStyle } from "../flow/rendering";
import { FlowSettings } from "../flow/settings";
import { VectorFieldFlowSource } from "../flow/sources";
import { Field, PixelsPerSecond } from "../flow/types";

// Create canvas.
const canvas = document.createElement("canvas");
canvas.width = 640;
canvas.height = 360;
document.body.appendChild(canvas);
const gl = canvas.getContext("webgl");
defined(gl);
gl.getExtension("OES_element_index_uint");
gl.getExtension("OES_vertex_array_object");

// Settings.
const settings = new FlowSettings();
settings.color = new Color([0, 100, 200, 1]);
settings.linesPerVisualization = 5000;

// Data source.
function createVortex(vortexCenter: [MapUnits, MapUnits]): Field {
  return (x, y) => {
    x -= vortexCenter[0];
    y -= vortexCenter[1];
    const d2 = x * x + y * y;
    return [-10.0 * y / d2, -10.0 * x / d2];
  };
}
const vortex1 = createVortex([-98, 39]);
const vortex2 = createVortex([-98 + 20, 39]);
const vortex3 = createVortex([-98 - 10, 39 - 10]);
const windVectorField = (x: MapUnits, y: MapUnits): [PixelsPerSecond, PixelsPerSecond] => {
  const v1 = vortex1(x, y);
  const v2 = vortex2(x, y);
  const v3 = vortex3(x, y);
  return [v1[0] + v2[0] + v3[0], v1[1] + v2[1] + v3[1]];
};
const source = new VectorFieldFlowSource(windVectorField);

// Data processor.
const processor = new MainFlowProcessor();

// The visualization style combines them together.
const flowVizStyle = new FlowVisualizationStyle(settings, source, processor);

async function main(): Promise<void> {
  defined(gl);
  const globalResources = await flowVizStyle.loadGlobalResources();
  const localResources = await flowVizStyle.loadLocalResources(
    new Extent({
      spatialReference: SpatialReference.WGS84,
      xmin: -98 - 32,
      xmax: -98 + 32,
      ymin: 39 - 18,
      ymax: 39 + 18
    }),
    0.1,
    [640, 360],
    1,
    new AbortController().signal
  );

  globalResources.attach(gl);
  localResources.attach(gl);

  function render(): void {
    defined(gl);
    const renderParams: VisualizationRenderParams = {
      size: [640, 360],
      translation: [0, 0],
      rotation: 0,
      scale: 1,
      opacity: 1,
      pixelRatio: 1
    };

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    flowVizStyle.renderVisualization(gl, renderParams, globalResources, localResources);
    requestAnimationFrame(render);
  }
  
  requestAnimationFrame(render);
}

main();