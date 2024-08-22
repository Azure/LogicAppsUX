import { Badge, Button, Caption1, Caption2 } from '@fluentui/react-components';
import { LinkDismissRegular, ReOrderRegular, AddRegular } from '@fluentui/react-icons';
import { List, ListItem } from '@fluentui/react-list-preview';
import { useDrag } from 'react-dnd';
import { useDispatch, useSelector } from 'react-redux';
import { UnboundedInput } from '../../../constants/FunctionConstants';
import { createInputSlotForUnboundedInput, setConnectionInput } from '../../../core/state/DataMapSlice';
import type { RootState } from '../../../core/state/Store';
import type { FunctionData, FunctionDictionary } from '../../../models';
import type { ConnectionDictionary, ConnectionUnit, InputConnection } from '../../../models/Connection';
import { getInputName, getInputValue } from '../../../utils/Function.Utils';
import type { InputOptionProps } from '../inputDropdown/InputDropdown';
import { InputDropdown } from '../inputDropdown/InputDropdown';
import { useStyles } from './styles';
import { mergeStyles } from '@fluentui/react';
import { isSchemaNodeExtended } from '../../../utils';
import { newConnectionWillHaveCircularLogic } from '../../../utils/Connection.Utils';
import { SchemaType, type SchemaNodeDictionary } from '@microsoft/logic-apps-shared';

export const InputTabContents = (props: {
  func: FunctionData;
  functionKey: string;
}) => {
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);
  const sourceSchemaDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.flattenedSourceSchema);
  const functionNodeDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.functionNodes);
  const styles = useStyles();
  const dispatch = useDispatch();

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

      const updateInput = (newValue: InputConnection) => {
        const targetNodeReactFlowKey = props.functionKey;
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
          const input = validateAndCreateConnectionInput(
            optionValue,
            option,
            connectionDictionary,
            props.func,
            functionNodeDictionary,
            sourceSchemaDictionary
          );
          if (input) {
            updateInput(input);
          }
        }
      };

      const removeConnection = (inputIndex: number) => {
        const targetNodeReactFlowKey = props.functionKey;
        dispatch(
          setConnectionInput({
            targetNode: props.func,
            targetNodeReactFlowKey,
            inputIndex,
            input: undefined,
          })
        );
      };

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
                index={index}
                schemaListType={SchemaType.Source}
                functionId={props.functionKey}
                currentNode={props.func}
                inputName={getInputName(inputConnection, connections)}
                inputValue={getInputValue(inputConnection)}
                validateAndCreateConnection={validateAndCreateConnection}
              />
            </span>
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
              onClick={() => removeConnection(index)}
            />
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
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);
  const sourceSchemaDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.flattenedSourceSchema);
  const functionNodeDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.functionNodes);

  const addUnboundedInputSlot = () => {
    dispatch(createInputSlotForUnboundedInput(props.functionKey));
  };

  const functionConnection = props.connections[props.functionKey];

  const removeConnection = (inputIndex: number, newValue: InputConnection | null) => {
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
          const updateInput = (newValue: InputConnection) => {
            const targetNodeReactFlowKey = props.functionKey;
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
              const input = validateAndCreateConnectionInput(
                optionValue,
                option,
                connectionDictionary,
                props.func,
                functionNodeDictionary,
                sourceSchemaDictionary
              );
              if (input) {
                updateInput(input);
              }
            }
          };
          const inputName = getInputName(input[1], props.connections);
          const inputValue = getInputValue(input[1]);
          const inputType = getInputTypeFromNode(input[1]);
          const removeUnboundedInput = () => {
            removeConnection(index, null);
          };
          return (
            <UnboundedDropdownListItem
              index={index}
              key={input[0]}
              schemaListType={SchemaType.Source}
              removeItem={removeUnboundedInput}
              functionKey={props.functionKey}
              func={props.func}
              inputName={inputName}
              inputType={inputType}
              inputValue={inputValue}
              draggable={true}
              validateAndCreateConnection={validateAndCreateConnection}
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

// const getTypeValidationMessge = (intl: IntlShape,currentNode: FunctionData, inputValue: string | undefined, customValue: string | undefined) => {

//     const customValueSchemaNodeTypeMismatchLoc = intl.formatMessage({
//       defaultMessage: `Warning: custom value does not match the schema node's type`,
//       id: 'sRpETS',
//       description: 'Warning message for when custom value does not match schema node type',
//     });

//     const customValueAllowedTypesMismatchLoc = intl.formatMessage({
//       defaultMessage: 'Warning: custom value does not match one of the allowed types for this input',
//       id: 'BCgiRh',
//       description: `Warning message for when custom value does not match one of the function node input's allowed types`,
//     });

//     const nodeTypeSchemaNodeTypeMismatchLoc = intl.formatMessage({
//       defaultMessage: `Warning: input node type does not match the schema node's type`,
//       id: '+0H8Or',
//       description: 'Warning message for when input node type does not match schema node type',
//     });

//     const nodeTypeAllowedTypesMismatchLoc = intl.formatMessage({
//       defaultMessage: 'Warning: input node type does not match one of the allowed types for this input.',
//       id: 'yNtBUV',
//       description: `Warning message for when input node type does not match one of the function node input's allowed types`,
//     });

//     if (inputValue) {
//       if (customValue) {
//         // Schema node (single type)
//         if (isSchemaNodeExtended(currentNode)) {
//           if (!isValidCustomValueByType(inputValue, currentNode.type)) {
//             return customValueSchemaNodeTypeMismatchLoc;
//           }
//         } else {
//           // Function nodes (>= 1 allowed types)
//           const matchedAnyAllowedType = currentNode.inputs[isUnboundedInput ? 0 : inputIndex].allowedTypes.some((type) =>
//             isValidCustomValueByType(inputValue, type)
//           );

//           if (!matchedAnyAllowedType) {
//             return customValueAllowedTypesMismatchLoc;
//           }
//         }
//       } else {
//         const selectedOption = matchingOptions.find((option) => option.value === selectedOptions[0]);

//         if (selectedOption) {
//           // if (isSchemaNodeExtended(currentNode)) { danielle add back in if we use again for target schema node
//           //   if (!isValidConnectionByType(selectedOption.type, currentNode.type)) {
//           //     return nodeTypeSchemaNodeTypeMismatchLoc;
//           //   }
//           // } else {
//             let someTypesMatched = false;
//             let possibleConversionFunctions = '';
//             currentNode.inputs[isUnboundedInput ? 0 : inputIndex].allowedTypes.forEach((type) => {
//               const conversion = functions.find((func) => func.category === FunctionCategory.Conversion && func.outputValueType === type);
//               if (conversion) {
//                 possibleConversionFunctions += `${conversion?.displayName}, `;
//               }
//               if (isValidConnectionByType(selectedOption.type, type)) {
//                 someTypesMatched = true;
//               }
//             });
//             possibleConversionFunctions = possibleConversionFunctions.substring(0, possibleConversionFunctions.length - 2);

//             if (!someTypesMatched) {
//               let conversionMessage = '';
//               if (possibleConversionFunctions !== '') {
//                 conversionMessage = intl.formatMessage(
//                   {
//                     defaultMessage: ' Try using a Conversion function such as: {conversionFunctions}',
//                     id: 'ur3P27',
//                     description: 'Suggest to the user to try a conversion function instead',
//                   },
//                   {
//                     conversionFunctions: possibleConversionFunctions,
//                   }
//                 );
//               }
//               return `${nodeTypeAllowedTypesMismatchLoc} ${conversionMessage}`;
//             }
//           }
//        // }
//       }
//     }

//     return undefined;
// }

const validateAndCreateConnectionInput = (
  optionValue: string | undefined,
  option: InputOptionProps | undefined,
  connectionDictionary: ConnectionDictionary,
  func: FunctionData,
  functionNodeDictionary: FunctionDictionary,
  sourceSchemaDictionary: SchemaNodeDictionary
) => {
  if (optionValue) {
    if (option) {
      const selectedInputKey = option.value;
      const isSelectedInputFunction = option.isFunction;

      // ensure that new connection won't create loop/circular logic
      if (newConnectionWillHaveCircularLogic(func.key, selectedInputKey, connectionDictionary)) {
        //dispatch(showNotification({ type: NotificationTypes.CircularLogicError, autoHideDurationMs: errorNotificationAutoHideDuration }));
        return;
      }

      // Create connection
      const source = isSelectedInputFunction ? functionNodeDictionary[selectedInputKey] : sourceSchemaDictionary[selectedInputKey];
      const srcConUnit: ConnectionUnit = {
        node: source,
        reactFlowKey: selectedInputKey,
      };

      return srcConUnit;
    }
    // Create custom value connection
    const srcConUnit: InputConnection = optionValue;

    return srcConUnit;
  }
  return;
};

interface UnboundedInputEntryProps {
  functionKey: string;
  func: FunctionData;
  index: number;
  inputName: string | undefined;
  inputValue: string | undefined;
  inputType: string | undefined;
  removeItem: () => void;
  schemaListType: SchemaType;
  draggable: boolean;
  validateAndCreateConnection: (optionValue: string | undefined, option: InputOptionProps | undefined) => void;
}

export const UnboundedDropdownListItem = (props: UnboundedInputEntryProps) => {
  const styles = useStyles();

  const [, drag] = useDrag(() => ({
    type: 'functionInput',
    item: props.functionKey,
  }));
  return (
    <ListItem key={`input-${props.inputName}`}>
      <div ref={props.draggable ? drag : undefined} className={styles.draggableListItem}>
        <span className={styles.inputDropdown}>
          <InputDropdown
            index={props.index}
            functionId={props.functionKey}
            currentNode={props.func}
            schemaListType={props.schemaListType}
            inputName={props.inputName}
            inputValue={props.inputValue}
            validateAndCreateConnection={props.validateAndCreateConnection}
          />
        </span>
        <span className={styles.listButtons}>
          <span className={styles.badgeWrapper}>
            {props.inputType && (
              <Badge appearance="filled" color="informative">
                {props.inputType}
              </Badge>
            )}
          </span>
          <Button className={styles.listButton} appearance="transparent" icon={<LinkDismissRegular />} onClick={() => props.removeItem()} />
          {props.draggable && <Button className={styles.listButton} appearance="transparent" icon={<ReOrderRegular />} />}
        </span>
      </div>
    </ListItem>
  );
};
