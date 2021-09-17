import { Binary, BinaryOperator, Constant, Expr, Node, Unary, UnaryOperator, ValueType, Variable } from "./core";
import { Attribute, Fragment, Shader, Technique, Uniform } from "./shading";
import { ShaderType } from "./types";

export default class NodeManager {
  private _nodes = new Map<string, Node>();

  // Core

  binary(left: Expr, op: BinaryOperator, right: Expr): Binary {
    return this._unique(new Binary(left, op, right));
  }
  
  unary(op: UnaryOperator, expr: Expr): Unary {
    return this._unique(new Unary(op, expr));
  }
  
  constant(type: ValueType, value: number[]): Constant {
    return this._unique(new Constant(type, value));
  }
  
  variable(type: ValueType, name: string): Variable {
    return this._unique(new Variable(type, name));
  }

  shader(definition: { type: ShaderType; inputs: { name: string, type: ValueType }[]; uniforms: { name: string, type: ValueType }[]; outputs: HashMap<Expr>; }): Shader {
    return this._unique(new Shader(definition));
  }

  technique(definition: { position: Expr; color: Expr; }): Technique {
    return this._unique(new Technique(definition));
  }

  // Shading

  attribute(expr: Expr): Attribute {
    return this._unique(new Attribute(expr));
  }

  fragment(expr: Expr): Fragment {
    return this._unique(new Fragment(expr));
  }

  uniform(expr: Expr): Uniform {
    return this._unique(new Uniform(expr));
  }

  private _unique<T extends Node>(node: T): T {
    let existing = this._nodes.get(node.id) as T;
    
    if (!existing) {
      this._nodes.set(node.id, node);
      existing = node;
    }

    return existing;
  }

  private _marked = new Set<Node>();

  mark(node: Node): void {
    const collected = new Set<Node>();

    node.collect({
      visited: new Set<Node>(),
      test: (_node: Node): _node is Node => true,
      collected,
    });

    for (const node of collected) {
      this._marked.add(node);
    }
  }

  sweep(): void {
    for (const [id, node] of this._nodes) {
      if (!this._marked.has(node)) {
        this._nodes.delete(id);
      }
    }

    this._marked.clear();
  }
}