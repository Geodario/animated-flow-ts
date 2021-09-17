export type ShaderType = "vertex-shader" | "fragment-shader";

export type GLSLVersion = "#version 100" | "#version 300 es";

export type GLSLOptions =
  { version: "#version 100", positionOutputName?: string, colorOutputName?: string } |
  { version: "#version 300 es", positionOutputName?: string, positionNeededInFragmentShader?: boolean };