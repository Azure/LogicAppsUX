import type { RootState } from '../../../core/state/Store';
import { NormalizedDataType } from '../../../models';
import type { Connection } from '../../../models/Connection';
import { NodeType } from '../../../models/SelectedNode';
import type { SelectedNode } from '../../../models/SelectedNode';
import { isCustomValue } from '../../../utils/DataMap.Utils';
import { icon16ForSchemaNodeType } from '../../../utils/Icon.Utils';
import { InputDropdown } from '../../inputDropdown/InputDropdown';
import type { InputOptions, InputOptionData } from '../../inputDropdown/InputDropdown';
import { Stack } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react';
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, Checkbox, Input, makeStyles, Text } from '@fluentui/react-components';
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
    alignContent: 'center',
    justifyContent: 'start',
  },
});

interface SchemaNodePropertiesTabProps {
  currentNode: SelectedNode;
}

export const SchemaNodePropertiesTab = ({ currentNode }: SchemaNodePropertiesTabProps): JSX.Element => {
  const intl = useIntl();
  const styles = useStyles();

  const currentSourceNodes = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentSourceNodes);
  const sourceSchemaDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedSourceSchema);
  const functionNodeDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentFunctionNodes);
  const targetSchemaDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedTargetSchema);
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);

  // Can be a node name/id or a constant value - only one input per target schema node
  const [inputValue, setInputValue] = useState<string>('');

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

  const isTargetSchemaNode = useMemo(() => currentNode.type === NodeType.Target, [currentNode]);

  const schemaNode = useMemo(() => {
    if (isTargetSchemaNode) {
      return targetSchemaDictionary[currentNode.id];
    } else {
      return sourceSchemaDictionary[currentNode.id];
    }
  }, [currentNode, isTargetSchemaNode, sourceSchemaDictionary, targetSchemaDictionary]);

  const DataTypeIcon = icon16ForSchemaNodeType(schemaNode.schemaNodeDataType);

  const possibleInputOptions = useMemo<InputOptions>(() => {
    const newPossibleInputOptionsDictionary = {} as InputOptions;

    currentSourceNodes.forEach((srcNode) => {
      if (!newPossibleInputOptionsDictionary[srcNode.normalizedDataType]) {
        newPossibleInputOptionsDictionary[srcNode.normalizedDataType] = [];
      }

      newPossibleInputOptionsDictionary[srcNode.normalizedDataType].push({
        nodeKey: srcNode.key,
        nodeName: srcNode.name,
        isFunctionNode: false,
      });
    });

    Object.entries(functionNodeDictionary).forEach(([key, node]) => {
      if (!newPossibleInputOptionsDictionary[node.outputValueType]) {
        newPossibleInputOptionsDictionary[node.outputValueType] = [];
      }

      newPossibleInputOptionsDictionary[node.outputValueType].push({
        nodeKey: key,
        nodeName: node.functionName,
        isFunctionNode: true,
      });
    });

    return newPossibleInputOptionsDictionary;
  }, [currentSourceNodes, functionNodeDictionary]);

  const inputOptions = useMemo<IDropdownOption<InputOptionData>[] | undefined>(() => {
    const newInputOptions: IDropdownOption<InputOptionData>[] = [];

    if (schemaNode.normalizedDataType === NormalizedDataType.Any) {
      Object.values(possibleInputOptions).forEach((typeEntry) => {
        typeEntry.forEach((possibleOption) => {
          newInputOptions.push({
            key: possibleOption.nodeKey,
            text: possibleOption.nodeName,
            data: {
              isFunction: !!possibleOption.isFunctionNode,
            },
          });
        });
      });
    } else {
      if (!possibleInputOptions[schemaNode.normalizedDataType]) {
        return;
      }

      possibleInputOptions[schemaNode.normalizedDataType].forEach((possibleOption) => {
        newInputOptions.push({
          key: possibleOption.nodeKey,
          text: possibleOption.nodeName,
          data: {
            isFunction: !!possibleOption.isFunctionNode,
          },
        });
      });
    }

    return newInputOptions;
  }, [possibleInputOptions, schemaNode]);

  const connection = useMemo<Connection | undefined>(() => connectionDictionary[currentNode.id], [connectionDictionary, currentNode]);

  useEffect(() => {
    let newInputValue = '';

    if (connection && connection.inputs.length === 1) {
      const input = connection.inputs[0];
      newInputValue = !input ? '' : isCustomValue(input) ? input : input.node.key;
    }

    setInputValue(newInputValue);
  }, [connection]);

  return (
    <div>
      <div className={styles.nodeInfoGridContainer}>
        <Text style={{ gridColumn: gridColumnSpan1 }}>{nameLoc}</Text>
        <Text style={{ gridColumn: gridColumnSpan2 }}>{schemaNode?.name}</Text>

        <Text style={{ gridColumn: gridColumnSpan1 }}>{fullPathLoc}</Text>
        <Text style={{ gridColumn: gridColumnSpan2 }}>{schemaNode?.key}</Text>

        <Text style={{ gridColumn: gridColumnSpan1 }}>{dataTypeLoc}</Text>
        <Stack horizontal verticalAlign="center" style={{ gridColumn: gridColumnSpan2 }}>
          <DataTypeIcon style={{ marginRight: '5px' }} />
          <Text>{schemaNode?.schemaNodeDataType}</Text>
        </Stack>
      </div>

      {isTargetSchemaNode && (
        <div>
          <div className={styles.nodeInfoGridContainer} style={{ marginTop: '16px' }}>
            <Text style={{ gridColumn: gridColumnSpan1 }}>{inputLoc}</Text>
            <InputDropdown
              currentNode={currentNode}
              typeMatchedOptions={inputOptions}
              inputValue={inputValue}
              inputStyles={{ gridColumn: gridColumnSpan2 }}
              inputIndex={0}
            />
          </div>

          <Accordion collapsible defaultOpenItems={'1'} style={{ width: '94%', marginTop: '16px' }}>
            <AccordionItem value="1">
              <AccordionHeader>{advOptLoc}</AccordionHeader>
              <AccordionPanel>
                <div className={styles.nodeInfoGridContainer} style={{ marginTop: '16px' }}>
                  <Text style={{ gridColumn: gridColumnSpan1 }}>{defValLoc}</Text>
                  <Input style={{ gridColumn: gridColumnSpan2 }} />
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
