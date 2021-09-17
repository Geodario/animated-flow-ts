import { defined } from "../core/util";
import { Expr, Node } from "./model";
import { GLSLFormatter } from "./visitors";

export class VertexShader extends Node {
  id: string;
  children: Node[];
  private varyings: { name: string; expr: Expr; }[];

  constructor(private positionOutput: Expr, private varyingOutputs: HashMap<Expr>) {
    super();
    this.children = [];
    this.varyings = [];
    for (const name in this.varyingOutputs) {
      const expr = this.varyingOutputs[name];
      defined(expr);
      this.varyings.push({ name, expr });
      this.children.push(expr);
    }
    this.varyings.sort((a, b) => a.name.localeCompare(b.name));
    this.id = `VertexShader(gl_Position=${this.positionOutput.id},${this.varyings.map(({ name, expr }) => `${name}=${expr}`).join(",")})`;
  }

  generateGLSL(): string {
    const glsl = new GLSLFormatter();

    return `
    

    void main(void) {
      gl_Position = ${this.positionOutput.format(glsl)};
    }
    `;
  }
}

export class FragmentShader extends Node {
  id: string;
  children: Node[];
  private colors: { name: string; expr: Expr; }[];

  constructor(private colorOutputs: HashMap<Expr>) {
    super();
    this.children = [];
    this.colors = [];
    for (const name in this.colorOutputs) {
      const expr = this.colorOutputs[name];
      defined(expr);
      this.colors.push({ name, expr });
      this.children.push(expr);
    }
    this.colors.sort((a, b) => a.name.localeCompare(b.name));
    this.id = `FragmentShader(${this.colors.map(({ name, expr }) => `${name}=${expr}`).join(",")})`;
  }

  splitOutputs(): FragmentShader[] {
    return this.colorOutputs.map((colorOutput) => new FragmentShader([colorOutput]))
  }

  generateGLSL(version: "#version 100" | "#version 300 es"): string {
    const glsl = new GLSLFormatter();

    return `
    

    void main(void) {
      gl_Position = ${this.positionOutput.format(glsl)};
    }
    `;
  }
}