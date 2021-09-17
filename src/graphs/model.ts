import { assert } from "../core/util";

export interface Collect<T extends Node> {
  test(node: Node): node is T;
  visited: Set<Node>;
  collected: Set<T>;
}

export type UnaryOperator = "-" | "abs" | "length";
export type BinaryOperator = "+" | "-" | "*" | "/" | "%" | "dot" | "cross";

export const FLOAT = { name: "float", class: "number",  type: "float", dims: [1, 1] as [number, number], vector: false, scalar: true };
export const VEC2  = { name: "vec2",  class: "number",  type: "float", dims: [2, 1] as [number, number], vector: true,  scalar: false };
export const VEC3  = { name: "vec3",  class: "number",  type: "float", dims: [3, 1] as [number, number], vector: true,  scalar: false };
export const VEC4  = { name: "vec4",  class: "number",  type: "float", dims: [4, 1] as [number, number], vector: true,  scalar: false };
export const MAT2  = { name: "mat2",  class: "number",  type: "float", dims: [2, 2] as [number, number], vector: true,  scalar: false };
export const MAT3  = { name: "mat3",  class: "number",  type: "float", dims: [3, 3] as [number, number], vector: true,  scalar: false };
export const MAT4  = { name: "mat4",  class: "number",  type: "float", dims: [4, 4] as [number, number], vector: true,  scalar: false };

export type DataType = typeof FLOAT | typeof VEC2 | typeof VEC3 | typeof VEC4 | typeof MAT2 | typeof MAT3 | typeof MAT4;

export interface FormatExpression {
  variable(type: DataType, name: string): string;
  constant(type: DataType, value: number[]): string;
  unary(op: UnaryOperator, expr: Expr): string;
  binary(left: Expr, op: BinaryOperator, right: Expr): string;
}

export interface EvaluateExpression {
  variable(type: DataType, name: string): number[];
  constant(type: DataType, value: number[]): number[];
  unary(op: UnaryOperator, expr: Expr): number[];
  binary(left: Expr, op: BinaryOperator, right: Expr): number[];
}

export abstract class Node {
  collect<T extends Node>(visitor: Collect<T>): void {
    if (visitor.visited.has(this)) {
      return;
    }

    visitor.visited.add(this);

    if (visitor.test(this)) {
      visitor.collected.add(this);
    }

    for (const child of this.children) {
      child.collect(visitor);
    }
  }

  abstract get id(): string;
  abstract get children(): Node[];
}

export abstract class Expr extends Node {
  abstract override get children(): Expr[];
  abstract format(visitor: FormatExpression): string;
  abstract evaluate(visitor: EvaluateExpression): number[];
  abstract get type(): DataType;
}

export class Binary extends Expr {
  constructor(private left: Expr, private op: BinaryOperator, private right: Expr) {
    super();
  }

  get id(): string {
    return `Binary(${this.left.id},${this.op},${this.right.id})`;
  }

  get type(): DataType {
    switch (this.op) {
      case "+":
      case "-":
      case "*":
      case "/":
      case "%":
        assert((this.left.type.scalar || this.right.type.scalar) || (this.left.type === this.right.type));
        return this.left.type.vector ? this.left.type : this.right.type;
      case "dot":
        assert((this.left.type === VEC2 && this.right.type === VEC2) || (this.left.type === VEC3 && this.right.type === VEC3) || (this.left.type === VEC4 && this.right.type === VEC4));
        return this.left.type;
      case "cross":
        assert(this.left.type === VEC3 && this.right.type === VEC3);
        return VEC3;
    }
  }

  get children(): Expr[] {
    return [this.left, this.right];
  }
  
  format(visitor: FormatExpression): string {
    return visitor.binary(this.left, this.op, this.right);
  }

  evaluate(visitor: EvaluateExpression): number[] {
    return visitor.binary(this.left, this.op, this.right);
  }
}

export class Unary extends Expr {
  constructor(private op: UnaryOperator, private expr: Expr) {
    super();
  }

  get id(): string {
    return `Unary(${this.op},${this.expr.id})`;
  }

  get type(): DataType {
    switch (this.op) {
      case "-": return this.expr.type;
      case "abs": return this.expr.type;
      case "length": return FLOAT;
    }
  }

  get children(): Expr[] {
    return [this.expr];
  }
  
  format(visitor: FormatExpression): string {
    return visitor.unary(this.op, this.expr);
  }

  evaluate(visitor: EvaluateExpression): number[] {
    return visitor.unary(this.op, this.expr);
  }
}

export class Constant extends Expr {
  constructor(private _type: DataType, private value: number[]) {
    super();
  }

  get id(): string {
    return `Constant(${this._type.name},[${this.value.join(",")}])`;
  }

  get type(): DataType {
    return this._type;
  }

  get children(): Expr[] {
    return [];
  }
  
  format(visitor: FormatExpression): string {
    return visitor.constant(this._type, this.value);
  }

  evaluate(visitor: EvaluateExpression): number[] {
    return visitor.constant(this._type, this.value);
  }
}

export class Variable extends Expr {
  constructor(private _type: DataType, private name: string) {
    super();
  }

  get id(): string {
    return `Variable(${this._type.name},${this.name})`;
  }

  get type(): DataType {
    return this._type;
  }

  get children(): Expr[] {
    return [];
  }
  
  format(visitor: FormatExpression): string {
    return visitor.variable(this._type, this.name);
  }

  evaluate(visitor: EvaluateExpression): number[] {
    return visitor.variable(this._type, this.name);
  }
}