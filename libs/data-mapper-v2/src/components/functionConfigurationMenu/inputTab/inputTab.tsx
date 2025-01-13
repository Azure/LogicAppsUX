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
  isNodeConnection,
  newConnectionWillHaveCircularLogic,
} from '../../../utils/Connection.Utils';
import { SchemaType, type SchemaNodeDictionary } from '@microsoft/logic-apps-shared';
import { CustomListItem } from './InputList';
import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { InputCustomInfoLabel } from './inputCustomInfoLabel';
import { useStyles } from './styles';
import ReactDragListView from 'react-drag-listview';

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
    }),
    [intl]
  );
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
      const inputConnection = functionConnection && functionConnection.inputs[index] ? functionConnection.inputs[index] : undefined;

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
          deleteConnectionFromFunctionMenu({
            inputIndex,
            targetId: targetNodeReactFlowKey,
          })
        );
      };

      return (
        <div className={styles.row} key={index}>
          <div className={styles.header}>
            <div className={styles.titleContainer}>
              <div>
                <Caption1 className={styles.titleText}>
                  {input.name}
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
          <div className={styles.body}>
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
  const styles = useStyles();
  const dispatch = useDispatch();
  const intl = useIntl();
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);
  const sourceSchemaDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.flattenedSourceSchema);
  const functionNodeDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.functionNodes);
  const { func, connections, functionKey } = props;
  const inputsFromManifest = useMemo(() => func.inputs, [func.inputs]);
  const functionConnection = useMemo(() => props.connections[props.functionKey], [props.connections, props.functionKey]);

  const stringResources = useMemo(
    () => ({
      ACCEPT_TYPES: intl.formatMessage({
        defaultMessage: 'Accepted types: ',
        id: 'ZgyD93',
        description: 'Accepted types',
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

  const addUnboundedInputSlot = useCallback(() => {
    dispatch(createInputSlotForUnboundedInput(functionKey));
  }, [dispatch, functionKey]);

  const removeUnboundedInput = useCallback(
    (index: number) => {
      const targetNodeReactFlowKey = functionKey;
      dispatch(
        deleteConnectionFromFunctionMenu({
          targetId: targetNodeReactFlowKey,
          inputIndex: index,
        })
      );
    },
    [dispatch, functionKey]
  );

  const updateInput = useCallback(
    (newValue: InputConnection, index: number) => {
      const targetNodeReactFlowKey = functionKey;
      dispatch(
        setConnectionInput({
          targetNode: func,
          targetNodeReactFlowKey,
          inputIndex: index,
          input: newValue,
        })
      );
    },
    [func, dispatch, functionKey]
  );

  const validateAndCreateConnection = useCallback(
    (optionValue: string | undefined, option: InputOptionProps | undefined, index: number) => {
      if (optionValue) {
        const input = validateAndCreateConnectionInput(
          optionValue,
          option,
          connectionDictionary,
          func,
          functionNodeDictionary,
          sourceSchemaDictionary
        );
        if (input) {
          updateInput(input, index);
        }
      }
    },
    [connectionDictionary, func, functionNodeDictionary, sourceSchemaDictionary, updateInput]
  );

  const onDragEnd = useCallback(
    (fromIndex: number, toIndex: number) => {
      const newInputList = [...(functionConnection.inputs ?? [])];
      const item = newInputList.splice(fromIndex, 1)[0];
      newInputList.splice(toIndex, 0, item);
      dispatch(
        updateFunctionConnectionInputs({
          functionKey: functionKey,
          inputs: newInputList,
        })
      );
    },
    [dispatch, functionConnection.inputs, functionKey]
  );

  return (
    <div className={styles.row}>
      <div className={styles.header}>
        <div className={styles.titleContainer}>
          <div>
            <Caption1 className={styles.titleText}>
              {inputsFromManifest[0].name}
              <Text className={styles.titleRequiredLabelText}>{inputsFromManifest[0].isOptional ? '' : '*'}</Text>
            </Caption1>
            <InputCustomInfoLabel />
          </div>
          <Text className={styles.titleText}>
            <span className={styles.titleLabelText}>{stringResources.ACCEPT_TYPES}</span>
            {inputsFromManifest[0].allowedTypes}
          </Text>
        </div>
        <div className={styles.descriptionContainer}>
          <Text className={styles.descriptionText}>{inputsFromManifest[0].tooltip ?? inputsFromManifest[0].placeHolder ?? ''}</Text>
        </div>
      </div>
      <div className={styles.body}>
        {/* <DraggableList<TemplateItemProps, CommonProps, any>
          list={Object.entries(functionConnection.inputs).map((input, index) => ({
            input: input[1],
            index,
          }))}
          commonProps={{
            functionKey: props.functionKey,
            data: props.func,
            inputsFromManifest,
            connections: props.connections,
            schemaType: SchemaType.Source,
            draggable: true,
          }}
          onMoveEnd={onDragMoveEnd}
          itemKey={'index'}
          template={InputListWrapper}
        /> */}
        <ReactDragListView nodeSelector={'#function-input-row'} handleSelector={'#function-input-row-drag'} onDragEnd={onDragEnd}>
          {Object.entries(functionConnection.inputs).map((input, index) => (
            <CustomListItem
              name={getInputName(input[1], connections)}
              value={getInputValue(input[1])}
              remove={() => {
                removeUnboundedInput(index);
              }}
              index={index}
              customValueAllowed={inputsFromManifest[0].allowCustomInput}
              schemaType={SchemaType.Source}
              type={getInputTypeFromNode(input[1])}
              validateAndCreateConnection={(optionValue: string | undefined, option: InputOptionProps | undefined) => {
                validateAndCreateConnection(optionValue, option, index);
              }}
              functionData={func}
              functionKey={functionKey}
              key={`input-${getInputName(input[1], connections)}`}
              draggable={true}
            />
          ))}
        </ReactDragListView>
        <div className={styles.formControlDescription}>
          <Button
            icon={<AddRegular className={styles.addIcon} />}
            onClick={() => addUnboundedInputSlot()}
            className={styles.addButton}
            appearance="subtle"
          >
            <Caption1>{stringResources.ADD_INPUT}</Caption1>
          </Button>
        </div>
      </div>
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
