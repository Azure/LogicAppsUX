import { Caption1, Button } from '@fluentui/react-components';
import { AddRegular } from '@fluentui/react-icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../../core/state/Store';
import type { FunctionData, FunctionDictionary } from '../../../models';
import type { ConnectionDictionary, ConnectionUnit, InputConnection } from '../../../models/Connection';
import type { InputOptionProps } from '../inputDropdown/InputDropdown';
import { useStyles } from '../styles';
import { List } from '@fluentui/react-list-preview';
import type { SchemaNodeDictionary } from '@microsoft/logic-apps-shared';
import { SchemaType } from '@microsoft/logic-apps-shared';
import { flattenInputs, newConnectionWillHaveCircularLogic } from '../../../utils/Connection.Utils';
import { makeConnectionFromMap, setConnectionInput } from '../../../core/state/DataMapSlice';
import { useState } from 'react';
import { isSchemaNodeExtended } from '../../../utils';
import { CustomListItem } from '../inputTab/InputList';

export const OutputTabContents = (props: {
  func: FunctionData;
  functionId: string;
}) => {
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);
  const targetSchemaDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.flattenedTargetSchema);
  const functionNodeDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.functionNodes);
  const connections = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);
  const styles = useStyles();
  const outputs: (ConnectionUnit | undefined)[] = [...connections[props.functionId].outputs];
  const dispatch = useDispatch();
  const [additionalOutput, setAdditionalOutput] = useState<(ConnectionUnit | undefined)[]>([]);

  if (outputs.length === 0) {
    outputs[0] = undefined;
  }

  const addOutputClick = () => {
    setAdditionalOutput([...additionalOutput, undefined]);
  };

  const getIDForTargetConnection = (connection: InputConnection) => {
    if (connection === undefined) {
      return '';
    }
    if (typeof connection === 'string') {
      return connection;
    }
    return connection.reactFlowKey;
  };

  const removeConnection = (newOutput: InputConnection) => {
    if (newOutput === undefined) {
      return;
    }
    const dest = getIDForTargetConnection(newOutput);
    const destinationNode = connectionDictionary[dest];
    const flattened = flattenInputs(destinationNode.inputs);
    const index = flattened.findIndex((input) => getIDForTargetConnection(input) === props.functionId);
    dispatch(
      setConnectionInput({
        targetNode: destinationNode.self.node,
        targetNodeReactFlowKey: dest,
        inputIndex: index,
        input: undefined,
      })
    );
  };

  const updateConnection = (newOutput: InputConnection) => {
    if (newOutput === undefined) {
      return;
    }
    const dest = getIDForTargetConnection(newOutput);
    dispatch(
      makeConnectionFromMap({
        reactFlowSource: props.functionId,
        reactFlowDestination: dest,
      })
    );
  };

  const validateAndCreateConnection = (
    optionValue: string | undefined,
    option: InputOptionProps | undefined,
    oldOutput: InputConnection
  ) => {
    removeConnection(oldOutput);
    if (optionValue) {
      const newOutput = validateAndCreateConnectionOutput(
        optionValue,
        option,
        connectionDictionary,
        props.func,
        functionNodeDictionary,
        targetSchemaDictionary
      );
      if (newOutput) {
        updateConnection(newOutput);
      }
    }
  };

  return (
    <>
      <div>
        <List>
          {outputs.concat(additionalOutput).map((output, index) => {
            let outputValue = undefined;
            if (output) {
              outputValue = isSchemaNodeExtended(output?.node) ? output?.node.name : '';
            }
            const listItem = (
              <CustomListItem
                customValueAllowed={false}
                key={`output-list-item-${index}`}
                schemaType={SchemaType.Target}
                name={outputValue}
                value={outputValue}
                type={undefined}
                validateAndCreateConnection={(optionValue: string | undefined, option: InputOptionProps | undefined) =>
                  validateAndCreateConnection(optionValue, option, output)
                }
                functionKey={props.functionId}
                functionData={props.func}
                draggable={false}
                remove={() => {
                  removeConnection(output);
                }}
                index={index}
              />
            );
            return listItem;
          })}
        </List>
      </div>
      <Button
        icon={<AddRegular className={styles.addIcon} />}
        onClick={() => addOutputClick()}
        className={styles.addButton}
        appearance="transparent"
      >
        <Caption1>Add Output</Caption1>
      </Button>
    </>
  );
};

const validateAndCreateConnectionOutput = (
  optionValue: string | undefined,
  option: InputOptionProps | undefined,
  connectionDictionary: ConnectionDictionary,
  func: FunctionData,
  functionNodeDictionary: FunctionDictionary,
  sourceSchemaDictionary: SchemaNodeDictionary
) => {
  if (optionValue) {
    if (option) {
      const selectedOutputKey = option.value;
      const isSelectedOutputFunction = option.isFunction;

      // ensure that new connection won't create loop/circular logic
      if (newConnectionWillHaveCircularLogic(selectedOutputKey, func.key, connectionDictionary)) {
        return;
      }

      // Create connection
      const output = isSelectedOutputFunction ? functionNodeDictionary[selectedOutputKey] : sourceSchemaDictionary[selectedOutputKey];
      const srcConUnit: ConnectionUnit = {
        node: output,
        reactFlowKey: selectedOutputKey,
      };

      return srcConUnit;
    }
    // Create custom value connection
    const srcConUnit: InputConnection = optionValue;

    return srcConUnit;
  }
  return;
};
