

import { defined } from "../core/util";
import { VEC4 } from "../graphs/model";
import NodeManager from "../graphs/NodeManager";
import { createProgram, createShader } from "../webgl/util";

const nodes = new NodeManager();

const canvas1 = document.createElement("canvas");
canvas1.width = 320;
canvas1.height = 180;
canvas1.style.border = "1px solid black";
document.body.appendChild(canvas1);
const gl1 = canvas1.getContext("webgl");
defined(gl1);

const canvas2 = document.createElement("canvas");
canvas2.width = 320;
canvas2.height = 180;
canvas2.style.border = "1px solid black";
document.body.appendChild(canvas2);
const gl2 = canvas2.getContext("webgl2");
defined(gl2);

const technique = nodes.technique({
  position: nodes.constant(VEC4, [0, 0, 0, 1]),
  color: nodes.constant(VEC4, [0, 0, 0, 1]),
});

const vs = nodes.shader(technique.getVertexShaderDefinition());
const fs = nodes.shader(technique.getFragmentShaderDefinition());

console.log(vs.generateGLSL({ version: "#version 100" }));
console.log(fs.generateGLSL({ version: "#version 100" }));
console.log(vs.generateGLSL({ version: "#version 300 es" }));
console.log(fs.generateGLSL({ version: "#version 300 es" }));

createProgram(gl1, createShader(gl1, gl1.VERTEX_SHADER, vs.generateGLSL({ version: "#version 100" })), createShader(gl1, gl1.FRAGMENT_SHADER, fs.generateGLSL({ version: "#version 100" })));

// import { VEC4 } from "../graphs/model";
// import NodeManager from "../graphs/NodeManager";
// import { Shader } from "../graphs/shaders";

// const nodes = new NodeManager();

// const vs = new Shader({
//   type: "vertex-shader",
//   inputs: [],
//   uniforms: [],
//   outputs: {
//     o_Position: nodes.constant(VEC4, [0, 0, 0, 1])
//   }
// });

// const fs = new Shader({
//   type: "fragment-shader",
//   inputs: [],
//   uniforms: [],
//   outputs: {
//     o_Diffuse: nodes.constant(VEC4, [0, 0, 0, 1]),
//     o_Normal: nodes.constant(VEC4, [0, 0, 0, 1])
//   }
// });

// console.log(vs.generateGLSL({ version: "#version 100", positionOutputName: "o_Position", colorOutputName: "o_Diffuse" }));
// console.log(fs.generateGLSL({ version: "#version 100", positionOutputName: "o_Position", colorOutputName: "o_Diffuse" }));
// console.log(vs.generateGLSL({ version: "#version 300 es" }));
// console.log(fs.generateGLSL({ version: "#version 300 es" }));







// import { defined } from "../core/util";
// import { Binary, Constant, FLOAT, MAT2, Variable } from "../graphs/model";
// import { GLSLFormatter } from "../graphs/visitors";

// const vars = new Map<string, number[]>();
// vars.set("x", [0.6, -0.2, -0.7, 0.4]);

// const e1 = new Binary(new Constant(FLOAT, [2]), "+", new Variable(FLOAT, "x"));
// console.log(e1.evaluate((name) => {
//   const value = vars.get(name);
//   defined(value);
//   return value;
// }));
// console.log(e1.format(new GLSLFormatter()));

// // const e2 = new Binary(new Constant(MAT2, [4, 2, 7, 6]), "*", new Variable(MAT2, "x"));
// const e2 = new Binary(new Binary(new Constant(MAT2, [3, 1, 6, 5]), "+", new Constant(FLOAT, [1])), "*", new Variable(MAT2, "x"));
// console.log(e2.evaluate((name) => {
//   const value = vars.get(name);
//   defined(value);
//   return value;
// }));
// console.log(e2.format(new GLSLFormatter()));




// import { Property, Color, Interpolate, Position, Shading } from "../graphs/model";

// const shading = new Shading({
//   position: new Position(new Property("position", FLOAT2)),
//   color: new Color(new Interpolate(new Property("side", "float")))
// });

// const { vertexShader, fragmentShader } = shading.generateGLSLShaders();

// console.log(vertexShader, fragmentShader);