import TreeBranch from './TreeBranch';
import { makeStyles, mergeClasses, shorthands } from '@fluentui/react-components';
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
});

export interface CoreTreeProps<T> {
  nodeContent: (node: ITreeNode<T>, isHovered: boolean) => ReactNode;
  nodeContainerClassName?: string;
  nodeContainerStyle?: (node: ITreeNode<T>) => React.CSSProperties;
  childPadding?: number; // 0 will also not render hidden chevrons (meaning the space is recouped) - used in FxList
  onClickItem?: (node: ITreeNode<T>) => void;
  parentItemClickShouldExpand?: boolean;
}

interface TreeProps<T> extends CoreTreeProps<T> {
  treeRoot: ITreeNode<T>;
  treeContainerClassName?: string;
}

const Tree = <T extends ITreeNode<T>>(props: TreeProps<T>) => {
  const { treeRoot, treeContainerClassName } = props;
  const styles = useTreeStyles();

  return (
    <div className={mergeClasses(styles.treeContainer, treeContainerClassName)}>
      {treeRoot.children &&
        treeRoot.children.map((childNode) => <TreeBranch<ITreeNode<T>> {...props} key={childNode.key} level={0} node={childNode} />)}
    </div>
  );
};

export default Tree;
