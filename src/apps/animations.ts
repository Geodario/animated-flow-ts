import { Attribute, Color, Interpolate, Position, Shading } from "../animations/model";

const shading = new Shading({
  position: new Position(new Attribute("position", "vec2")),
  color: new Color(new Interpolate(new Attribute("side", "float")))
});

const { vertexShader, fragmentShader } = shading.generateGLSLShaders();

console.log(vertexShader, fragmentShader);