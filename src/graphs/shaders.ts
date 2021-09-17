import { defined } from "../core/util";
import { Expr, Node, ValueType } from "./model";
import { ShaderType } from "./types";
import { GLSLFormatter } from "./visitors";

export class Shader extends Node {
  id: string;
  children: Node[];
  private inputs: { name: string, type: ValueType }[];
  private uniforms: { name: string, type: ValueType }[];
  private outputs: { name: string; expr: Expr; }[];

  constructor(private definition: { type: ShaderType, inputs: { name: string, type: ValueType }[], uniforms: { name: string, type: ValueType }[], outputs: HashMap<Expr> }) {
    super();
    this.children = [];
    this.inputs = definition.inputs;
    this.uniforms = definition.uniforms;
    this.outputs = [];
    for (const name in this.definition.outputs) {
      const expr = this.definition.outputs[name];
      defined(expr);
      this.outputs.push({ name, expr });
      this.children.push(expr);
    }
    this.outputs.sort((a, b) => a.name.localeCompare(b.name));
    this.id = `Shader(${this.definition.type},inputs=[${this.inputs.map(({ name, type }) => `${name}:${type}`).join(",")}],uniforms=[${this.uniforms.map(({ name, type }) => `${name}:${type}`).join(",")}],outputs={${this.outputs.map(({ name, expr }) => `${name}=${expr}`).join(",")}})`;
  }

  generateGLSL(options: { version: "#version 100", positionOutputName: string, colorOutputName: string } | { version: "#version 300 es" }): string {
    const glsl = new GLSLFormatter(options.version);

    let inputsBlock: string;
    let uniformsBlock: string;
    let outputsBlock: string;

    if (options.version === "#version 300 es") {
      inputsBlock = this.definition.inputs.map(({ name, type }) => `in ${type.name} ${name};`).join("\n");
      uniformsBlock = this.definition.uniforms.map(({ name, type }) => `uniform ${type.name} ${name};`).join("\n");
      outputsBlock = this.outputs.map(({ name, expr }) => `out ${expr.type.name} ${name};`).join("\n");
    } else {
      if (this.definition.type === "vertex-shader") {
        inputsBlock = this.definition.inputs.map(({ name, type }) => `attribute ${type.name} ${name};`).join("\n");
        uniformsBlock = this.definition.uniforms.map(({ name, type }) => `uniform ${type.name} ${name};`).join("\n");
        outputsBlock = this.outputs.map(({ name, expr }) => `varying ${expr.type.name} ${name};`).join("\n");
      } else {
        inputsBlock = this.definition.inputs.map(({ name, type }) => `varying ${type.name} ${name};`).join("\n");
        uniformsBlock = this.definition.uniforms.map(({ name, type }) => `uniform ${type.name} ${name};`).join("\n");
        outputsBlock = "";
      }
    }

    function getActualOutputName(declaredOutputName: string): string {
      if (options.version === "#version 300 es") {
        return declaredOutputName;
      }

      if (declaredOutputName === options.positionOutputName) {
        return `gl_Position`;
      }

      if (declaredOutputName === options.colorOutputName) {
        return `gl_FragColor`;
      }

      return declaredOutputName;
    }

    return `${options.version}
${inputsBlock}
${uniformsBlock}
${outputsBlock}
void main(void) {
${this.outputs.map(({ name, expr }) => `${getActualOutputName(name)} = ${expr.format(glsl)};`).join("\n")}
}
`;
  }

  splitOutputs(): Shader[] {
    return this.outputs.map(({ name, expr }) => new Shader({ type: this.definition.type, inputs: this.definition.inputs, uniforms: this.definition.uniforms, outputs: { [name]: expr } }));
  }
}
