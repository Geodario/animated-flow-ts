import { Node } from "./model";

export interface Collect<T extends ExprNode> {
  test(node: ExprNode): node is T;
  visited: Set<ExprNode>;
  collected: Set<T>;
}

export type GLSLType = "float" | "vec2" | "vec3" | "vec4" | "mat2" | "mat3" | "mat4";

export interface GenerateExpressionGLSL {
  varyings: Map<Interpolate, string>;
}