import { useTreeStyles } from './Tree';
import type { ITreeNode } from './Tree';
import { Stack } from '@fluentui/react';
import { Button, mergeClasses } from '@fluentui/react-components';
import { useBoolean } from '@fluentui/react-hooks';
import { ChevronDown20Regular, ChevronRight20Regular } from '@fluentui/react-icons';
import { useMemo } from 'react';
import type { ReactNode } from 'react';

interface TreeBranchProps<T> {
  level: number;
  node: T;
  nodeContent: (node: T) => ReactNode;
  nodeContainerClassName?: string;
}

const TreeBranch = <T extends ITreeNode<T>>({ level, node, nodeContent, nodeContainerClassName }: TreeBranchProps<T>) => {
  const styles = useTreeStyles();
  const [isExpanded, { toggle: toggleExpanded }] = useBoolean(false);

  const hasChildren = useMemo<boolean>(() => !!(node.children && node.children.length > 0), [node]);

  return (
    <>
      <Stack
        className={mergeClasses(styles.nodeContainer, nodeContainerClassName)}
        style={{ paddingLeft: `${level * 16}px` }}
        horizontal
        verticalAlign="center"
      >
        <Button
          appearance="subtle"
          size="small"
          icon={isExpanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
          onClick={toggleExpanded}
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
        />

        {nodeContent(node)}
      </Stack>

      {hasChildren &&
        isExpanded &&
        node.children?.map((childNode) => (
          <TreeBranch<T> key={childNode.key} node={childNode} level={level + 1} nodeContent={nodeContent} />
        ))}
    </>
  );
};

export default TreeBranch;
