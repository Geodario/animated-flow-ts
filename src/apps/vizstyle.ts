import Color from "esri/Color";
import Extent from "esri/geometry/Extent";
import SpatialReference from "esri/geometry/SpatialReference";
import { mat4 } from "gl-matrix";
import { MapUnits, VisualizationRenderParams } from "../core/types";
import { defined } from "../core/util";
import { MainFlowProcessor } from "../flow/processors";
import { FlowVisualizationStyle } from "../flow/rendering";
import { FlowSettings } from "../flow/settings";
import { VectorFieldFlowSource } from "../flow/sources";
import { Field, PixelsPerSecond } from "../flow/types";
import { GUI } from "dat.gui";

// Create canvas.
const canvas = document.createElement("canvas");
canvas.width = innerWidth;
canvas.height = innerHeight;
document.body.appendChild(canvas);
const gl = canvas.getContext("webgl");
defined(gl);
gl.getExtension("OES_element_index_uint");
gl.getExtension("OES_vertex_array_object");

// Settings.
const settings = new FlowSettings();
settings.color = new Color([0, 180, 255, 1]);
settings.fixedCellSize = 1;
settings.smoothing = 1;
settings.linesPerVisualization = 10000;
settings.verticesPerLine = 150;
settings.mergeLines = true;

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

const gui = new GUI();
const config = {
	tilt: 0,
  curvature: 5000,
  distance: 250
};
gui.add(config, "tilt").min(0).max(90).step(1);
gui.add(config, "curvature").min(100).max(5000).step(1);
gui.add(config, "distance").min(100).max(500).step(1);

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
    [1024, 1024],
    1,
    new AbortController().signal
  );

  globalResources.attach(gl);
  localResources.attach(gl);

  const projection = mat4.create();
  mat4.perspective(projection, 1, canvas.width / canvas.height, 1, 1000);

  const preCurve = mat4.create();
  const postCurve = mat4.create();

  function render(): void {
    defined(gl);

    mat4.identity(preCurve);
    mat4.identity(postCurve);
  
    mat4.translate(preCurve, preCurve, [-512, -512, 0]);
    const curvature = config.curvature;
    mat4.translate(postCurve, postCurve, [0, 0, -config.distance]);
    mat4.rotateX(postCurve, postCurve, -Math.PI * config.tilt / 180);
    // mat4.rotateZ(postCurve, postCurve, 0.1 * performance.now() / 1000.0);
    mat4.mul(postCurve, projection, postCurve);

    const renderParams: VisualizationRenderParams = {
      size: [0, 0],
      translation: [0, 0],
      rotation: 0,
      scale: 1,
      opacity: 1,
      pixelRatio: 1,
      
      preCurve,
      curvature,
      postCurve
    };

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    flowVizStyle.renderVisualization(gl, renderParams, globalResources, localResources);
    requestAnimationFrame(render);
  }
  
  requestAnimationFrame(render);
}

main();