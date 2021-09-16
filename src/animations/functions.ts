import { Interpolate, Node } from "./model";

export function assignVaryings(colorModel: Node): Map<Interpolate, string> {
  const collected = new Set<Interpolate>();

  colorModel.collect<Interpolate>({
    test: (node: Node): node is Interpolate => node instanceof Interpolate,
    visited: new Set<Node>(),
    collected
  });

  const varyings = new Map<Interpolate, string>();

  let index = 0;

  for (const interpolate of collected) {
    index++;
    varyings.set(interpolate, `v_Varying${index}`);
  }

  return varyings;
}

export function generateGLSLVaryingDeclarations(varyings: Map<Interpolate, string>): string {
  let glsl = "";

  for (const [interpolate, name] of varyings) {
    glsl += `varying ${interpolate.type} ${name};\n`;
  }

  return glsl;
}
