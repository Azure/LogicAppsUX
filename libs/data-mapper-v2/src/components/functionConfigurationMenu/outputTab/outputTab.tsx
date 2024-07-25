import { Caption1, Button } from "@fluentui/react-components";
import { AddRegular } from "@fluentui/react-icons";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../../core/state/Store";
import type { FunctionData, FunctionDictionary } from "../../../models";
import type { ConnectionDictionary, ConnectionUnit, InputConnection } from "../../../models/Connection";
import type { InputOptionProps } from "../inputDropdown/InputDropdown";
import { UnboundedDropdownListItem } from "../inputTab/inputTab";
import { useStyles } from "../styles";
import { List } from "@fluentui/react-list-preview";
import { SchemaNodeDictionary } from "@microsoft/logic-apps-shared";
import { newConnectionWillHaveCircularLogic } from "../../../utils/Connection.Utils";

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

    const createConnection = (_optionValue: string | undefined, _option: InputOptionProps | undefined) => {
      return;
    };
  
    if (outputs.length === 0) {
      outputs[0] = undefined;
    }
  
    const addOutputClick = () => {
      outputs.push(undefined);
    }

    const updateInput = (newValue: InputConnection) => {
        const targetNodeReactFlowKey = props.functionId;
        dispatch(
          setConnectionInput({
            targetNode: props.func,
            targetNodeReactFlowKey,
            inputIndex: index,
            input: newValue,
          })
        );
      };

      const validateAndCreateConnection = (optionValue: string | undefined, option: InputOptionProps | undefined) => {
        if (optionValue) {
          const output = validateAndCreateConnectionOutput(
            optionValue,
            option,
            connectionDictionary,
            props.func,
            functionNodeDictionary,
            targetSchemaDictionary
          );
          if (output) {
            updateInput(output);
          }
        }
      };
  
    const table = (
      <List>
          {outputs.map((output, index) => {
            const listItem = <UnboundedDropdownListItem
            key={`output-list-item-${index}`}
            inputName={output?.node.key}
            inputValue={undefined}
            inputType={undefined}
            validateAndCreateConnection={createConnection}
            functionKey={props.functionId}
            func={props.func}
            draggable={false}
            removeItem={() => {
              return;
            }}
          />
            return listItem;
          })}
      </List>
    );
    const addOutput = (
      <Button icon={<AddRegular className={styles.addIcon} />} onClick={() => addOutputClick()} className={styles.addButton} appearance="transparent">
        <Caption1>Add Output</Caption1>
      </Button>
    );
    return (
      <>
        <div>{table}</div> {addOutput}
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
          //dispatch(showNotification({ type: NotificationTypes.CircularLogicError, autoHideDurationMs: errorNotificationAutoHideDuration }));
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