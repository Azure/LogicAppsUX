import { Badge, Button, Caption1, Caption2 } from '@fluentui/react-components';
import { LinkDismissRegular, AddRegular } from '@fluentui/react-icons';
import { useDispatch, useSelector } from 'react-redux';
import { UnboundedInput } from '../../../constants/FunctionConstants';
import { createInputSlotForUnboundedInput, setConnectionInput, updateFunctionConnectionInputs } from '../../../core/state/DataMapSlice';
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
import DraggableList from 'react-draggable-list';
import InputListWrapper, { type TemplateItemProps, type CommonProps } from './InputList';
import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';

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
              <Caption2>{input.tooltip ?? input.placeHolder ?? ''}</Caption2>
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
  const intl = useIntl();

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
    }),
    [intl]
  );

  const addUnboundedInputSlot = useCallback(() => {
    dispatch(createInputSlotForUnboundedInput(props.functionKey));
  }, [dispatch, props.functionKey]);

  const onDragMoveEnd = useCallback(
    (newList: readonly TemplateItemProps[], _movedItem: TemplateItemProps, _oldIndex: number, _newIndex: number) => {
      dispatch(
        updateFunctionConnectionInputs({
          functionKey: props.functionKey,
          inputs: newList.map((item) => item.input),
        })
      );
    },
    [dispatch, props.functionKey]
  );

  return (
    <div>
      <div>
        <span className={styles.unlimitedInputHeaderCell} key="input-name">
          <Caption1>{`${inputsFromManifest[0].name}${inputsFromManifest[0].isOptional ? ` (${stringResources.OPTIONAL})` : ''}`}</Caption1>
        </span>
        <span className={mergeStyles(styles.unlimitedInputHeaderCell, styles.allowedTypes)} key="input-types">
          <Caption2>{`${stringResources.ACCEPT_TYPES}${inputsFromManifest[0].allowedTypes}`}</Caption2>
        </span>
      </div>
      <DraggableList<TemplateItemProps, CommonProps, any>
        list={Object.entries(functionConnection.inputs[0]).map((input, index) => ({ input: input[1], index }))}
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
      />
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

export const getInputTypeFromNode = (input: InputConnection | undefined) => {
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
