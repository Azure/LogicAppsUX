import { sourcePrefix } from '../../../constants/ReactFlowConstants';
import { makeConnection } from '../../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../../core/state/Store';
import { NormalizedDataType } from '../../../models';
import type { Connection } from '../../../models/Connection';
import { NodeType } from '../../../models/SelectedNode';
import type { SelectedNode } from '../../../models/SelectedNode';
import { isCustomValue } from '../../../utils/DataMap.Utils';
import { icon16ForSchemaNodeType } from '../../../utils/Icon.Utils';
import type { InputOptionData, InputOptions } from './FunctionNodePropertiesTab';
import { type ISelectableOption, Stack, ComboBox } from '@fluentui/react';
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, Checkbox, Input, makeStyles, Text } from '@fluentui/react-components';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

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
  currentNode: SelectedNode;
}

export const SchemaNodePropertiesTab = ({ currentNode }: SchemaNodePropertiesTabProps): JSX.Element => {
  const intl = useIntl();
  const styles = useStyles();
  const dispatch = useDispatch<AppDispatch>();

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

  const validateAndCreateConnection = (option?: ISelectableOption<InputOptionData>) => {
    if (!option?.data) {
      return;
    }

    // Don't do anything if same value
    if (option.key === inputValue) {
      return;
    }

    // Remove current connection if it exists

    // TODO

    // Create new connection

    const selectedNodeKey = option.key as string; // TODO: constant value support
    const isFunction = option.data.isFunction;

    const sourceKey = isFunction ? selectedNodeKey : `${sourcePrefix}${selectedNodeKey}`;
    const source = isFunction ? functionNodeDictionary[sourceKey] : sourceSchemaDictionary[sourceKey];
    const destinationKey = currentNode.id;
    const destination = targetSchemaDictionary[destinationKey];

    dispatch(
      makeConnection({
        source,
        destination,
        reactFlowDestination: destinationKey,
        reactFlowSource: sourceKey,
      })
    );
  };

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

  const inputOptions = useMemo<ISelectableOption<InputOptionData>[] | undefined>(() => {
    const newInputOptions: ISelectableOption<InputOptionData>[] = [];

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
        <Text style={{ gridColumn: '1 / span 2' }}>{nameLoc}</Text>
        <Text>{schemaNode?.name}</Text>

        <Text style={{ gridColumn: '1 / span 2' }}>{fullPathLoc}</Text>
        <Text>{schemaNode?.key}</Text>

        <Text style={{ gridColumn: '1 / span 2' }}>{dataTypeLoc}</Text>
        <Stack horizontal verticalAlign="center">
          <DataTypeIcon style={{ marginRight: '5px' }} />
          <Text>{schemaNode?.schemaNodeDataType}</Text>
        </Stack>
      </div>

      {isTargetSchemaNode && (
        <div>
          <div className={styles.nodeInfoGridContainer} style={{ marginTop: '16px' }}>
            <Text style={{ gridColumn: '1 / span 2' }}>{inputLoc}</Text>
            <ComboBox
              options={inputOptions ?? []}
              selectedKey={inputValue}
              onChange={(_e, option) => validateAndCreateConnection(option)}
              allowFreeform={false}
              style={{ marginTop: 8 }}
            />
          </div>

          <Accordion collapsible defaultOpenItems={'1'} style={{ width: '94%', marginTop: '16px' }}>
            <AccordionItem value="1">
              <AccordionHeader>{advOptLoc}</AccordionHeader>
              <AccordionPanel>
                <div className={styles.nodeInfoGridContainer} style={{ marginTop: '16px' }}>
                  <Text style={{ gridColumn: '1 / span 2' }}>{defValLoc}</Text>
                  <Input />
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
