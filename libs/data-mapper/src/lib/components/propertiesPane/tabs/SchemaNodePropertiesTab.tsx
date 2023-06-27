import type { RootState } from '../../../core/state/Store';
import type { SchemaNodeExtended } from '../../../models';
import type { Connection } from '../../../models/Connection';
import { isCustomValue } from '../../../utils/Connection.Utils';
import { iconForNormalizedDataType } from '../../../utils/Icon.Utils';
import { addTargetReactFlowPrefix } from '../../../utils/ReactFlow.Util';
import { InputDropdown } from '../../inputDropdown/InputDropdown';
import { Stack } from '@fluentui/react';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Checkbox,
  Input,
  Label,
  makeStyles,
  Text,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

const gridColumnSpan1 = '1 / span 1';
const gridColumnSpan2 = '2 / span 2';

const useStyles = makeStyles({
  nodeInfoGridContainer: {
    display: 'grid',
    width: '100%',
    rowGap: '16px',
    columnGap: '12px',
    gridTemplateColumns: 'repeat(6, 1fr)',
    alignItems: 'center',
    justifyContent: 'start',
  },
  bodyText: {
    ...typographyStyles.body1,
    color: tokens.colorNeutralForeground1,
  },
});

interface SchemaNodePropertiesTabProps {
  currentNode: SchemaNodeExtended;
}

export const SchemaNodePropertiesTab = ({ currentNode }: SchemaNodePropertiesTabProps): JSX.Element => {
  const intl = useIntl();
  const styles = useStyles();

  const targetSchemaDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedTargetSchema);
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);

  // Can be a node name/id or a constant value - only one input per target schema node
  const [inputValue, setInputValue] = useState<string | undefined>(undefined);

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
    description: 'The data type of the current node.',
  });

  const noValueLabelLoc = intl.formatMessage({
    defaultMessage: 'Do not generate if no value',
    description: 'Checkbox label to not generate if no value',
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

  const isTargetSchemaNode = useMemo(
    () => !!targetSchemaDictionary[addTargetReactFlowPrefix(currentNode.key)],
    [currentNode, targetSchemaDictionary]
  );

  const DataTypeIcon = iconForNormalizedDataType(currentNode.type, 16, false, currentNode.nodeProperties);

  const connection = useMemo<Connection | undefined>(
    () => connectionDictionary[addTargetReactFlowPrefix(currentNode.key)],
    [connectionDictionary, currentNode]
  );

  useEffect(() => {
    let newInputValue = undefined;

    if (connection?.inputs && connection.inputs[0].length === 1) {
      const input = connection.inputs[0][0];
      newInputValue = input === undefined ? undefined : isCustomValue(input) ? input : input.reactFlowKey;
    }

    setInputValue(newInputValue);
  }, [connection]);

  return (
    <div>
      <div className={styles.nodeInfoGridContainer}>
        <Label style={{ gridColumn: gridColumnSpan1 }}>{nameLoc}</Label>
        <Text className={styles.bodyText} style={{ gridColumn: gridColumnSpan2 }}>
          {currentNode?.name}
        </Text>

        <Label style={{ gridColumn: gridColumnSpan1 }}>{fullPathLoc}</Label>
        <Text className={styles.bodyText} style={{ gridColumn: gridColumnSpan2 }}>
          {currentNode?.key}
        </Text>

        <Label style={{ gridColumn: gridColumnSpan1 }}>{dataTypeLoc}</Label>
        <Stack horizontal verticalAlign="center" style={{ gridColumn: gridColumnSpan2 }}>
          <DataTypeIcon style={{ marginRight: '5px', color: tokens.colorNeutralForeground1 }} />
          <Text className={styles.bodyText}>{currentNode?.type}</Text>
        </Stack>
      </div>

      {isTargetSchemaNode && (
        <div>
          <div className={styles.nodeInfoGridContainer} style={{ marginTop: '16px' }}>
            <Label id="label-for-target-node-input-dropdown" htmlFor="dropdown" style={{ gridColumn: gridColumnSpan1 }}>
              {inputLoc}
            </Label>
            <InputDropdown
              id="target-node-input-dropdown"
              labelId="label-for-target-node-input-dropdown"
              currentNode={currentNode}
              inputValue={inputValue}
              inputStyles={{ gridColumn: gridColumnSpan2 }}
              inputIndex={0}
            />
          </div>

          {false && ( // Hiding advanced options until implemented
            <Accordion collapsible defaultOpenItems={'1'} style={{ width: '94%', marginTop: '16px', marginLeft: '-12px' }}>
              <AccordionItem value="1">
                <AccordionHeader className={styles.bodyText}>{advOptLoc}</AccordionHeader>
                <AccordionPanel>
                  <div className={styles.nodeInfoGridContainer} style={{ marginTop: '16px' }}>
                    <Label style={{ gridColumn: gridColumnSpan1 }}>{defValLoc}</Label>
                    <Input style={{ gridColumn: gridColumnSpan2 }} />
                  </div>

                  <Stack>
                    <Checkbox label={noValueLabelLoc} defaultChecked style={{ marginTop: '16px' }} />
                  </Stack>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      )}
    </div>
  );
};
