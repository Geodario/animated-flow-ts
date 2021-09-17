import { Constant, VEC4 } from "../graphs/model";
import { Shader } from "../graphs/shaders";


const vs = new Shader({
  type: "vertex-shader",
  inputs: [],
  uniforms: [],
  outputs: {
    o_Position: new Constant(VEC4, [0, 0, 0, 1])
  }
});

const fs = new Shader({
  type: "fragment-shader",
  inputs: [],
  uniforms: [],
  outputs: {
    o_Diffuse: new Constant(VEC4, [0, 0, 0, 1]),
    o_Normal: new Constant(VEC4, [0, 0, 0, 1])
  }
});

console.log(vs.generateGLSL({ version: "#version 100", positionOutputName: "o_Position", colorOutputName: "o_Diffuse" }));
console.log(fs.generateGLSL({ version: "#version 100", positionOutputName: "o_Position", colorOutputName: "o_Diffuse" }));
console.log(vs.generateGLSL({ version: "#version 300 es" }));
console.log(fs.generateGLSL({ version: "#version 300 es" }));

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