import type { RootState } from '../../../core/state/Store';
import type { SchemaNodeExtended } from '../../../models';
import { icon16ForSchemaNodeType } from '../../../utils/Icon.Utils';
import { Stack } from '@fluentui/react';
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, Checkbox, Input, makeStyles, Text } from '@fluentui/react-components';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

const useStyles = makeStyles({
  nodeInfoGridContainer: {
    display: 'grid',
    width: '50%',
    rowGap: '16px',
    columnGap: '12px',
    gridTemplateColumns: 'auto auto auto auto auto auto',
    alignItems: 'center',
  },
});

interface SchemaNodePropertiesTabProps {
  currentNode: SchemaNodeExtended;
}

export const SchemaNodePropertiesTab = ({ currentNode }: SchemaNodePropertiesTabProps): JSX.Element => {
  const intl = useIntl();
  const styles = useStyles();

  const targetSchemaDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedTargetSchema);

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

  const inputLoc = intl.formatMessage({
    defaultMessage: 'Input',
    description: 'Input',
  });

  const advOptLoc = intl.formatMessage({
    defaultMessage: 'Advanced options',
    description: 'Advanced options',
  });

  const defValLoc = intl.formatMessage({
    defaultMessage: 'Default value',
    description: 'Default value',
  });

  const isTargetSchemaNode = useMemo(() => !!targetSchemaDictionary[currentNode.key], [currentNode.key, targetSchemaDictionary]);

  const DataTypeIcon = icon16ForSchemaNodeType(currentNode.schemaNodeDataType);

  return (
    <div>
      <div className={styles.nodeInfoGridContainer}>
        <Text style={{ gridColumn: '1 / span 2' }}>{nameLoc}</Text>
        <Text>{currentNode.name}</Text>

        <Text style={{ gridColumn: '1 / span 2' }}>{fullPathLoc}</Text>
        <Text>{currentNode.key}</Text>

        <Text style={{ gridColumn: '1 / span 2' }}>{dataTypeLoc}</Text>
        <Stack horizontal verticalAlign="center">
          <DataTypeIcon style={{ marginRight: '5px' }} />
          <Text>{currentNode.schemaNodeDataType}</Text>
        </Stack>
      </div>

      {isTargetSchemaNode && (
        <div>
          <div className={styles.nodeInfoGridContainer} style={{ marginTop: '16px' }}>
            <Text style={{ gridColumn: '1 / span 2' }}>{inputLoc}</Text>
            <Input placeholder="Temporary placeholder" />
          </div>

          <Accordion collapsible defaultOpenItems={'1'} style={{ width: '94%', marginTop: '16px' }}>
            <AccordionItem value="1">
              <AccordionHeader>{advOptLoc}</AccordionHeader>
              <AccordionPanel>
                <div className={styles.nodeInfoGridContainer} style={{ marginTop: '16px' }}>
                  <Text style={{ gridColumn: '1 / span 2' }}>{defValLoc}</Text>
                  <Input placeholder="Temporary placeholder" />
                </div>

                <Stack>
                  <Checkbox label={noValueLabelLoc} defaultChecked style={{ marginTop: '16px' }} />
                  <Checkbox label={nullableLabelLoc} defaultChecked style={{ marginTop: '16px' }} />
                </Stack>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </div>
  );
};
