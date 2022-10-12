import { sourcePrefix } from '../../constants/ReactFlowConstants';
import { makeConnection } from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { NodeType } from '../../models/SelectedNode';
import type { SelectedNode } from '../../models/SelectedNode';
import { Dropdown, SelectableOptionMenuItemType, TextField } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react';
import { useDebouncedCallback } from '@react-hookz/web';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

const customValueOptionKey = 'customValue';
const customValueDebounceDelay = 300;

export type InputOptions = {
  [key: string]: {
    nodeKey: string;
    nodeName: string;
    isFunctionNode?: boolean;
  }[];
};

export interface InputOptionData {
  isFunction: boolean;
}

export interface InputDropdownProps {
  currentNode: SelectedNode;
  typeMatchedOptions?: IDropdownOption<InputOptionData>[];
  inputValue?: string; // undefined, Node ID, or custom value (string)
  inputIndex: number;
  dropdownStyle?: React.CSSProperties;
  label?: string;
  placeholder?: string;
}

export const InputDropdown = (props: InputDropdownProps) => {
  const { currentNode, typeMatchedOptions, inputValue, inputIndex, dropdownStyle, label, placeholder } = props;
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();

  const sourceSchemaDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedSourceSchema);
  const functionNodeDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentFunctionNodes);
  const targetSchemaDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedTargetSchema);

  const [isCustomValue, setIsCustomValue] = useState(false);

  const customValueOptionLoc = intl.formatMessage({
    defaultMessage: 'Enter custom value',
    description: 'Label for dropdown option to enter custom value',
  });

  const onRenderOption = (item?: IDropdownOption) => {
    switch (item?.key) {
      case customValueOptionKey:
        return <span style={{ color: 'rgb(0, 120, 212)' }}>{item?.text}</span>;
      default:
        return <span>{item?.text}</span>;
    }
  };

  const onSelectOption = (option?: IDropdownOption<InputOptionData>) => {
    if (!option) {
      return;
    }

    // Don't do anything if same value
    if (option.key === inputValue) {
      return;
    }

    if (option.key === customValueOptionKey) {
      // NOTE: useEffect below will handle setting isCustomValue
      // TODO: update connection input value to be ''
    } else {
      // Any other selected option will be a node
      validateAndCreateConnection(option);
    }
  };

  const validateAndCreateConnection = (option: IDropdownOption<InputOptionData>) => {
    if (!option.data) {
      console.error('InputDropdown called to create connection with node without necessary data');
      return;
    }

    console.log(inputIndex);

    // If Function node, ensure that new connection won't create loop/circular-logic
    if (currentNode.type === NodeType.Function) {
      // TODO
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

  const onChangeCustomValue = useDebouncedCallback(
    (newValue?: string) => {
      if (!newValue) {
        return;
      }

      // TODO: update specific connection input's value
    },
    [],
    customValueDebounceDelay
  );

  // TODO: onClearCustomValue -> set that input to undefined (should have some shared functionality w/ validateAnd...)

  useEffect(() => {
    // Check if inputValue is defined, and if it's a node reference or a custom value
    if (inputValue) {
      const srcSchemaNode = sourceSchemaDictionary[`${sourcePrefix}${inputValue}`];
      const functionNode = functionNodeDictionary[inputValue];

      setIsCustomValue(!srcSchemaNode && !functionNode);
    } else {
      setIsCustomValue(false);
    }
  }, [inputValue, sourceSchemaDictionary, functionNodeDictionary]);

  const modifiedOptions = useMemo(() => {
    if (!typeMatchedOptions) {
      return [];
    }

    const newModifiedOptions = [...typeMatchedOptions];

    // Divider
    newModifiedOptions.push({
      key: 'divider',
      text: '',
      itemType: SelectableOptionMenuItemType.Divider,
    });

    // Custom value option
    newModifiedOptions.push({
      key: customValueOptionKey,
      text: customValueOptionLoc,
    });

    return newModifiedOptions;
  }, [typeMatchedOptions, customValueOptionLoc]);

  return (
    <>
      {!isCustomValue ? (
        <Dropdown
          options={modifiedOptions}
          selectedKey={inputValue}
          onChange={(_e, option) => onSelectOption(option)}
          label={label}
          placeholder={placeholder}
          style={dropdownStyle}
          onRenderOption={onRenderOption}
        />
      ) : (
        <TextField value={inputValue} onChange={(_e, newValue) => onChangeCustomValue(newValue)} label={label} placeholder={placeholder} />
      )}
    </>
  );
};
