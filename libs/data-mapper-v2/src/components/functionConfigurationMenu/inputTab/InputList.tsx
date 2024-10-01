import { useCallback, useMemo } from 'react';
import type { ConnectionDictionary, InputConnection } from '../../../models/Connection';
import type { TemplateProps } from 'react-draggable-list';
import type { FunctionData, FunctionInput } from '../../../models';
import { useDispatch } from 'react-redux';
import { InputDropdown, type InputOptionProps } from '../inputDropdown/InputDropdown';
import { getInputTypeFromNode, validateAndCreateConnectionInput } from './inputTab';
import { setConnectionInput } from '../../../core/state/DataMapSlice';
import { getInputName, getInputValue } from '../../../utils/Function.Utils';
import { useStyles } from './styles';
import { ListItem } from '@fluentui/react-list-preview';
import { Badge, Button } from '@fluentui/react-components';
import { LinkDismissRegular, ReOrderRegular } from '@fluentui/react-icons';
import type { SchemaType } from '@microsoft/logic-apps-shared';
import * as React from 'react';
import useReduxStore from '../../useReduxStore';

export type CommonProps = {
  functionKey: string;
  data: FunctionData;
  inputsFromManifest: FunctionInput[];
  connections: ConnectionDictionary;
  schemaType: SchemaType;
  draggable: boolean;
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

const InputList = (props: InputListProps) => {
  const {
    dataMapConnections: connectionDictionary,
    flattenedSourceSchema: sourceSchemaDictionary,
    functionNodes: functionNodeDictionary,
  } = useReduxStore();
  const dispatch = useDispatch();
  const {
    item: { input, index },
    commonProps,
    dragHandleProps,
  } = props;
  const { functionKey, data, inputsFromManifest, connections, schemaType } = commonProps;

  const inputName = useMemo(() => getInputName(input, connections), [connections, input]);
  const inputValue = useMemo(() => getInputValue(input), [input]);
  const inputType = useMemo(() => getInputTypeFromNode(input), [input]);
  const removeUnboundedInput = useCallback(() => {
    const targetNodeReactFlowKey = functionKey;
    dispatch(
      setConnectionInput({
        targetNode: data,
        targetNodeReactFlowKey,
        inputIndex: index,
        input: null,
      })
    );
  }, [data, dispatch, functionKey, index]);

  const updateInput = useCallback(
    (newValue: InputConnection) => {
      const targetNodeReactFlowKey = functionKey;
      dispatch(
        setConnectionInput({
          targetNode: data,
          targetNodeReactFlowKey,
          inputIndex: index,
          input: newValue,
        })
      );
    },
    [data, dispatch, functionKey, index]
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
    <ListItem key={`input-${name}`}>
      <div className={styles.draggableListItem}>
        <span className={styles.inputDropdown}>
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
        <span className={styles.listButtons}>
          <span className={styles.badgeWrapper}>
            {type && (
              <Badge appearance="filled" color="informative">
                {type}
              </Badge>
            )}
          </span>
          <Button className={styles.listButton} appearance="transparent" icon={<LinkDismissRegular />} onClick={remove} />
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
