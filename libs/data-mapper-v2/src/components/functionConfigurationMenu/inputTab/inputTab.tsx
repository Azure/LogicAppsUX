import { Badge, Button, Caption1, Text } from '@fluentui/react-components';
import { AddRegular, DeleteRegular } from '@fluentui/react-icons';
import { useDispatch, useSelector } from 'react-redux';
import { UnboundedInput } from '../../../constants/FunctionConstants';
import {
  createInputSlotForUnboundedInput,
  deleteConnectionFromFunctionMenu,
  setConnectionInput,
  updateFunctionConnectionInputs,
} from '../../../core/state/DataMapSlice';
import type { RootState } from '../../../core/state/Store';
import type { FunctionData, FunctionDictionary } from '../../../models';
import type { ConnectionDictionary, NodeConnection, CustomValueConnection, InputConnection } from '../../../models/Connection';
import { getInputName, getInputValue } from '../../../utils/Function.Utils';
import type { InputOptionProps } from '../inputDropdown/InputDropdown';
import { InputDropdown } from '../inputDropdown/InputDropdown';
import { isSchemaNodeExtended } from '../../../utils';
import {
  connectionDoesExist,
  createCustomInputConnection,
  createNewEmptyConnection,
  isNodeConnection,
  newConnectionWillHaveCircularLogic,
} from '../../../utils/Connection.Utils';
import { InputFormat, SchemaType, type SchemaNodeDictionary } from '@microsoft/logic-apps-shared';
import DraggableList from 'react-draggable-list';
import InputListWrapper, { type TemplateItemProps, type CommonProps } from './InputList';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { InputCustomInfoLabel } from './inputCustomInfoLabel';
import { useStyles } from './styles';
import { InputTextbox } from './inputTextbox';

export const InputTabContents = (props: {
  func: FunctionData;
  functionKey: string;
}) => {
  const intl = useIntl();
  const resources = useMemo(
    () => ({
      ACCEPTED_TYPES: intl.formatMessage({
        defaultMessage: 'Accepted types: ',
        id: 'ZgyD93',
        description: 'Accepted types',
      }),
      VALUE: intl.formatMessage({
        defaultMessage: 'Value',
        id: 'ES5vsI',
        description: 'Value',
      }),
      OPTIONAL: intl.formatMessage({
        defaultMessage: 'optional',
        id: '6eDY1H',
        description: 'Optional Keyword',
      }),
      ADD_INPUT: intl.formatMessage({
        defaultMessage: 'Add Input',
        id: 'wx/ZQP',
        description: 'Add Input',
      }),
    }),
    [intl]
  );

  const { func, functionKey } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const styles = useStyles();
  const dispatch = useDispatch();
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);
  const sourceSchemaDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.flattenedSourceSchema);
  const functionNodeDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.functionNodes);

  const connections = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);

  const inputsFromManifest = useMemo(() => func.inputs, [func.inputs]);
  const functionConnection = useMemo(() => connections[functionKey], [connections, functionKey]);

  const [listItems, setListItems] = useState<TemplateItemProps[]>(
    Object.entries(functionConnection.inputs).map(
      (input, index) =>
        ({
          input: input[1],
          index,
        }) as TemplateItemProps
    )
  );

  const addUnboundedInputSlot = useCallback(() => {
    setListItems((prev) => [...prev, { input: createNewEmptyConnection(), index: prev.length }]);
    dispatch(createInputSlotForUnboundedInput(functionKey));
  }, [dispatch, functionKey]);

  const onDragMoveEnd = useCallback(
    (newList: readonly TemplateItemProps[], _movedItem: TemplateItemProps, _oldIndex: number, _newIndex: number) => {
      const updatedList = [...newList];
      setListItems(updatedList);
      dispatch(
        updateFunctionConnectionInputs({
          functionKey: functionKey,
          inputs: updatedList.map((item) => item.input),
        })
      );
    },
    [dispatch, functionKey]
  );

  const update = useCallback(
    (index: number, item?: TemplateItemProps) => {
      if (item) {
        if (listItems.length >= index) {
          const updatedList = [...listItems];
          updatedList[index] = item;
          setListItems(updatedList);
        } else {
          setListItems([...listItems, { input: item.input, index: listItems.length }]);
        }
      } else {
        setListItems((prev) => prev.filter((item) => item.index !== index));
      }
    },
    [listItems, setListItems]
  );

  return (
    <div>
      {func.maxNumberOfInputs !== UnboundedInput ? (
        props.func.inputs.map((input, index) => {
          const inputConnection = functionConnection && functionConnection.inputs[index] ? functionConnection.inputs[index] : undefined;

          const inputType = getInputTypeFromNode(inputConnection);

          const updateInput = (newValue: InputConnection) => {
            const targetNodeReactFlowKey = functionKey;
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
              deleteConnectionFromFunctionMenu({
                inputIndex,
                targetId: targetNodeReactFlowKey,
              })
            );
          };

          let inputJSX: JSX.Element;
          switch (input.inputEntryType) {
            case InputFormat.TextBox: {
              inputJSX = (
                <InputTextbox
                  input={input}
                  loadedInputValue={getInputValue(inputConnection)}
                  validateAndCreateConnection={validateAndCreateConnection}
                ></InputTextbox>
              );
              break;
            }
            // case InputFormat.FilePicker: {

            // }
            default:
              inputJSX = (
                <div className={styles.formControlWrapper}>
                  <span className={styles.formControl}>
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
                  {inputType && (
                    <Badge appearance="filled" color="informative">
                      {inputType}
                    </Badge>
                  )}
                  <Button
                    className={styles.controlButton}
                    appearance="transparent"
                    icon={<DeleteRegular />}
                    onClick={() => removeConnection(index)}
                  />
                </div>
              );
          }

          return (
            <div className={styles.row} key={index}>
              <div className={styles.header}>
                <div className={styles.titleContainer}>
                  <div>
                    <Caption1 className={styles.titleText}>
                      {input.name ?? resources.VALUE}
                      <Text className={styles.titleRequiredLabelText}>{input.isOptional ? '' : '*'}</Text>
                    </Caption1>
                    <InputCustomInfoLabel />
                  </div>
                  <Text className={styles.titleText}>
                    <span className={styles.titleLabelText}>{resources.ACCEPTED_TYPES}</span>
                    {input.allowedTypes}
                  </Text>
                </div>
                <div className={styles.descriptionContainer}>
                  <Text className={styles.descriptionText}>{input.tooltip ?? input.placeHolder ?? ''}</Text>
                </div>
              </div>
              <div className={styles.body}>{inputJSX}</div>
            </div>
          );
        })
      ) : (
        <div className={styles.row}>
          <div className={styles.header}>
            <div className={styles.titleContainer}>
              <div>
                <Caption1 className={styles.titleText}>
                  {inputsFromManifest[0].name ?? resources.VALUE}
                  <Text className={styles.titleRequiredLabelText}>{inputsFromManifest[0].isOptional ? '' : '*'}</Text>
                </Caption1>
                <InputCustomInfoLabel />
              </div>
              <Text className={styles.titleText}>
                <span className={styles.titleLabelText}>{resources.ACCEPTED_TYPES}</span>
                {inputsFromManifest[0].allowedTypes}
              </Text>
            </div>
            <div className={styles.descriptionContainer}>
              <Text className={styles.descriptionText}>{inputsFromManifest[0].tooltip ?? inputsFromManifest[0].placeHolder ?? ''}</Text>
            </div>
          </div>
          <div className={styles.body} ref={containerRef}>
            <DraggableList<TemplateItemProps, CommonProps, any>
              list={listItems}
              commonProps={{
                functionKey: props.functionKey,
                data: props.func,
                inputsFromManifest,
                connections: connections,
                schemaType: SchemaType.Source,
                draggable: true,
                updateListItems: update,
              }}
              onMoveEnd={onDragMoveEnd}
              itemKey={'index'}
              template={InputListWrapper}
            />
            <div className={styles.formControlDescription}>
              <Button
                icon={<AddRegular className={styles.addIcon} />}
                onClick={() => addUnboundedInputSlot()}
                className={styles.addButton}
                appearance="subtle"
              >
                <Caption1>{resources.ADD_INPUT}</Caption1>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const getInputTypeFromNode = (input: InputConnection | undefined) => {
  let inputType = '';
  if (connectionDoesExist(input) && isNodeConnection(input)) {
    if (isSchemaNodeExtended(input.node)) {
      inputType = input?.node.type;
    } else {
      inputType = input?.node.outputValueType;
    }
  }
  return inputType;
};

export const validateAndCreateConnectionInput = (
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
        return;
      }

      // Create connection
      const source = isSelectedInputFunction ? functionNodeDictionary[selectedInputKey] : sourceSchemaDictionary[selectedInputKey];
      const srcConUnit: NodeConnection = {
        node: source,
        reactFlowKey: selectedInputKey,
        isCustom: false,
        isDefined: true,
      };

      return srcConUnit;
    }
    // Create custom value connection
    const srcConUnit: CustomValueConnection = createCustomInputConnection(optionValue);

    return srcConUnit;
  }
  return;
};
