import { useCallback, useMemo } from 'react';
import type { ConnectionDictionary, InputConnection } from '../../../models/Connection';
import type { TemplateProps } from 'react-draggable-list';
import type { FunctionData, FunctionInput } from '../../../models';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../../core/state/Store';
import { InputDropdown, type InputOptionProps } from '../inputDropdown/InputDropdown';
import { getInputTypeFromNode, validateAndCreateConnectionInput } from './inputTab';
import { deleteConnectionFromFunctionMenu, setConnectionInput } from '../../../core/state/DataMapSlice';
import { getInputName, getInputValue } from '../../../utils/Function.Utils';
import { useStyles } from './styles';
import { ListItem } from '@fluentui/react-list-preview';
import { Badge, Button } from '@fluentui/react-components';
import { DeleteRegular, ReOrderRegular } from '@fluentui/react-icons';
import type { SchemaType } from '@microsoft/logic-apps-shared';
import * as React from 'react';

export type CommonProps = {
  functionKey: string;
  data: FunctionData;
  inputsFromManifest: FunctionInput[];
  connections: ConnectionDictionary;
  schemaType: SchemaType;
  draggable: boolean;
  updateListItems: (index: number, item?: TemplateItemProps) => void;
};

export type TemplateItemProps = { input: InputConnection; index: number };
type InputListProps = TemplateProps<TemplateItemProps, CommonProps> & {};
type CustomListItemProps = {
  name?: string;
  value?: string;
  dragHandleProps?: object;
  type?: string;
  draggable?: boolean;
  remove: () => void;
  index: number;
  customValueAllowed?: boolean;
  schemaType: SchemaType;
  validateAndCreateConnection: (optionValue: string | undefined, option: InputOptionProps | undefined) => void;
  functionData: FunctionData;
  functionKey: string;
  key: string;
};

export const InputList = (props: InputListProps) => {
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);
  const sourceSchemaDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.flattenedSourceSchema);
  const functionNodeDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.functionNodes);
  const dispatch = useDispatch();
  const {
    item: { input, index },
    commonProps,
    dragHandleProps,
  } = props;
  const { functionKey, data, inputsFromManifest, connections, schemaType, updateListItems } = commonProps;

  const inputName = useMemo(() => getInputName(input, connections), [connections, input]);
  const inputValue = useMemo(() => getInputValue(input), [input]);
  const inputType = useMemo(() => getInputTypeFromNode(input), [input]);
  const removeUnboundedInput = useCallback(() => {
    const targetNodeReactFlowKey = functionKey;
    updateListItems(index);
    dispatch(
      deleteConnectionFromFunctionMenu({
        targetId: targetNodeReactFlowKey,
        inputIndex: index,
      })
    );
  }, [dispatch, functionKey, index, updateListItems]);

  const updateInput = useCallback(
    (newValue: InputConnection) => {
      const targetNodeReactFlowKey = functionKey;
      updateListItems(index, { input: newValue, index });
      dispatch(
        setConnectionInput({
          targetNode: data,
          targetNodeReactFlowKey,
          inputIndex: index,
          input: newValue,
        })
      );
    },
    [data, dispatch, functionKey, index, updateListItems]
  );

  const validateAndCreateConnection = useCallback(
    (optionValue: string | undefined, option: InputOptionProps | undefined) => {
      if (optionValue) {
        const input = validateAndCreateConnectionInput(
          optionValue,
          option,
          connectionDictionary,
          data,
          functionNodeDictionary,
          sourceSchemaDictionary
        );
        if (input) {
          updateInput(input);
        }
      }
    },
    [connectionDictionary, data, functionNodeDictionary, sourceSchemaDictionary, updateInput]
  );

  return (
    <CustomListItem
      name={inputName}
      value={inputValue}
      remove={removeUnboundedInput}
      index={index}
      customValueAllowed={inputsFromManifest[0].allowCustomInput}
      schemaType={schemaType}
      type={inputType}
      validateAndCreateConnection={validateAndCreateConnection}
      functionData={data}
      functionKey={functionKey}
      key={`input-${inputName}`}
      draggable={commonProps.draggable}
      dragHandleProps={dragHandleProps}
    />
  );
};

export const CustomListItem = (props: CustomListItemProps) => {
  const styles = useStyles();
  const {
    name,
    validateAndCreateConnection,
    customValueAllowed,
    index,
    functionKey,
    functionData,
    schemaType,
    value,
    type,
    remove,
    draggable,
    dragHandleProps,
  } = props;

  return (
    <ListItem key={`input-${name}`} className={styles.draggableListItem}>
      <div className={styles.draggableListContainer}>
        <span className={styles.formControl}>
          <InputDropdown
            inputAllowsCustomValues={customValueAllowed}
            index={index}
            functionId={functionKey}
            currentNode={functionData}
            schemaListType={schemaType}
            inputName={name}
            inputValue={value}
            validateAndCreateConnection={validateAndCreateConnection}
          />
        </span>
        {type && (
          <Badge appearance="filled" color="informative">
            {type}
          </Badge>
        )}
        <span>
          <Button className={styles.listButton} appearance="transparent" icon={<DeleteRegular />} onClick={remove} />
          {draggable && dragHandleProps && (
            <Button className={styles.listButton} appearance="transparent" icon={<ReOrderRegular />} {...dragHandleProps} />
          )}
        </span>
      </div>
    </ListItem>
  );
};

export default class InputListWrapper extends React.Component<InputListProps, {}> {
  render() {
    return <InputList {...this.props} />;
  }
}
