import { defined } from "../core/util";
import { assignVaryings, generateGLSLVaryingDeclarations } from "./functions";
import { Collect, GenerateExpressionGLSL, GLSLType } from "./types";

export abstract class Node {
  collect<T extends Node>(shared: Collect<T>): void {
    if (shared.visited.has(this)) {
      return;
    }

    shared.visited.add(this);

    if (shared.test(this)) {
      shared.collected.add(this);
    }

    for (const child of this.children) {
      child.collect(shared);
    }
  }

  abstract get id(): string;
  abstract get children(): Node[];
}

export abstract class ExprNode extends Node {
  abstract override get children(): ExprNode[];
  abstract generateExpressionGLSL(shared: GenerateExpressionGLSL): string;
  abstract get type(): GLSLType;
}

export class Attribute extends ExprNode {
  constructor(private name: string, private _type: GLSLType) {
    super();
  }

  get id(): string {
    return `Attribute(${this.name})`;
  }

  get type(): GLSLType {
    return this._type;
  }

  get children(): ExprNode[] {
    return [];
  }

  generateExpressionGLSL(): string {
    return this.name;
  }
}

export class Binary extends ExprNode {
  constructor(private left: ExprNode, private op: string, private right: ExprNode) {
    super();
  }

  get id(): string {
    return `Binary(${this.left.id},${this.op},${this.right.id})`;
  }

  get type(): GLSLType {
    return this.left.type; // TODO!
  }

  get children(): ExprNode[] {
    return [this.left, this.right];
  }

  generateExpressionGLSL(shared: GenerateExpressionGLSL): string {
    return `(${this.left.generateExpressionGLSL(shared)} ${this.op} ${this.right.generateExpressionGLSL(shared)})`;
  }
}

export class Interpolate extends ExprNode {
  constructor(private node: ExprNode) {
    super();
  }

  get id(): string {
    return `Interpolate(${this.node.id})`;
  }

  get type(): GLSLType {
    return this.node.type;
  }

  get children(): ExprNode[] {
    return [this.node];
  }

  generateExpressionGLSL(shared: GenerateExpressionGLSL): string {
    const varyingName = shared.varyings.get(this);
    defined(varyingName);
    return varyingName;
  }
}

export class Position extends Node {
  constructor(private node: ExprNode) {
    super();
  }

  get id(): string {
    return `Position(${this.node.id})`;
  }

  get children(): Node[] {
    return [this.node];
  }

  generatePositionGLSL(shared: GenerateExpressionGLSL): string {
    return `gl_Position = ${this.node.generateExpressionGLSL(shared)};`;
  }
}

export class Color extends Node {
  constructor(private node: ExprNode) {
    super();
  }

  get id(): string {
    return `Color(${this.node.id})`;
  }

  get children(): Node[] {
    return [this.node];
  }

  generateColorGLSL(shared: GenerateExpressionGLSL): string {
    return `gl_FragColor = ${this.node.generateExpressionGLSL(shared)};`;
  }
}

export class Shading extends Node {
  constructor(private model: { position: Position; color: Color; }) {
    super();
  }

  get id(): string {
    return `Shading(${this.model.position.id},${this.model.color.id})`;
  }

  get children(): Node[] {
    return [this.model.position, this.model.color];
  }

  generateGLSLShaders(): { vertexShader: string; fragmentShader: string; } {
    const varyings = assignVaryings(this.model.color);

    const glslVaryings = generateGLSLVaryingDeclarations(varyings);

    const vertexShader = `
      // Attributes

      // Uniforms

      // Varyings
      ${glslVaryings}

      void main() {
        ${this.model.position.generatePositionGLSL({ varyings })}
      }
    `;

    const fragmentShader = `
      // Varyings
      ${glslVaryings}

      // Uniforms

      void main() {
        ${this.model.color.generateColorGLSL({ varyings })}
      }
    `;
    
    return {
      vertexShader,
      fragmentShader
    };
  }
}