import { vec3 } from "gl-matrix";
import { assert, defined } from "../core/util";
import NodeManager from "./NodeManager";

export interface CollectContext<T extends Node> {
  visited: Set<Node>;
  test(node: Node): node is T;
  collected: Set<T>;
}

export abstract class Node {
  collect<T extends Node>(context: CollectContext<T>): void {
    if (context.visited.has(this)) {
      return;
    }

    context.visited.add(this);

    if (context.test(this)) {
      context.collected.add(this);
    }

    for (const child of this.children) {
      child.collect(context);
    }
  }

  abstract get id(): string;
  abstract get children(): Node[];
}

export type UnaryOperator = "-" | "abs" | "length";
export type BinaryOperator = "+" | "-" | "*" | "/" | "%" | "dot" | "cross";

export const FLOAT = { name: "float", dims: [1, 1] as [number, number], length: 1,  vector: false,  scalar: true,  matrix: false };
export const VEC2  = { name: "vec2",  dims: [2, 1] as [number, number], length: 2,  vector: true,   scalar: false, matrix: false };
export const VEC3  = { name: "vec3",  dims: [3, 1] as [number, number], length: 3,  vector: true,   scalar: false, matrix: false };
export const VEC4  = { name: "vec4",  dims: [4, 1] as [number, number], length: 4,  vector: true,   scalar: false, matrix: false };
export const MAT2  = { name: "mat2",  dims: [2, 2] as [number, number], length: 4,  vector: false,  scalar: false, matrix: true };
export const MAT3  = { name: "mat3",  dims: [3, 3] as [number, number], length: 9,  vector: false,  scalar: false, matrix: true };
export const MAT4  = { name: "mat4",  dims: [4, 4] as [number, number], length: 16, vector: false,  scalar: false, matrix: true };

const AllValueTypes = [FLOAT, VEC2, VEC3, VEC4, MAT2, MAT3, MAT4];

export function getValueType(rows: number, columns: number): ValueType {
  const t = AllValueTypes.filter((t) => t.dims[0] === rows && t.dims[1] === columns)[0];
  defined(t);
  return t;
}

export type ValueType = typeof FLOAT | typeof VEC2 | typeof VEC3 | typeof VEC4 | typeof MAT2 | typeof MAT3 | typeof MAT4;

export interface FormatExpressionVisitor {
  variable(type: ValueType, name: string): string;
  constant(type: ValueType, value: number[]): string;
  unary(op: UnaryOperator, expr: Expr): string;
  binary(left: Expr, op: BinaryOperator, right: Expr): string;
}

export abstract class Expr extends Node {
  abstract override get children(): Expr[];
  abstract format(visitor: FormatExpressionVisitor): string;
  abstract evaluate(getVariable: (name: string) => number[]): number[];
  abstract get type(): ValueType;
  abstract substitute(search: Expr, replace: Expr, nodeManager: NodeManager): Expr;
}

export class Binary extends Expr {
  constructor(private left: Expr, private op: BinaryOperator, private right: Expr) {
    super();
  }

  get id(): string {
    return `Binary(${this.left.id},${this.op},${this.right.id})`;
  }

  get type(): ValueType {
    switch (this.op) {
      case "*":
        if (this.left.type.scalar) {
          return this.right.type;
        } else if (this.right.type.scalar) {
          return this.left.type;
        } else if (this.left.type.vector && this.right.type.vector) {
          return this.left.type;
        } else {
          return getValueType(this.left.type.dims[0], this.right.type.dims[1]);
        }
      case "+":
      case "-":
      case "/":
      case "%":
        if (this.left.type.scalar) {
          return this.right.type;
        } else if (this.right.type.scalar) {
          return this.left.type;
        } else if (this.left.type === this.right.type) {
          return this.left.type;
        }
        throw new Error("Type error.");
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
  
  format(visitor: FormatExpressionVisitor): string {
    return visitor.binary(this.left, this.op, this.right);
  }

  evaluate(getVariable: (name: string) => number[]): number[] {
    switch (this.op) {
      case "*": {
        const a = this.left.evaluate(getVariable);
        const b = this.right.evaluate(getVariable);

        if (this.left.type.scalar) {
          const s = a[0];
          defined(s);
          const length = this.type.length;
          const output = new Array<number>(length);
          for (let i = 0; i < length; i++) {
            const bi = b[i];
            defined(bi);
            output[i] = s * bi;
          }
          return output;
        } else if (this.right.type.scalar) {
          const s = b[0];
          defined(s);
          const length = this.type.length;
          const output = new Array<number>(length);
          for (let i = 0; i < length; i++) {
            const ai = a[i];
            defined(ai);
            output[i] = ai * s;
          }
          return output;
        } else if (this.left.type.vector && this.right.type.vector) {
          const length = this.type.length;
          const output = new Array<number>(length);
          for (let i = 0; i < length; i++) {
            const ai = a[i];
            const bi = b[i];
            defined(ai);
            defined(bi);
            output[i] = ai * bi;
          }
          return output;
        } else {
          const length = this.type.length;
          const output = new Array<number>(length);
          const outRows = this.left.type.dims[0];
          const sumLength = this.left.type.dims[1];
          const outCols = this.right.type.dims[1];
          for (let i = 0; i < outRows; i++) {
            for (let j = 0; j < outCols; j++) {
              let s = 0;
              for (let k = 0; k < sumLength; k++) {
                const aik = a[i * outRows + k];
                const bkj = b[k * outRows + j];
                defined(aik);
                defined(bkj);
                s += aik * bkj;
              }
              output[j * outRows + i] = s;
            }
          }
          return output;
        }
      }
      case "+":
      case "-":
      case "/":
      case "%": {
        const a = this.left.evaluate(getVariable);
        const b = this.right.evaluate(getVariable);

        if (this.left.type.scalar) {
          const s = a[0];
          defined(s);
          const length = this.type.length;
          const output = new Array<number>(length);
          for (let i = 0; i < length; i++) {
            const bi = b[i];
            defined(bi);
            switch (this.op) {
              case "+": output[i] = s + bi; break;
              case "-": output[i] = s - bi; break;
              case "/": output[i] = s / bi; break;
              case "%": output[i] = s % bi; break;
            }
          }
          return output;
        } else if (this.right.type.scalar) {
          const s = b[0];
          defined(s);
          const length = this.type.length;
          const output = new Array<number>(length);
          for (let i = 0; i < length; i++) {
            const ai = a[i];
            defined(ai);
            switch (this.op) {
              case "+": output[i] = ai + s; break;
              case "-": output[i] = ai - s; break;
              case "/": output[i] = ai / s; break;
              case "%": output[i] = ai % s; break;
            }
          }
          return output;
        } else if (this.left.type == this.right.type) {
          const length = this.type.length;
          const output = new Array<number>(length);
          for (let i = 0; i < length; i++) {
            const ai = a[i];
            const bi = b[i];
            defined(ai);
            defined(bi);
            switch (this.op) {
              case "+": output[i] = ai + bi; break;
              case "-": output[i] = ai - bi; break;
              case "/": output[i] = ai / bi; break;
              case "%": output[i] = ai % bi; break;
            }
          }
          return output;
        }
        throw new Error("Type error.");
      }
      case "dot":
        const a = this.left.evaluate(getVariable);
        const b = this.right.evaluate(getVariable);
        const length = this.type.length;
        let d = 0;
        for (let i = 0; i < length; i++) {
          const ai = a[i];
          const bi = b[i];
          defined(ai);
          defined(bi);
          d += ai * bi;
        }
        return [d];
      case "cross": {
        const out: [number, number, number] = [0, 0, 0];
        const a = this.left.evaluate(getVariable) as [number, number, number];
        const b = this.right.evaluate(getVariable) as [number, number, number];
        vec3.cross(out, a, b);
        return out;
      }
    }
  }

  substitute(search: Expr, replace: Expr, nodeManager: NodeManager): Expr {
    if (this === search) {
      return replace;
    }

    return nodeManager.binary(this.left.substitute(search, replace, nodeManager), this.op, this.right.substitute(search, replace, nodeManager));
  }
}

export class Unary extends Expr {
  constructor(private op: UnaryOperator, private expr: Expr) {
    super();
  }

  get id(): string {
    return `Unary(${this.op},${this.expr.id})`;
  }

  get type(): ValueType {
    switch (this.op) {
      case "-": return this.expr.type;
      case "abs": return this.expr.type;
      case "length": return FLOAT;
    }
  }

  get children(): Expr[] {
    return [this.expr];
  }
  
  format(visitor: FormatExpressionVisitor): string {
    return visitor.unary(this.op, this.expr);
  }

  evaluate(getVariable: (name: string) => number[]): number[] {
    const value = this.expr.evaluate(getVariable);

    switch (this.op) {
      case "-": {
        return value.map((x) => -x);
      }
      case "abs": {
        return value.map((x) => Math.abs(x));
      }
      case "length": {
        return [Math.sqrt(value.reduce((p, c) => p + c * c, 0))];
      }
    }
  }

  substitute(search: Expr, replace: Expr, nodeManager: NodeManager): Expr {
    if (this === search) {
      return replace;
    }

    return nodeManager.unary(this.op, this.expr.substitute(search, replace, nodeManager));
  }
}

export class Constant extends Expr {
  constructor(private _type: ValueType, private value: number[]) {
    super();
  }

  get id(): string {
    return `Constant(${this._type.name},[${this.value.join(",")}])`;
  }

  get type(): ValueType {
    return this._type;
  }

  get children(): Expr[] {
    return [];
  }
  
  format(visitor: FormatExpressionVisitor): string {
    return visitor.constant(this._type, this.value);
  }

  evaluate(): number[] {
    return this.value;
  }

  substitute(search: Expr, replace: Expr, nodeManager: NodeManager): Expr {
    if (this === search) {
      return replace;
    }

    return nodeManager.constant(this._type, this.value);
  }
}

export class Variable extends Expr {
  constructor(private _type: ValueType, private name: string) {
    super();
  }

  get id(): string {
    return `Variable(${this._type.name},${this.name})`;
  }

  get type(): ValueType {
    return this._type;
  }

  get children(): Expr[] {
    return [];
  }
  
  format(visitor: FormatExpressionVisitor): string {
    return visitor.variable(this._type, this.name);
  }

  evaluate(getVariable: (name: string) => number[]): number[] {
    const value = getVariable(this.name);
    return value;
  }

  substitute(search: Expr, replace: Expr, nodeManager: NodeManager): Expr {
    if (this === search) {
      return replace;
    }

    return nodeManager.variable(this._type, this.name);
  }
}

export class Annotation extends Expr {
  constructor(private _expr: Expr) {
    super();
  }

  get expr(): Expr {
    return this._expr;
  }

  get className(): string {
    return this.constructor.name;
  }

  get id(): string {
    return `${this.className}(${this._expr.id})`;
  }

  get type(): ValueType {
    return this._expr.type;
  }

  get children(): Expr[] {
    return [this._expr];
  }
  
  format(): string {
    throw new Error(`${this.className} nodes must be removed from the tree prior to formatting.`);
  }

  evaluate(): number[] {
    throw new Error(`${this.className} nodes must be removed from the tree prior to evaluating.`);
  }

  substitute(search: Expr, replace: Expr, nodeManager: NodeManager): Expr {
    if (this === search) {
      return replace;
    }

    return this._expr.substitute(search, replace, nodeManager);
  }
}