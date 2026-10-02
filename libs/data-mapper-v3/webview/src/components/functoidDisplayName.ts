export function getFunctoidDisplayName(name: string): string {
  return name.replace(/^(String|Cumulative) /, '');
}
