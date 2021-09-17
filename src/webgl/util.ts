import { defined } from "../core/util";

export const GL_VERTEX_SHADER: number = 0x8b31;
export const GL_FRAGMENT_SHADER: number = 0x8b30;

export type ShaderType = typeof GL_VERTEX_SHADER | typeof GL_FRAGMENT_SHADER;

export function createShader(gl: WebGLRenderingContext | WebGL2RenderingContext, shaderType: ShaderType, src: string) {
  const shader = gl.createShader(shaderType);
  defined(shader);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const sil = gl.getShaderInfoLog(shader);
    defined(sil);
    throw new Error(sil);
  }
  return shader;
}

export function createProgram(gl: WebGLRenderingContext | WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader) {
  const program = gl.createProgram();
  defined(program);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const pil = gl.getProgramInfoLog(program);
    defined(pil);
    throw new Error(pil);
  }
  return program;
}