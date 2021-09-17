import { Binary, Constant, FLOAT, Variable } from "../graphs/model";
import { GenerateGLSL } from "../graphs/visitors";

const vars = new Map<string, number[]>();
vars.set("x", [3]);

const e = new Binary(new Constant(FLOAT, [2]), "*", new Variable(FLOAT, "x"));
console.log(e.evaluate(vars));

console.log(e.format(new GenerateGLSL()));


// import { Property, Color, Interpolate, Position, Shading } from "../graphs/model";

// const shading = new Shading({
//   position: new Position(new Property("position", FLOAT2)),
//   color: new Color(new Interpolate(new Property("side", "float")))
// });

// const { vertexShader, fragmentShader } = shading.generateGLSLShaders();

// console.log(vertexShader, fragmentShader);