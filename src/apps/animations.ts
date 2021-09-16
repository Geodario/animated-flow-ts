import { Property, Color, Interpolate, Position, Shading } from "../graphs/model";

const shading = new Shading({
  position: new Position(new Property("position", FLOAT2)),
  color: new Color(new Interpolate(new Property("side", "float")))
});

const { vertexShader, fragmentShader } = shading.generateGLSLShaders();

console.log(vertexShader, fragmentShader);