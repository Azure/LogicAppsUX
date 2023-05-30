import { useTreeStyles } from './Tree';
import type { ITreeNode, CoreTreeProps } from './Tree';
import { Stack } from '@fluentui/react';
import { Button, mergeClasses } from '@fluentui/react-components';
import { useBoolean } from '@fluentui/react-hooks';
import { bundleIcon, ChevronDown12Regular, ChevronDown12Filled, ChevronRight12Regular, ChevronRight12Filled } from '@fluentui/react-icons';
import { CardContextMenu, useCardContextMenu } from '@microsoft/designer-ui';
import React, { useMemo } from 'react';
import { useIntl } from 'react-intl';

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
    contextMenuItems,
  } = props;
  const intl = useIntl();
  const styles = useTreeStyles();
  const contextMenu = useCardContextMenu();

  const [isNodeExpanded, { toggle: toggleExpanded }] = useBoolean(node.isExpanded !== undefined ? node.isExpanded : level === 0);
  const [isHovered, { setFalse: setNotHovered, setTrue: setIsHovered }] = useBoolean(false);
  const [isChevronHovered, { setFalse: setChevronNotHovered, setTrue: setChevronIsHovered }] = useBoolean(false);

  const hasChildren = useMemo<boolean>(() => !!(node.children && node.children.length > 0), [node]);

  const expandTreeNodeLoc = intl.formatMessage({
    defaultMessage: 'Expand tree node',
    description: 'Expand tree node',
  });

  const collapseTreeNodeLoc = intl.formatMessage({
    defaultMessage: 'Collapse tree node',
    description: 'Collapse tree node',
  });

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

  const BundledChevronDownIcon = bundleIcon(ChevronDown12Filled, ChevronDown12Regular);
  const BundledChevronRightIcon = bundleIcon(ChevronRight12Filled, ChevronRight12Regular);

  const selectionAreaKeydown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.code === 'Enter') {
      handleItemClick();
    }
  };

  return (
    <div onContextMenu={contextMenu.handle}>
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
              <BundledChevronDownIcon filled={isChevronHovered ? true : undefined} aria-label={collapseTreeNodeLoc} />
            ) : (
              <BundledChevronRightIcon filled={isChevronHovered ? true : undefined} aria-label={expandTreeNodeLoc} />
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

        <span
          style={{ width: '100%', height: '100%', paddingTop: '4px', paddingBottom: '4px' }}
          tabIndex={0}
          onKeyDown={selectionAreaKeydown}
        >
          {nodeContent(node, isHovered)}
        </span>
      </Stack>

      {hasChildren &&
        isNodeExpanded &&
        node.children?.map((childNode) => <TreeBranch<ITreeNode<T>> {...props} key={childNode.key} node={childNode} level={level + 1} />)}
      <CardContextMenu
        title={'contextMenu'}
        contextMenuLocation={contextMenu.location}
        contextMenuOptions={contextMenuItems ? contextMenuItems(node) : []}
        showContextMenu={contextMenu.isShowing}
        onSetShowContextMenu={contextMenu.setIsShowing}
      />
    </div>
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
