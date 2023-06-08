import { setConnectionInput, showNotification } from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import type { NormalizedDataType, SchemaNodeExtended, SchemaNodeProperty } from '../../models';
import type { ConnectionUnit, InputConnection } from '../../models/Connection';
import type { FunctionData } from '../../models/Function';
import { directAccessPseudoFunctionKey, indexPseudoFunctionKey } from '../../models/Function';
import {
  isConnectionUnit,
  isCustomValue,
  isValidConnectionByType,
  isValidCustomValueByType,
  newConnectionWillHaveCircularLogic,
} from '../../utils/Connection.Utils';
import { getInputValues } from '../../utils/DataMap.Utils';
import {
  calculateIndexValue,
  formatDirectAccess,
  functionInputHasInputs,
  getFunctionOutputValue,
  isFunctionData,
} from '../../utils/Function.Utils';
import { iconForNormalizedDataType } from '../../utils/Icon.Utils';
import { LogCategory, LogService } from '../../utils/Logging.Utils';
import { addSourceReactFlowPrefix } from '../../utils/ReactFlow.Util';
import { isSchemaNodeExtended } from '../../utils/Schema.Utils';
import { NotificationTypes, errorNotificationAutoHideDuration } from '../notification/Notification';
import type { IDropdownOption, IRawStyle } from '@fluentui/react';
import { Dropdown, SelectableOptionMenuItemType, Stack, TextField } from '@fluentui/react';
import { Button, Tooltip, makeStyles, tokens, typographyStyles } from '@fluentui/react-components';
import { Dismiss20Regular } from '@fluentui/react-icons';
import { useDebouncedCallback } from '@react-hookz/web';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

const customValueOptionKey = 'customValue';
const customValueDebounceDelay = 300;

interface SharedOptionData {
  isFunction: boolean;
  nodeProperties?: SchemaNodeProperty[]; // Should just be source schema nodes
  type: NormalizedDataType;
}

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
  id?: string;
  labelId?: string;
  label?: string;
  placeholder?: string;
  inputAllowsCustomValues?: boolean;
  isUnboundedInput?: boolean;
}

export const InputDropdown = (props: InputDropdownProps) => {
  const {
    currentNode,
    inputValue,
    inputIndex,
    inputStyles,
    label,
    labelId,
    id,
    placeholder,
    inputAllowsCustomValues = true,
    isUnboundedInput,
  } = props;
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const styles = useStyles();

  const currentSourceSchemaNodes = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentSourceSchemaNodes);
  const sourceSchemaDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedSourceSchema);
  const functionNodeDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.functionNodes);
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

  const customValueSchemaNodeTypeMismatchLoc = intl.formatMessage({
    defaultMessage: `Custom value does not match the schema node's type`,
    description: 'Error message for when custom value does not match schema node type',
  });

  const customValueAllowedTypesMismatchLoc = intl.formatMessage({
    defaultMessage: `Custom value does not match one of the allowed types for this input`,
    description: `Error message for when custom value does not match one of the function node input's allowed types`,
  });

  const nodeTypeSchemaNodeTypeMismatchLoc = intl.formatMessage({
    defaultMessage: `The input node type doesn't match the schema node's type.`,
    description: 'Error message for when input node type does not match schema node type',
  });

  const nodeTypeAllowedTypesMismatchLoc = intl.formatMessage({
    defaultMessage: `Input node type does not match one of the allowed types for this input`,
    description: `Error message for when input node type does not match one of the function node input's allowed types`,
  });

  const onRenderTitle = (items?: IDropdownOption<SharedOptionData>[]) => {
    if (!items || items.length === 0 || !items[0].data) {
      return null;
    }

    if (items.length > 1) {
      LogService.error(LogCategory.InputDropDown, 'onRenderTitle', {
        message: 'Attempted to render more than one selected item',
      });

      return null;
    }

    const TypeIcon = iconForNormalizedDataType(items[0].data.type, 16, false, items[0].data.nodeProperties);

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

      const TypeIcon = iconForNormalizedDataType(item.data.type, 16, false, item.data.nodeProperties);

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
      LogService.error(LogCategory.InputDropDown, 'validateAndCreateConnection', {
        message: 'Called to create connection without necessary data',
      });

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
    const source = isSelectedInputFunction
      ? functionNodeDictionary[selectedInputKey].functionData
      : sourceSchemaDictionary[selectedInputKey];
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
      LogService.error(LogCategory.InputDropDown, 'updateInput', {
        message: 'Attempted to update input with nothing selected on canvas',
      });

      return;
    }

    const targetNodeReactFlowKey = selectedItemKey;
    dispatch(
      setConnectionInput({
        targetNode: currentNode,
        targetNodeReactFlowKey,
        inputIndex,
        input: newValue,
      })
    );
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
    // Ignore the inputValue, we are handling that elsewhere
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceSchemaDictionary, functionNodeDictionary]);

  const availableInputOptions = useMemo<IDropdownOption<SharedOptionData>[]>(() => {
    // Add source schema nodes currently on the canvas
    const newAvailableInputOptions: IDropdownOption<SharedOptionData>[] = currentSourceSchemaNodes.map<IDropdownOption<SharedOptionData>>(
      (srcSchemaNode) => ({
        key: addSourceReactFlowPrefix(srcSchemaNode.key),
        text: srcSchemaNode.name,
        data: {
          isFunction: false,
          nodeProperties: srcSchemaNode.nodeProperties,
          type: srcSchemaNode.type,
        },
      })
    );

    // Add function nodes currently on the canvas
    Object.entries(functionNodeDictionary).forEach(([key, node]) => {
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
              return input;
            }

            if (isFunctionData(input.node)) {
              if (input.node.key === indexPseudoFunctionKey) {
                const sourceNode = connectionDictionary[input.reactFlowKey].inputs[0][0];
                return isConnectionUnit(sourceNode) && isSchemaNodeExtended(sourceNode.node) ? calculateIndexValue(sourceNode.node) : '';
              }

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

      const inputs = connectionDictionary[key]?.inputs[0];
      const sourceNode = inputs && inputs[0];
      const nodeData = node.functionData;
      let nodeName: string;
      if (nodeData.key === indexPseudoFunctionKey && isConnectionUnit(sourceNode) && isSchemaNodeExtended(sourceNode.node)) {
        nodeName = calculateIndexValue(sourceNode.node);
      } else if (nodeData.key === directAccessPseudoFunctionKey) {
        const functionValues = getInputValues(connectionDictionary[key], connectionDictionary);
        nodeName =
          functionValues.length === 3
            ? formatDirectAccess(functionValues[0], functionValues[1], functionValues[2])
            : getFunctionOutputValue(fnInputValues, nodeData.functionName);
      } else {
        nodeName = getFunctionOutputValue(fnInputValues, nodeData.functionName);
      }

      newAvailableInputOptions.push({
        key,
        text: nodeName,
        data: {
          isFunction: true,
          type: nodeData.outputValueType,
        },
      });
    });

    return newAvailableInputOptions;
  }, [currentSourceSchemaNodes, functionNodeDictionary, connectionDictionary, selectedItemKey]);

  // Add divider + custom value option if allowed
  const modifiedDropdownOptions = useMemo(() => {
    const newModifiedOptions = availableInputOptions ? [...availableInputOptions] : [];

    if (inputAllowsCustomValues) {
      newModifiedOptions.push({
        key: 'divider',
        text: '',
        itemType: SelectableOptionMenuItemType.Divider,
      });

      newModifiedOptions.push({
        key: customValueOptionKey,
        text: customValueOptionLoc,
      });
    }

    return newModifiedOptions;
  }, [availableInputOptions, customValueOptionLoc, inputAllowsCustomValues]);

  const typeValidationMessage = useMemo<string | undefined>(() => {
    if (inputValue !== undefined) {
      // Custom value validation
      if (inputIsCustomValue) {
        // Schema node (single type)
        if (isSchemaNodeExtended(currentNode)) {
          if (!isValidCustomValueByType(inputValue, currentNode.type)) {
            return customValueSchemaNodeTypeMismatchLoc;
          }
        } else {
          // Function nodes (>= 1 allowed types)
          let someTypeMatched = false;
          currentNode.inputs[isUnboundedInput ? 0 : inputIndex].allowedTypes.forEach((type) => {
            if (isValidCustomValueByType(inputValue, type)) {
              someTypeMatched = true;
            }
          });

          if (!someTypeMatched) {
            return customValueAllowedTypesMismatchLoc;
          }
        }
      } else {
        const inputType = availableInputOptions.find((option) => option.key === inputValue)?.data?.type;

        if (inputType) {
          // Node value validation
          if (isSchemaNodeExtended(currentNode)) {
            if (!isValidConnectionByType(inputType, currentNode.type)) {
              return nodeTypeSchemaNodeTypeMismatchLoc;
            }
          } else {
            let someTypeMatched = false;
            currentNode.inputs[isUnboundedInput ? 0 : inputIndex].allowedTypes.forEach((type) => {
              if (isValidConnectionByType(inputType, type)) {
                someTypeMatched = true;
              }
            });

            if (!someTypeMatched) {
              return nodeTypeAllowedTypesMismatchLoc;
            }
          }
        }
      }
    }

    return undefined;
  }, [
    inputValue,
    isUnboundedInput,
    inputIndex,
    currentNode,
    inputIsCustomValue,
    availableInputOptions,
    customValueSchemaNodeTypeMismatchLoc,
    customValueAllowedTypesMismatchLoc,
    nodeTypeSchemaNodeTypeMismatchLoc,
    nodeTypeAllowedTypesMismatchLoc,
  ]);

  return (
    <>
      {!inputIsCustomValue ? (
        <Dropdown
          id={id}
          aria-labelledby={labelId}
          options={modifiedDropdownOptions}
          selectedKey={inputValue ?? null}
          onChange={(_e, option) => onSelectOption(option)}
          label={label}
          ariaLabel={label}
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
          data-testid={`inputDropdown-dropdown-${inputIndex}`}
          errorMessage={typeValidationMessage}
        />
      ) : (
        <div style={inputStyles}>
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
              suffix: { backgroundColor: 'transparent', padding: '0px' },
            }}
            data-testid={`inputDropdown-textField-${inputIndex}`}
            errorMessage={typeValidationMessage}
            onRenderSuffix={() => (
              <Tooltip relationship="label" content={clearCustomValueLoc}>
                <Button appearance="transparent" icon={<Dismiss20Regular />} onClick={onClearCustomValue} />
              </Tooltip>
            )}
          />
        </div>
      )}
    </>
  );
};
