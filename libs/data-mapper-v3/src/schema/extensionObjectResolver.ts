import * as path from 'path';
import { XMLValidator } from 'fast-xml-parser';
import { create } from 'xmlbuilder2';

export function parseExtensionObjectXml(content: string): ReturnType<typeof create> {
  if (XMLValidator.validate(content) !== true) {
    throw new Error('Custom extension-object XML contains malformed XML');
  }
  const document = create(content);
  const root = document.root().node.ownerDocument!.documentElement!;
  if (root.localName !== 'ExtensionObjects' || root.namespaceURI) {
    throw new Error('Custom extension-object XML must have an unqualified ExtensionObjects root');
  }
  for (const element of Array.from(root.childNodes).filter((element): element is typeof root => element?.nodeType === 1)) {
    if (element.localName !== 'ExtensionObject' || element.namespaceURI) {
      throw new Error('Custom extension-object XML contains an invalid ExtensionObject entry');
    }
    if (['Namespace', 'AssemblyName', 'ClassName'].some((name) => !element.getAttribute(name)?.trim())) {
      throw new Error('ExtensionObject requires Namespace, AssemblyName, and ClassName');
    }
  }
  return document;
}

export function resolveExtensionObjectAssemblyPaths(content: string, baseDirectory: string): string {
  const document = parseExtensionObjectXml(content);
  const root = document.root().node.ownerDocument!.documentElement!;
  let changed = false;
  for (const element of Array.from(root.childNodes).filter((element): element is typeof root => element?.nodeType === 1)) {
    const assemblyName = element.getAttribute('AssemblyName')!;
    const resolved = resolveAssemblyFilePath(assemblyName, baseDirectory);
    if (resolved !== assemblyName) {
      element.setAttribute('AssemblyName', resolved);
      changed = true;
    }
  }
  return changed ? document.end({ prettyPrint: true }) : content;
}

export function resolveAssemblyFilePath(assemblyName: string, baseDirectory: string): string {
  return (/[\\/]/.test(assemblyName) || /\.(dll|exe)$/i.test(assemblyName)) && !path.isAbsolute(assemblyName)
    ? path.resolve(baseDirectory, assemblyName)
    : assemblyName;
}
