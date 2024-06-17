import { type SchemaExtended, SchemaType, equals } from '@microsoft/logic-apps-shared';
import { Tree, mergeClasses, type TreeOpenChangeData } from '@fluentui/react-components';
import { useStyles } from './styles';
import { useState, useMemo, useRef } from 'react';
import { useIntl } from 'react-intl';
import { flattenSchemaIntoSortArray } from '../../../utils/Schema.Utils';
import RecursiveTree from './RecursiveTree';

export type SchemaTreeProps = {
  schemaType?: SchemaType;
  schema: SchemaExtended;
};

export const SchemaTree = (props: SchemaTreeProps) => {
  const styles = useStyles();
  const {
    schemaType,
    schema: { schemaTreeRoot },
  } = props;

  const isLeftDirection = useMemo(() => equals(schemaType, SchemaType.Source), [schemaType]);
  const [refreshTree, setRefreshTree] = useState(false);
  const intl = useIntl();
  const treeRef = useRef<HTMLDivElement | null>(null);

  const treeAriaLabel = intl.formatMessage({
    defaultMessage: 'Schema tree',
    id: 't2Xi1/',
    description: 'tree showing schema nodes',
  });

  return schemaTreeRoot ? (
    <Tree
      ref={treeRef}
      className={isLeftDirection ? mergeClasses(styles.leftWrapper, styles.wrapper) : mergeClasses(styles.rightWrapper, styles.wrapper)}
      aria-label={treeAriaLabel}
      defaultOpenItems={flattenSchemaIntoSortArray(schemaTreeRoot)}
      onOpenChange={(_e: any, _d: TreeOpenChangeData) => {
        setRefreshTree(!refreshTree);
      }}
    >
      <RecursiveTree root={schemaTreeRoot} isLeftDirection={isLeftDirection} refreshTree={refreshTree} />
    </Tree>
  ) : null;
};
