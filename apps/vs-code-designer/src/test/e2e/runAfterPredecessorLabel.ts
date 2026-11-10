// The original product calls util.format(`${verb} ${title}`, title). Its webview
// polyfill recognizes %s, %d, %j and %%; modern Node's extra specifiers differ.
// Keep this string/string-only equivalent usable in both CDP DOM expressions
// and screenshot readiness, rather than assuming every title is duplicated.
export function originalRunAfterLabel(verb: string, title: string): string {
  let consumed = false;
  const label = `${verb} ${title}`.replace(/%[sdj%]/g, (specifier) => {
    if (specifier === '%%') {
      return '%';
    }
    if (consumed) {
      return specifier;
    }
    consumed = true;
    switch (specifier) {
      case '%s':
        return title;
      case '%d':
        return String(Number(title));
      case '%j':
        return JSON.stringify(title);
      default:
        return specifier;
    }
  });
  return consumed ? label : `${label} ${title}`;
}

export const runAfterPredecessorLabelDom = `const originalRunAfterLabel = ${originalRunAfterLabel.toString()};`;
