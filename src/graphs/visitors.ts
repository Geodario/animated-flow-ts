import { defined } from "../core/util";
import { BinaryOperator, DataType, EvaluateExpression, Expr, FormatExpression, UnaryOperator } from "./model";

function ensureFractional(x: number): string {
  if (Math.floor(x) === x) {
    return x.toFixed(1);
  } else {
    return x.toString();
  }
}

export class GenerateGLSL implements FormatExpression {
  variable(_type: DataType, name: string): string {
    return name;
  }
  
  constant(type: DataType, value: number[]): string {
    if (type.scalar) {
      defined(value[0]);
      return ensureFractional(value[0]);
    } else {
      return `${type.name}(${value.map(ensureFractional).join(", ")})`; 
    }
  }

  binary(left: Expr, op: BinaryOperator, right: Expr): string {
    return `(${left.format(this)} ${op} ${right.format(this)})`;
  }

  unary(op: UnaryOperator, expr: Expr): string {
    return `(${op} ${expr.format(this)})`;
  }
}

export class Evaluate implements EvaluateExpression {
  constructor(private variableValues: Map<string, number[]>) {
  }

  variable(_type: DataType, name: string): number[] {
    const value = this.variableValues.get(name);
    defined(value);
    return value;
  }

  constant(_type: DataType, value: number[]): number[] {
    return value;
  }

  binary(left: Expr, op: BinaryOperator, right: Expr): number[] {
    const x = left.evaluate(this);
    const y = right.evaluate(this);

    switch (op) {
      case "+": {
        const result = new Array<number>(Math.max(x.length, y.length));
        
      }
      case "-": return sub(x, y);
      case "*": return mul(x, y);
      case "/": return div(x, y);
      case "%": return mod(x, y);
    }

    throw new Error(`Unknown operator "${op}".`);
  }

  unary(op: string, expr: Expr): number[] {
    const value = expr.evaluate(this);

    switch (op) {
      case "-": {
        return value.map((x) => -x);
      }
    }

    throw new Error(`Unknown operator "${op}".`);
  }
}