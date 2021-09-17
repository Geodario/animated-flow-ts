export function ensureFractional(x: number): string {
  if (Math.floor(x) === x) {
    return x.toFixed(1);
  } else {
    return x.toString();
  }
}
