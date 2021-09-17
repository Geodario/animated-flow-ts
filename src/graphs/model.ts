import { vec3 } from "gl-matrix";
import { assert, defined } from "../core/util";

export interface Collect<T extends Node> {
  test(node: Node): node is T;
  visited: Set<Node>;
  collected: Set<T>;
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

const AllTypes = [FLOAT, VEC2, VEC3, VEC4, MAT2, MAT3, MAT4];

export function getTypeByDims(rows: number, columns: number): DataType {
  const t = AllTypes.filter((t) => t.dims[0] === rows && t.dims[1] === columns)[0];
  defined(t);
  return t;
}

export type DataType = typeof FLOAT | typeof VEC2 | typeof VEC3 | typeof VEC4 | typeof MAT2 | typeof MAT3 | typeof MAT4;

export interface FormatExpression {
  variable(type: DataType, name: string): string;
  constant(type: DataType, value: number[]): string;
  unary(op: UnaryOperator, expr: Expr): string;
  binary(left: Expr, op: BinaryOperator, right: Expr): string;
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
  abstract evaluate(variableValues: Map<string, number[]>): number[];
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
      case "*":
        if (this.left.type.scalar) {
          return this.right.type;
        } else if (this.right.type.scalar) {
          return this.left.type;
        } else if (this.left.type.vector && this.right.type.vector) {
          return this.left.type;
        } else {
          return getTypeByDims(this.left.type.dims[0], this.right.type.dims[1]);
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
  
  format(visitor: FormatExpression): string {
    return visitor.binary(this.left, this.op, this.right);
  }

  evaluate(variableValues: Map<string, number[]>): number[] {
    switch (this.op) {
      case "*": {
        const a = this.left.evaluate(variableValues);
        const b = this.right.evaluate(variableValues);

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
        const a = this.left.evaluate(variableValues);
        const b = this.right.evaluate(variableValues);
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
        throw new Error("Type error.");
      }
      case "dot":
        const a = this.left.evaluate(variableValues);
        const b = this.right.evaluate(variableValues);
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
        const a = this.left.evaluate(variableValues) as [number, number, number];
        const b = this.right.evaluate(variableValues) as [number, number, number];
        vec3.cross(out, a, b);
        return out;
      }
    }
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

  evaluate(variableValues: Map<string, number[]>): number[] {
    const value = this.expr.evaluate(variableValues);

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

  evaluate(): number[] {
    return this.value;
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

  evaluate(variableValues: Map<string, number[]>): number[] {
    const value = variableValues.get(this.name);
    defined(value);
    return value;
  }
}