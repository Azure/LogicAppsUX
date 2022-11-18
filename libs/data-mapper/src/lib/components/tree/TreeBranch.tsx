import { useTreeStyles } from './Tree';
import type { ITreeNode, CoreTreeProps } from './Tree';
import { Stack } from '@fluentui/react';
import { Button, mergeClasses } from '@fluentui/react-components';
import { useBoolean } from '@fluentui/react-hooks';
import { bundleIcon, ChevronDown20Regular, ChevronDown20Filled, ChevronRight20Regular, ChevronRight20Filled } from '@fluentui/react-icons';
import React, { useMemo } from 'react';

const defaultChildPadding = 16;

interface TreeBranchProps<T> extends CoreTreeProps<T> {
  level: number;
  node: ITreeNode<T>;
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
    shouldShowIndicator,
    parentItemClickShouldExpand,
  } = props;
  const styles = useTreeStyles();
  const [isExpanded, { toggle: toggleExpanded }] = useBoolean(level === 0);
  const [isHovered, { setFalse: setNotHovered, setTrue: setIsHovered }] = useBoolean(false);
  const [isChevronHovered, { setFalse: setChevronNotHovered, setTrue: setChevronIsHovered }] = useBoolean(false);

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

  const BundledChevronDownIcon = bundleIcon(ChevronDown20Filled, ChevronDown20Regular);
  const BundledChevronRightIcon = bundleIcon(ChevronRight20Filled, ChevronRight20Regular);

  return (
    <>
      <Stack
        className={mergeClasses(styles.nodeContainer, nodeContainerClassName)}
        style={{
          ...(nodeContainerStyle ? nodeContainerStyle(node) : {}),
          paddingLeft: `${level * childPadding}px`,
          cursor: onClickItem || !!parentItemClickShouldExpand ? 'pointer' : undefined,
          position: 'relative',
        }}
        horizontal
        verticalAlign="center"
        onClick={handleItemClick}
        onMouseEnter={setIsHovered}
        onMouseLeave={setNotHovered}
      >
        <TreeIndicator shouldShowIndicator={shouldShowIndicator && shouldShowIndicator(node)} />

        <Button
          appearance="transparent"
          size="small"
          icon={
            isNodeExpanded ? (
              <BundledChevronDownIcon filled={isChevronHovered ? true : undefined} />
            ) : (
              <BundledChevronRightIcon filled={isChevronHovered ? true : undefined} />
            )
          }
          onClick={handleChevronClick}
          className={styles.chevron}
          style={{
            visibility: hasChildren ? 'visible' : 'hidden',
            display: childPadding === 0 && !hasChildren ? 'none' : undefined,
          }}
          onMouseEnter={setChevronIsHovered}
          onMouseLeave={setChevronNotHovered}
        />

        {nodeContent(node, isHovered)}
      </Stack>

      {hasChildren &&
        isNodeExpanded &&
        node.children?.map((childNode) => <TreeBranch<ITreeNode<T>> {...props} key={childNode.key} node={childNode} level={level + 1} />)}
    </>
  );
};

interface TreeIndicatorProps {
  shouldShowIndicator?: boolean;
}

export const TreeIndicator = ({ shouldShowIndicator }: TreeIndicatorProps) => {
  const styles = useTreeStyles();

  return (
    <div className={styles.indicator} style={{ position: 'absolute', left: 4, visibility: shouldShowIndicator ? 'visible' : 'hidden' }} />
  );
};

export default TreeBranch;
