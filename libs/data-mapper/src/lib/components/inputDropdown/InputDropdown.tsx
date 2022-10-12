import { sourcePrefix } from '../../constants/ReactFlowConstants';
import { makeConnection } from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { NodeType } from '../../models/SelectedNode';
import type { SelectedNode } from '../../models/SelectedNode';
import { Dropdown } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react';
import { useDispatch, useSelector } from 'react-redux';

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

  const sourceSchemaDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedSourceSchema);
  const functionNodeDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentFunctionNodes);
  const targetSchemaDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedTargetSchema);

  const validateAndCreateConnection = (option?: IDropdownOption<InputOptionData>) => {
    if (!option?.data) {
      return;
    }

    // Don't do anything if same value
    if (option.key === inputValue) {
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

  return (
    <Dropdown
      options={typeMatchedOptions ?? []}
      selectedKey={inputValue}
      onChange={(_e, option) => validateAndCreateConnection(option)}
      label={label}
      placeholder={placeholder}
      style={dropdownStyle}
    />
  );
};
