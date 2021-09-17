import { defined } from "../core/util";
import { Annotation, Expr, Node, ValueType } from "./core";
import NodeManager from "./NodeManager";
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

  splitOutputs(nodeManager: NodeManager): Shader[] {
    return this.outputs.map(({ name, expr }) => nodeManager.shader({ type: this.definition.type, inputs: this.definition.inputs, uniforms: this.definition.uniforms, outputs: { [name]: expr } }));
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

  getShaderDefinitions(nodeManager: NodeManager): {
    vertexShader: { type: ShaderType; inputs: { name: string, type: ValueType }[]; uniforms: { name: string, type: ValueType }[]; outputs: HashMap<Expr>; },
    fragmentShader: { type: ShaderType; inputs: { name: string, type: ValueType }[]; uniforms: { name: string, type: ValueType }[]; outputs: HashMap<Expr>; }
  } {
    const fragmentNodes = new Set<Fragment>();
    
    this.definition.color.collect({
      collected: fragmentNodes,
      test: (node): node is Fragment => node instanceof Fragment,
      visited: new Set<Node>()
    });

    const fsUniformNodes = new Set<Uniform>();
    
    this.definition.color.collect({
      collected: fsUniformNodes,
      test: (node): node is Uniform => node instanceof Uniform,
      visited: new Set<Node>()
    });

    let color = this.definition.color;
    
    const vsOutputMap: HashMap<Expr> = {};
    const fsInputs: { name: string, type: ValueType }[] = [];

    for (const fragmentNode of fragmentNodes) {
      const type = fragmentNode.expr.type;
      const name = `v_Varying${fsInputs.length}`;
      vsOutputMap[name] = fragmentNode.expr;
      fsInputs.push({ type, name });
      color = color.substitute(fragmentNode, nodeManager.variable(type, name), nodeManager);
    }

    const fsUniforms: { name: string, type: ValueType }[] = [];

    for (const uniformNode of fsUniformNodes) {
      const type = uniformNode.expr.type;
      const name = `u_Uniform${fsUniforms.length}`;
      fsUniforms.push({ type, name });
      color = color.substitute(uniformNode, nodeManager.variable(type, name), nodeManager);
    }

    // const attributeNodes = new Set<Attribute>();
    
    // this.definition.position.collect({
    //   collected: attributeNodes,
    //   test: (node): node is Attribute => node instanceof Attribute,
    //   visited: new Set<Node>()
    // });

    // const uniformNodes = new Set<Uniform>();
    
    // this.definition.position.collect({
    //   collected: uniformNodes,
    //   test: (node): node is Uniform => node instanceof Uniform,
    //   visited: new Set<Node>()
    // });

    // let position = this.definition.position;
    
    // const inputs: { name: string, type: ValueType }[] = [];

    // for (const attributeNode of attributeNodes) {
    //   const type = attributeNode.expr.type;
    //   const name = `a_Attribute${inputs.length}`;
    //   inputs.push({ type, name });
    //   position = position.substitute(attributeNode, nodeManager.variable(type, name), nodeManager);
    // }

    // const uniforms: { name: string, type: ValueType }[] = [];

    // for (const uniformNode of uniformNodes) {
    //   const type = uniformNode.expr.type;
    //   const name = `u_Uniform${uniforms.length}`;
    //   uniforms.push({ type, name });
    //   position = position.substitute(uniformNode, nodeManager.variable(type, name), nodeManager);
    // }
    
    return {
      vertexShader: { type: "vertex-shader", inputs: [], uniforms: [], outputs: { /*o_Position: position, */...vsOutputMap } },
      fragmentShader: { type: "fragment-shader", inputs: fsInputs, uniforms: fsUniforms, outputs: { o_Color: color } }
    };
  }
}



export class Attribute extends Annotation {
}

export class Fragment extends Annotation {
}

export class Uniform extends Annotation {
}
