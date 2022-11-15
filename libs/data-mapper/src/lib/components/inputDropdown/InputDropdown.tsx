import { showNotification, updateConnectionInput } from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import type { SchemaNodeDataType, SchemaNodeExtended } from '../../models';
import { NormalizedDataType } from '../../models';
import type { ConnectionUnit, InputConnection } from '../../models/Connection';
import type { FunctionData } from '../../models/Function';
import { isCustomValue, newConnectionWillHaveCircularLogic } from '../../utils/Connection.Utils';
import { isFunctionData, getFunctionOutputValue, functionInputHasInputs } from '../../utils/Function.Utils';
import { iconForNormalizedDataType, iconForSchemaNodeDataType } from '../../utils/Icon.Utils';
import { addSourceReactFlowPrefix } from '../../utils/ReactFlow.Util';
import { errorNotificationAutoHideDuration, NotificationTypes } from '../notification/Notification';
import { Dropdown, SelectableOptionMenuItemType, Stack, TextField } from '@fluentui/react';
import type { IDropdownOption, IRawStyle } from '@fluentui/react';
import { Button, makeStyles, tokens, Tooltip, typographyStyles } from '@fluentui/react-components';
import { Dismiss20Regular } from '@fluentui/react-icons';
import { useDebouncedCallback } from '@react-hookz/web';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

const customValueOptionKey = 'customValue';
const customValueDebounceDelay = 300;

interface SharedOptionData {
  isFunction: boolean;
  schemaNodeDataType?: SchemaNodeDataType; // Will be preferentially used over normalized type if present (should just be source schema nodes)
  normalizedDataType: NormalizedDataType;
}

interface InputOption extends SharedOptionData {
  nodeKey: string;
  nodeName: string;
}

type InputOptionDictionary = {
  [key: string]: InputOption[];
};

const useStyles = makeStyles({
  inputStyles: {
    width: '100%',
  },
  inputLabel: {
    ...typographyStyles.body1,
    color: tokens.colorNeutralForeground1,
  },
});

export interface InputDropdownProps {
  currentNode: SchemaNodeExtended | FunctionData;
  inputValue?: string; // undefined, Node ID, or custom value (string)
  inputIndex: number;
  inputStyles?: IRawStyle & React.CSSProperties;
  label?: string;
  placeholder?: string;
  isUnboundedInput?: boolean;
}

export const InputDropdown = (props: InputDropdownProps) => {
  const { currentNode, inputValue, inputIndex, inputStyles, label, placeholder, isUnboundedInput } = props;
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const styles = useStyles();

  const currentSourceSchemaNodes = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentSourceSchemaNodes);
  const sourceSchemaDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedSourceSchema);
  const functionNodeDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentFunctionNodes);
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);
  const selectedItemKey = useSelector((state: RootState) => state.dataMap.curDataMapOperation.selectedItemKey);

  const [inputIsCustomValue, setInputIsCustomValue] = useState(false);
  const [customValue, setCustomValue] = useState<string>('');

  const customValueOptionLoc = intl.formatMessage({
    defaultMessage: 'Enter custom value',
    description: 'Label for dropdown option to enter custom value',
  });

  const clearCustomValueLoc = intl.formatMessage({
    defaultMessage: 'Clear custom value',
    description: 'Tooltip content for clearing custom value',
  });

  const onRenderTitle = (items?: IDropdownOption<SharedOptionData>[]) => {
    if (!items || items.length === 0 || !items[0].data) {
      return null;
    }

    if (items.length > 1) {
      console.error('InputDropdown attempted to render more than one selected item');
      return null;
    }

    const TypeIcon = items[0].data.schemaNodeDataType
      ? iconForSchemaNodeDataType(items[0].data.schemaNodeDataType, 16, false)
      : iconForNormalizedDataType(items[0].data.normalizedDataType, 16, false);

    return (
      <Stack horizontal verticalAlign="center">
        <TypeIcon />
        <div style={{ marginLeft: 4 }}>{items[0].text}</div>
      </Stack>
    );
  };

  const onRenderOption = (item?: IDropdownOption<SharedOptionData>) => {
    if (!item) {
      return null;
    }

    if (item.key === customValueOptionKey) {
      return <span style={{ color: 'rgb(0, 120, 212)' }}>{item?.text}</span>;
    } else {
      if (!item.data) {
        return null;
      }

      const TypeIcon = item.data.schemaNodeDataType
        ? iconForSchemaNodeDataType(item.data.schemaNodeDataType, 16, false)
        : iconForNormalizedDataType(item.data.normalizedDataType, 16, false);

      return (
        <Stack horizontal verticalAlign="center">
          <TypeIcon />
          <div style={{ marginLeft: 4 }}>{item.text}</div>
        </Stack>
      );
    }
  };

  const onSelectOption = (option?: IDropdownOption<SharedOptionData>) => {
    // Don't do anything if same value
    if (!option || option.key === inputValue) {
      return;
    }

    if (option.key === customValueOptionKey) {
      // NOTE: inputIsCustomValue flag will be confirmed/re-set in useEffect
      // (must be set here too to not flash weird dropdown state)
      setInputIsCustomValue(true);
      updateInput('');
    } else {
      // Any other selected option will be a node
      validateAndCreateConnection(option);
    }
  };

  const validateAndCreateConnection = (option: IDropdownOption<SharedOptionData>) => {
    if (!option.data) {
      console.error('InputDropdown called to create connection without necessary data');
      return;
    }

    const selectedInputKey = option.key as string;
    const isSelectedInputFunction = option.data.isFunction;

    // If Function node, ensure that new connection won't create loop/circular logic
    if (
      isFunctionData(currentNode) &&
      selectedItemKey &&
      newConnectionWillHaveCircularLogic(selectedItemKey, selectedInputKey, connectionDictionary)
    ) {
      dispatch(showNotification({ type: NotificationTypes.CircularLogicError, autoHideDurationMs: errorNotificationAutoHideDuration }));
      return;
    }

    // Create connection
    const source = isSelectedInputFunction ? functionNodeDictionary[selectedInputKey] : sourceSchemaDictionary[selectedInputKey];
    const srcConUnit: ConnectionUnit = {
      node: source,
      reactFlowKey: selectedInputKey,
    };

    updateInput(srcConUnit);
  };

  const onChangeCustomValue = (newValue?: string) => {
    if (newValue === undefined) {
      return;
    }

    setCustomValue(newValue);
    updateCustomValue(newValue);
  };

  const updateCustomValue = useDebouncedCallback(
    (newValue: string) => {
      updateInput(newValue);
    },
    [],
    customValueDebounceDelay
  );

  const onClearCustomValue = () => {
    setCustomValue('');
    updateInput(undefined);
  };

  const updateInput = (newValue: InputConnection) => {
    if (!selectedItemKey) {
      console.error('PropPane - Function: Attempted to update input with nothing selected on canvas');
      return;
    }

    const targetNodeReactFlowKey = selectedItemKey;
    dispatch(updateConnectionInput({ targetNode: currentNode, targetNodeReactFlowKey, inputIndex, value: newValue, isUnboundedInput }));
  };

  useEffect(() => {
    // Check if inputValue is defined, and if it's a node reference or a custom value
    if (inputValue !== undefined) {
      const srcSchemaNode = sourceSchemaDictionary[inputValue];
      const functionNode = functionNodeDictionary[inputValue];

      setCustomValue(inputValue);
      setInputIsCustomValue(!srcSchemaNode && !functionNode);
    } else {
      setCustomValue('');
      setInputIsCustomValue(false);
    }
  }, [inputValue, sourceSchemaDictionary, functionNodeDictionary]);

  const typeSortedInputOptions = useMemo<InputOptionDictionary>(() => {
    const newPossibleInputOptionsDictionary = {} as InputOptionDictionary;

    // Sort source schema nodes on the canvas by type
    currentSourceSchemaNodes.forEach((srcNode) => {
      if (!newPossibleInputOptionsDictionary[srcNode.normalizedDataType]) {
        newPossibleInputOptionsDictionary[srcNode.normalizedDataType] = [];
      }

      newPossibleInputOptionsDictionary[srcNode.normalizedDataType].push({
        nodeKey: addSourceReactFlowPrefix(srcNode.key),
        nodeName: srcNode.name,
        isFunction: false,
        schemaNodeDataType: srcNode.schemaNodeDataType,
        normalizedDataType: srcNode.normalizedDataType,
      });
    });

    // Sort function nodes on the canvas by type
    Object.entries(functionNodeDictionary).forEach(([key, node]) => {
      if (!newPossibleInputOptionsDictionary[node.outputValueType]) {
        newPossibleInputOptionsDictionary[node.outputValueType] = [];
      }

      // Don't list currentNode as an option
      if (key === selectedItemKey) {
        return;
      }

      // Compile Function's input values (if any)
      let fnInputValues: string[] = [];
      const fnConnection = connectionDictionary[key];
      if (fnConnection) {
        fnInputValues = Object.values(fnConnection.inputs)
          .flat()
          .map((input) => {
            if (!input) {
              return undefined;
            }
            if (isCustomValue(input)) {
              return `"${input}"`;
            }
            if (isFunctionData(input.node)) {
              if (functionInputHasInputs(input.reactFlowKey, connectionDictionary)) {
                return `${input.node.functionName}(...)`;
              } else {
                return `${input.node.functionName}()`;
              }
            }

            // Source schema node
            return input.node.name;
          })
          .filter((value) => !!value) as string[];
      }

      newPossibleInputOptionsDictionary[node.outputValueType].push({
        nodeKey: key,
        nodeName: getFunctionOutputValue(fnInputValues, node.functionName),
        isFunction: true,
        schemaNodeDataType: undefined,
        normalizedDataType: node.outputValueType,
      });
    });

    return newPossibleInputOptionsDictionary;
  }, [currentSourceSchemaNodes, functionNodeDictionary, connectionDictionary, selectedItemKey]);

  // Compile options from the possible type-sorted input options based on the input's type
  const typeMatchedInputOptions = useMemo<IDropdownOption<SharedOptionData>[] | undefined>(() => {
    let newInputOptions: IDropdownOption<SharedOptionData>[] = [];

    const addTypeMatchedOptions = (typeEntryArray: InputOption[]) => {
      newInputOptions = [
        ...newInputOptions,
        ...typeEntryArray.map<IDropdownOption<SharedOptionData>>((possibleOption) => ({
          key: possibleOption.nodeKey,
          text: possibleOption.nodeName,
          data: {
            isFunction: possibleOption.isFunction,
            schemaNodeDataType: possibleOption.schemaNodeDataType,
            normalizedDataType: possibleOption.normalizedDataType,
          },
        })),
      ];
    };

    const addAllOptions = () => {
      Object.values(typeSortedInputOptions).forEach((typeEntryArray) => {
        addTypeMatchedOptions(typeEntryArray);
      });
    };

    const handleAnyOrSpecificType = (type: NormalizedDataType) => {
      if (type === NormalizedDataType.Any) {
        addAllOptions();
      } else if (typeSortedInputOptions[type]) {
        // If not type Any, check if any possible input options were found/compiled for provided type
        addTypeMatchedOptions(typeSortedInputOptions[type]);

        // Also add any options whose output type is Any
        addTypeMatchedOptions(typeSortedInputOptions[NormalizedDataType.Any]);
      }
    };

    if (isFunctionData(currentNode)) {
      currentNode.inputs[isUnboundedInput ? 0 : inputIndex].allowedTypes.forEach(handleAnyOrSpecificType);
    } else {
      handleAnyOrSpecificType(currentNode.normalizedDataType);
    }

    return newInputOptions;
  }, [isUnboundedInput, inputIndex, typeSortedInputOptions, currentNode]);

  const modifiedDropdownOptions = useMemo(() => {
    const newModifiedOptions = typeMatchedInputOptions ? [...typeMatchedInputOptions] : [];

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
  }, [typeMatchedInputOptions, customValueOptionLoc]);

  return (
    <>
      {!inputIsCustomValue ? (
        <Dropdown
          options={modifiedDropdownOptions}
          selectedKey={inputValue}
          onChange={(_e, option) => onSelectOption(option)}
          label={label}
          placeholder={placeholder}
          className={styles.inputStyles}
          styles={{
            root: { ...inputStyles },
            subComponentStyles: {
              label: { root: { ...typographyStyles.body1, color: tokens.colorNeutralForeground1 } },
            },
          }}
          onRenderTitle={onRenderTitle}
          onRenderOption={onRenderOption}
        />
      ) : (
        <div style={{ position: 'relative', ...inputStyles }}>
          <TextField
            value={customValue}
            onChange={(_e, newValue) => onChangeCustomValue(newValue)}
            label={label}
            placeholder={placeholder}
            className={styles.inputStyles}
            styles={{
              root: { ...inputStyles },
              field: { ...typographyStyles.body1, color: tokens.colorNeutralForeground1, backgroundColor: tokens.colorNeutralBackground1 },
              subComponentStyles: {
                label: { root: { ...typographyStyles.body1, color: tokens.colorNeutralForeground1 } },
              },
            }}
          />
          <Tooltip relationship="label" content={clearCustomValueLoc}>
            <Button
              appearance="transparent"
              icon={<Dismiss20Regular />}
              onClick={onClearCustomValue}
              style={{
                boxSizing: 'border-box',
                position: 'absolute',
                top: label ? '76%' : '50%',
                right: 0,
                transform: 'translate(0, -50%)',
              }}
            />
          </Tooltip>
        </div>
      )}
    </>
  );
};
