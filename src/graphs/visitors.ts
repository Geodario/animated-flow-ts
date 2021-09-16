import { Expr } from "./model";
import { DataType, EvaluateExpression, FormatExpression } from "./types";

export class GenerateGLSL implements FormatExpression {
  binary(left: Expr, op: string, right: Expr): string {
    return `(${left.format(this)} ${op} ${right.format(this)})`;
  }

  unary(op: string, expr: Expr): string {
    return `(${op} ${expr.format(this)})`;
  }
}

export class Evaluate implements EvaluateExpression {
  binary(left: Expr, op: string, right: Expr): number[] {
    const left = left.evaluate(this);
    const right = right.evaluate(this);

    switch (op) {
      case "+": return add(left.type, left, right.type, right);
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
      case "-": return neg(expr.type, value);
    }

    throw new Error(`Unknown operator "${op}".`);
  }
}