export interface AutoLinkNode {
  name: string;
  path: string;
  schemaPath?: string;
  children?: AutoLinkNode[];
}

export interface AutoLinkMatch {
  source: AutoLinkNode;
  target: AutoLinkNode;
}

interface NameEntry {
  count: number;
  node: AutoLinkNode;
}

function indexLeafNames(root: AutoLinkNode): Map<string, NameEntry> {
  const index = new Map<string, NameEntry>();
  const visit = (node: AutoLinkNode): void => {
    if (!node.children?.length) {
      const key = node.name.toLowerCase();
      const existing = index.get(key);
      if (existing) {
        existing.count++;
      } else {
        index.set(key, { count: 1, node });
      }
      return;
    }
    node.children.forEach(visit);
  };
  visit(root);
  return index;
}

export function findUniqueNameMatches(
  sourceRoot: AutoLinkNode,
  targetRoot: AutoLinkNode
): { matches: AutoLinkMatch[]; ambiguousNameCount: number } {
  const sourceNames = indexLeafNames(sourceRoot);
  const targetNames = indexLeafNames(targetRoot);
  const matches: AutoLinkMatch[] = [];
  let ambiguousNameCount = 0;

  for (const [name, source] of sourceNames) {
    const target = targetNames.get(name);
    if (!target) {
      continue;
    }
    if (source.count !== 1 || target.count !== 1) {
      ambiguousNameCount++;
      continue;
    }
    matches.push({ source: source.node, target: target.node });
  }

  return { matches, ambiguousNameCount };
}
