import TreeBranch from './TreeBranch';
import { makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import type { ReactNode } from 'react';

export interface ITreeNode<T> {
  key: string;
  isExpanded?: boolean;
  children?: ITreeNode<T>[];
  [key: string]: any;
}

export const useTreeStyles = makeStyles({
  treeContainer: {
    ...shorthands.overflow('auto'),
  },
  nodeContainer: {
    width: '100%',
  },
  indicator: {
    height: '16px',
    width: '2px',
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    backgroundColor: tokens.colorBrandForeground1,
  },
  chevron: {
    color: `${tokens.colorNeutralForeground3} !important`,
    ':hover :focus :active': {
      color: tokens.colorNeutralForeground3,
    },
  },
});

export interface CoreTreeProps<T> {
  nodeContent: (node: ITreeNode<T>, isHovered: boolean) => ReactNode;
  nodeContainerClassName?: string;
  nodeContainerStyle?: (node: ITreeNode<T>) => React.CSSProperties;
  childPadding?: number; // 0 will also not render hidden chevrons (meaning the space is recouped) - used in FxList
  onClickItem?: (node: ITreeNode<T>) => void;
  shouldShowIndicator?: (node: ITreeNode<T>) => boolean;
  parentItemClickShouldExpand?: boolean;
  contextMenuItems?: (node: ITreeNode<T>) => JSX.Element[];
}

interface TreeProps<T> extends CoreTreeProps<T> {
  treeRoot?: ITreeNode<T>;
  treeContainerClassName?: string;
}

const Tree = <T extends ITreeNode<T>>(props: TreeProps<T>) => {
  const { treeRoot, treeContainerClassName } = props;
  const styles = useTreeStyles();

  return (
    <div className={mergeClasses(styles.treeContainer, treeContainerClassName)}>
      {treeRoot?.children?.map((childNode) => (
        <TreeBranch<ITreeNode<T>> {...props} key={childNode.key} level={0} node={childNode} />
      ))}
    </div>
  );
};

export default Tree;
