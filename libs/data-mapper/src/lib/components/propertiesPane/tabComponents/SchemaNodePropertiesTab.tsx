import { NodeType } from '../../../models/SelectedNode';
import type { SelectedSchemaNode } from '../../../models/SelectedNode';
import { Checkbox, makeStyles, Text } from '@fluentui/react-components';
import { useIntl } from 'react-intl';

const useStyles = makeStyles({
  nodeInfoGridContainer: {
    display: 'grid',
    width: '50%',
    rowGap: '16px',
    columnGap: '12px',
    gridTemplateColumns: 'auto auto auto auto auto auto',
  },
});

interface SchemaNodePropertiesTabProps {
  currentNode: SelectedSchemaNode;
}

export const SchemaNodePropertiesTab = ({ currentNode }: SchemaNodePropertiesTabProps): JSX.Element => {
  const intl = useIntl();
  const styles = useStyles();

  const nameLoc = intl.formatMessage({
    defaultMessage: 'Name',
    description: 'Name of current node',
  });

  const fullPathLoc = intl.formatMessage({
    defaultMessage: 'Full path',
    description: 'Full path of current node',
  });

  const dataTypeLoc = intl.formatMessage({
    defaultMessage: 'Data type',
    description: 'Data type of current node',
  });

  const noValueLabelLoc = intl.formatMessage({
    defaultMessage: 'Do not generate if no value',
    description: 'Checkbox label to not generate if no value',
  });

  const nullableLabelLoc = intl.formatMessage({
    defaultMessage: 'Nullable',
    description: 'Checkbox label for nullable',
  });

  // Base info shared by input/output nodes
  const NodeInfo = () => {
    return (
      <div className={styles.nodeInfoGridContainer}>
        <Text style={{ gridColumn: '1 / span 2' }}>{nameLoc}</Text>
        <Text>{currentNode.name}</Text>

        <Text style={{ gridColumn: '1 / span 2' }}>{fullPathLoc}</Text>
        <Text>{currentNode.path}</Text>

        <Text style={{ gridColumn: '1 / span 2' }}>{dataTypeLoc}</Text>
        <Text>Unknown - TODO</Text>
      </div>
    );
  };

  const AdditionalOutputNodeProperties = () => {
    return (
      <div className={styles.nodeInfoGridContainer}>
        <Checkbox label={noValueLabelLoc} defaultChecked style={{ gridColumn: '1 / span 6' }} />
        <Checkbox label={nullableLabelLoc} defaultChecked style={{ gridColumn: '1 / span 6' }} />
      </div>
    );
  };

  return (
    <div>
      <NodeInfo />

      {currentNode.nodeType === NodeType.Output && <AdditionalOutputNodeProperties />}
    </div>
  );
};
