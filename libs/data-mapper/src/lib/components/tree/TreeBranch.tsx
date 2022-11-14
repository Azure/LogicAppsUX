import { useTreeStyles } from './Tree';
import type { ITreeNode, CoreTreeProps } from './Tree';
import { Stack } from '@fluentui/react';
import { Button, mergeClasses } from '@fluentui/react-components';
import { useBoolean } from '@fluentui/react-hooks';
import { ChevronDown20Regular, ChevronRight20Regular } from '@fluentui/react-icons';
import React, { useMemo } from 'react';

const defaultChildPadding = 16;

interface TreeBranchProps<T> extends CoreTreeProps<T> {
  level: number;
  node: T;
}

const TreeBranch = <T extends ITreeNode<T>>(props: TreeBranchProps<T>) => {
  const {
    level,
    node,
    nodeContent,
    nodeContainerClassName,
    nodeContainerStyle,
    childPadding = defaultChildPadding,
    onClickItem,
    parentItemClickShouldExpand,
  } = props;
  const styles = useTreeStyles();
  const [isExpanded, { toggle: toggleExpanded }] = useBoolean(false);
  const [isHovered, { setFalse: setNotHovered, setTrue: setIsHovered }] = useBoolean(false);

  const hasChildren = useMemo<boolean>(() => !!(node.children && node.children.length > 0), [node]);
  const isNodeExpanded = useMemo<boolean>(() => (node.isExpanded === undefined ? isExpanded : node.isExpanded), [node, isExpanded]);

  const handleItemClick = () => {
    if (hasChildren && parentItemClickShouldExpand) {
      toggleExpanded();
    }

    if (onClickItem) {
      onClickItem(node);
    }
  };

  const handleChevronClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    toggleExpanded();
  };

  return (
    <>
      <Stack
        className={mergeClasses(styles.nodeContainer, nodeContainerClassName)}
        style={{
          ...(nodeContainerStyle ? nodeContainerStyle(node) : {}),
          paddingLeft: `${level * childPadding}px`,
          cursor: onClickItem || !!parentItemClickShouldExpand ? 'pointer' : undefined,
        }}
        horizontal
        verticalAlign="center"
        onClick={handleItemClick}
        onMouseEnter={setIsHovered}
        onMouseLeave={setNotHovered}
      >
        <Button
          appearance="transparent"
          size="small"
          icon={isNodeExpanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
          onClick={handleChevronClick}
          style={{
            visibility: hasChildren ? 'visible' : 'hidden',
            display: childPadding === 0 && !hasChildren ? 'none' : undefined,
          }}
        />

        {nodeContent(node, isHovered)}
      </Stack>

      {hasChildren &&
        isNodeExpanded &&
        node.children?.map((childNode) => <TreeBranch<T> {...props} key={childNode.key} node={childNode} level={level + 1} />)}
    </>
  );
};

export default TreeBranch;
