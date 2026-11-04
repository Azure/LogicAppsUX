import { SaxesParser } from 'saxes';

type OutputMethod = 'xml' | 'html' | 'text';

export function validateTestMapOutput(xslt: string, output: string): OutputMethod {
  let declaredMethod: string | undefined;
  let depth = 0;
  const stylesheet = new SaxesParser({ xmlns: true });
  stylesheet.on('opentag', (tag) => {
    if (depth === 1 && tag.uri === 'http://www.w3.org/1999/XSL/Transform' && tag.local === 'output') {
      declaredMethod = tag.attributes.method?.value.trim() || declaredMethod;
    }
    depth++;
  });
  stylesheet.on('closetag', () => depth--);
  stylesheet.write(xslt).close();

  if (declaredMethod === 'text' || declaredMethod === 'html') {
    return declaredMethod;
  }

  let method: OutputMethod = 'xml';
  let hasRoot = false;
  const document = new SaxesParser({ xmlns: true, fragment: false });
  document.on('opentag', (tag) => {
    if (!hasRoot && !declaredMethod && !tag.uri && !tag.prefix && tag.local.toLowerCase() === 'html') {
      method = 'html';
    }
    hasRoot = true;
  });
  document.on('error', (error) => {
    if (method !== 'html') {
      throw error;
    }
  });
  document.write(output).close();
  return method;
}
