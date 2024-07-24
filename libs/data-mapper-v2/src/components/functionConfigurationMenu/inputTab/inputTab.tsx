import { Badge, Button, Caption1, Caption2 } from '@fluentui/react-components';
import { LinkDismissRegular, ReOrderRegular, AddRegular } from '@fluentui/react-icons';
import { List, ListItem } from '@fluentui/react-list-preview';
import { useDrag } from 'react-dnd';
import { useDispatch, useSelector } from 'react-redux';
import { UnboundedInput } from '../../../constants/FunctionConstants';
import { createInputSlotForUnboundedInput, setConnectionInput } from '../../../core/state/DataMapSlice';
import type { RootState } from '../../../core/state/Store';
import type { FunctionData } from '../../../models';
import type { ConnectionDictionary, InputConnection } from '../../../models/Connection';
import { getInputName, getInputValue } from '../../../utils/Function.Utils';
import { InputDropdown } from '../inputDropdown/InputDropdown';
import { useStyles } from './styles';
import { mergeStyles } from '@fluentui/react';
import { isSchemaNodeExtended } from '../../../utils';

export const InputTabContents = (props: {
  func: FunctionData;
  functionKey: string;
}) => {
  const styles = useStyles();

  const connections = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);

  let table: JSX.Element;
  const functionConnection = connections[props.functionKey];

  if (props.func.maxNumberOfInputs !== UnboundedInput) {
    const tableContents = props.func.inputs.map((input, index) => {
      const inputConnection = functionConnection
        ? Object.values(functionConnection.inputs).length > 1
          ? functionConnection.inputs[index][0]
          : functionConnection.inputs[0][index]
        : undefined;

      const inputType = getInputTypeFromNode(inputConnection);

      return (
        <div className={styles.boundedInputRow} key={index}>
          <div className={styles.boundedInputTopRow}>
            <div className={styles.inputNameDiv}>
              <Caption1 className={styles.inputName}>{input.name}</Caption1>
              <Caption2>{input.placeHolder}</Caption2>
            </div>
            <Caption2 className={styles.allowedTypes}>Allowed types: {input.allowedTypes}</Caption2>
          </div>
          <div>
            <span className={styles.inputDropdownWrapper}>
              <InputDropdown
                functionId={props.functionKey}
                currentNode={props.func}
                inputName={getInputName(inputConnection, connections)}
                inputValue={getInputValue(inputConnection)}
                inputIndex={index}
                isUnboundedInput={true}
              />
            </span>
            <span className={styles.badgeWrapper}>
              {inputType && (
                <Badge appearance="filled" color="informative">
                  {inputType}
                </Badge>
              )}
            </span>
          </div>
        </div>
      );
    });
    table = <div>{tableContents}</div>;
  } else {
    table = <UnlimitedInputs func={props.func} functionKey={props.functionKey} connections={connections} />;
  }
  return (
    <div>
      <div>{table}</div>
    </div>
  );
};

const UnlimitedInputs = (props: {
  func: FunctionData;
  functionKey: string;
  connections: ConnectionDictionary;
}) => {
  const inputsFromManifest = props.func.inputs;
  const styles = useStyles();
  const dispatch = useDispatch();

  const addUnboundedInputSlot = () => {
    dispatch(createInputSlotForUnboundedInput(props.functionKey));
  };

  const removeUnboundedInput = (index: number) => {
    updateInput(index, null);
  };

  const functionConnection = props.connections[props.functionKey];

  const updateInput = (inputIndex: number, newValue: InputConnection | null) => {
    const targetNodeReactFlowKey = props.functionKey;
    dispatch(
      setConnectionInput({
        targetNode: props.func,
        targetNodeReactFlowKey,
        inputIndex,
        input: newValue,
      })
    );
  };

  return (
    <div>
      <div>
        <span className={styles.unlimitedInputHeaderCell} key="input-name">
          <Caption1>{inputsFromManifest[0].name}</Caption1>
        </span>
        <span className={mergeStyles(styles.unlimitedInputHeaderCell, styles.allowedTypes)} key="input-types">
          <Caption2>{`Accepted types: ${inputsFromManifest[0].allowedTypes}`}</Caption2>
        </span>
      </div>
      <List>
        {Object.entries(functionConnection.inputs[0]).map((input, index) => {
          return (
            <UnboundedInputEntry
              key={input[0]}
              connections={props.connections}
              removeUnboundedInput={removeUnboundedInput}
              functionKey={props.functionKey}
              func={props.func}
              input={input}
              index={index}
            />
          );
        })}
      </List>
      <Button
        icon={<AddRegular className={styles.addIcon} />}
        onClick={() => addUnboundedInputSlot()}
        className={styles.addButton}
        appearance="transparent"
      >
        <Caption1>Add Input</Caption1>
      </Button>
    </div>
  );
};

interface UnboundedInputEntryProps {
  functionKey: string;
  func: FunctionData;
  input: [string, InputConnection];
  index: number;
  connections: ConnectionDictionary;
  removeUnboundedInput: (index: number) => void;
}

const getInputTypeFromNode = (input: InputConnection | undefined) => {
  let inputType = '';
  if (typeof input !== 'string' && input !== undefined) {
    if (isSchemaNodeExtended(input.node)) {
      inputType = input?.node.type;
    } else {
      inputType = input?.node.outputValueType;
    }
  }
  return inputType;
};

const UnboundedInputEntry = (props: UnboundedInputEntryProps) => {
  const inputsFromManifest = props.func.inputs;
  const styles = useStyles();

  const inputType = getInputTypeFromNode(props.input[1]);

  const [, drag] = useDrag(() => ({
    type: 'functionInput',
    item: props.functionKey,
  }));
  return (
    <ListItem key={props.input[0] + props.index}>
      <div ref={drag} className={styles.draggableListItem}>
        <span className={styles.inputDropdown}>
          <InputDropdown
            functionId={props.functionKey}
            currentNode={props.func}
            inputName={getInputName(props.input[1], props.connections)}
            inputValue={getInputValue(props.input[1])}
            inputIndex={props.index}
            isUnboundedInput={true}
            placeholder={inputsFromManifest[0].placeHolder}
          />
        </span>
        <span className={styles.listButtons}>
          <span className={styles.badgeWrapper}>
            {inputType && (
              <Badge appearance="filled" color="informative">
                {inputType}
              </Badge>
            )}
          </span>
          <Button
            className={styles.listButton}
            appearance="transparent"
            icon={<LinkDismissRegular />}
            onClick={() => props.removeUnboundedInput(props.index)}
          />
          <Button className={styles.listButton} appearance="transparent" icon={<ReOrderRegular />} />
        </span>
      </div>
    </ListItem>
  );
};
