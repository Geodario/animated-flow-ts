export type ShaderType = "vertex-shader" | "fragment-shader";

export type GLSLVersion = "#version 100" | "#version 300 es";

export type GLSLOptions = { version: "#version 100" | "#version 300 es"; positionOutputName?: string; colorOutputName?: string; };