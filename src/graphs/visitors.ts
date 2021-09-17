import { defined } from "../core/util";
import { BinaryOperator, DataType, Expr, FormatExpression, UnaryOperator } from "./model";

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
    switch (op) {
      case "+": 
      case "-":
      case "*": 
      case "/":
        return `(${left.format(this)} ${op} ${right.format(this)})`;
      case "%":
      case "dot":
      case "cross":
        return `${op}(${left.format(this)}, ${right.format(this)})`;
    }
  }

  unary(op: UnaryOperator, expr: Expr): string {
    switch (op) {
      case "-":
        return `(${op}${expr.format(this)})`;
      case "abs":
      case "length":
        return `${op}(${expr.format(this)})`;
    }
  }
}
