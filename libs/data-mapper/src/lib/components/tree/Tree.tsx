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

interface TreeProps<T> {
  treeRoot: T;
  nodeContent: (node: T) => ReactNode;
  treeContainerClassName?: string;
  nodeContainerClassName?: string;
}

const Tree = <T extends ITreeNode<T>>({ treeRoot, nodeContent, treeContainerClassName, nodeContainerClassName }: TreeProps<T>) => {
  const styles = useTreeStyles();

  return (
    <div className={mergeClasses(styles.treeContainer, treeContainerClassName)}>
      {treeRoot.children &&
        treeRoot.children.map((childNode) => (
          <TreeBranch<T>
            key={childNode.key}
            level={0}
            node={childNode}
            nodeContent={nodeContent}
            nodeContainerClassName={nodeContainerClassName}
          />
        ))}
    </div>
  );
};

export default Tree;
