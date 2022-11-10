import TreeBranch from './TreeBranch';
import { makeStyles, mergeClasses, shorthands } from '@fluentui/react-components';
import type { ReactNode } from 'react';

export interface ITreeNode<T> {
  key: string | number;
  children?: T[];
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
  nodeContent: (node: T) => ReactNode;
  nodeContainerClassName?: string;
  nodeContainerStyle?: (node: T) => React.CSSProperties;
  childPadding?: number; // 0 will also not render hidden chevrons (meaning the space is recouped) - used in FxList
  onClickItem?: (node: T) => void;
  parentItemClickShouldExpand?: boolean;
}

interface TreeProps<T> extends CoreTreeProps<T> {
  treeRoot: T;
  treeContainerClassName?: string;
}

const Tree = <T extends ITreeNode<T>>(props: TreeProps<T>) => {
  const { treeRoot, treeContainerClassName } = props;
  const styles = useTreeStyles();

  return (
    <div className={mergeClasses(styles.treeContainer, treeContainerClassName)}>
      {treeRoot.children &&
        treeRoot.children.map((childNode) => <TreeBranch<T> {...props} key={childNode.key} level={0} node={childNode} />)}
    </div>
  );
};

export default Tree;
