import { defined } from "../core/util";
import { Expr, Node, ValueType } from "./model";
import { GLSLOptions, ShaderType } from "./types";
import { GLSLFormatter } from "./visitors";

export class Shader extends Node {
  id: string;
  children: Node[];
  private inputs: { name: string, type: ValueType }[];
  private uniforms: { name: string, type: ValueType }[];
  private outputs: { name: string; expr: Expr; }[];

  constructor(private definition: { type: ShaderType; inputs: { name: string, type: ValueType }[]; uniforms: { name: string, type: ValueType }[]; outputs: HashMap<Expr>; }) {
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
    this.id = `Shader(${this.definition.type},[${this.inputs.map(({ name, type }) => `${name}:${type}`).join(",")}],[${this.uniforms.map(({ name, type }) => `${name}:${type}`).join(",")}],{${this.outputs.map(({ name, expr }) => `${name}=${expr}`).join(",")}})`;
  }

  generateGLSL(options: GLSLOptions): string {
    const glsl = new GLSLFormatter(options.version);

    let inputsBlock: string;
    let uniformsBlock: string;
    let outputsBlock: string;
    let bodyBlock: string;
    let finalBlock: string;

    if (options.version === "#version 300 es") {
      inputsBlock = this.definition.inputs.map(({ name, type }) => `in ${type.name} ${name};`).join("\n");
      uniformsBlock = this.definition.uniforms.map(({ name, type }) => `uniform ${type.name} ${name};`).join("\n");
      outputsBlock = this.outputs.map(({ name, expr }) => `out ${expr.type.name} ${name};`).join("\n");
      bodyBlock = this.outputs.map(({ name, expr }) => `${name} = ${expr.format(glsl)};`).join("\n");
      if (this.definition.type === "vertex-shader") {
        finalBlock = `gl_Position = ${options.positionOutputName || "o_Position"}`;
      } else {
        finalBlock = ``;
      }
    } else {
      if (this.definition.type === "vertex-shader") {
        inputsBlock = this.definition.inputs.map(({ name, type }) => `attribute ${type.name} ${name};`).join("\n");
        uniformsBlock = this.definition.uniforms.map(({ name, type }) => `uniform ${type.name} ${name};`).join("\n");
        outputsBlock = this.outputs.map(({ name, expr }) => `varying ${expr.type.name} ${name};`).join("\n");
        bodyBlock = this.outputs.map(({ name, expr }) => `${name} = ${expr.format(glsl)};`).join("\n");
        finalBlock = `gl_Position = ${options.positionOutputName || "o_Position"};`;
      } else {
        inputsBlock = this.definition.inputs.map(({ name, type }) => `varying ${type.name} ${name};`).join("\n");
        uniformsBlock = this.definition.uniforms.map(({ name, type }) => `uniform ${type.name} ${name};`).join("\n");
        outputsBlock = "";
        bodyBlock = this.outputs.map(({ name, expr }) => `${expr.type.name} ${name} = ${expr.format(glsl)};`).join("\n");
        finalBlock = `gl_FragColor = ${options.colorOutputName || "o_Color"};`;
      }
    }

    return `${options.version}
precision highp float;
${inputsBlock}
${uniformsBlock}
${outputsBlock}
void main(void) {
${bodyBlock}
${finalBlock}
}
`;
  }

  splitOutputs(): Shader[] {
    return this.outputs.map(({ name, expr }) => new Shader({ type: this.definition.type, inputs: this.definition.inputs, uniforms: this.definition.uniforms, outputs: { [name]: expr } }));
  }
}

export class Technique extends Node {
  constructor(private definition: { position: Expr; color: Expr; }) {
    super();
  }

  get id(): string {
    return `Technique(${this.definition.position.id},${this.definition.color.id})`
  }

  get children(): Node[] {
    return [this.definition.position, this.definition.color];
  }

  getVertexShaderDefinition(): { type: ShaderType; inputs: { name: string, type: ValueType }[]; uniforms: { name: string, type: ValueType }[]; outputs: HashMap<Expr>; } {
    return { type: "vertex-shader", inputs: [], uniforms: [], outputs: { o_Position: this.definition.position } }; // TODO
  }

  getFragmentShaderDefinition(): { type: ShaderType; inputs: { name: string, type: ValueType }[]; uniforms: { name: string, type: ValueType }[]; outputs: HashMap<Expr>; } {
    return { type: "fragment-shader", inputs: [], uniforms: [], outputs: { o_Color: this.definition.color } }; // TODO
  }
}