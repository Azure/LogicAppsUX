import { customTokens } from '../../../core';
import { setConnectionInput } from '../../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../../core/state/Store';
import { InputFormat } from '../../../models';
import type { Connection, InputConnection } from '../../../models/Connection';
import type { FunctionData } from '../../../models/Function';
import { directAccessPseudoFunctionKey, indexPseudoFunctionKey } from '../../../models/Function';
import { isConnectionUnit, isCustomValue } from '../../../utils/Connection.Utils';
import { getInputValues } from '../../../utils/DataMap.Utils';
import {
  calculateIndexValue,
  formatDirectAccess,
  functionInputHasInputs,
  getFunctionBrandingForCategory,
  getFunctionOutputValue,
  isFunctionData,
} from '../../../utils/Function.Utils';
import { iconForNormalizedDataType } from '../../../utils/Icon.Utils';
import { LogCategory, LogService } from '../../../utils/Logging.Utils';
import { isSchemaNodeExtended } from '../../../utils/Schema.Utils';
import { FunctionIcon } from '../../functionIcon/FunctionIcon';
import { InputDropdown } from '../../inputTypes/InputDropdown';
import { InputTextbox } from '../../inputTypes/InputTextbox';
import { Stack } from '@fluentui/react';
import { Button, Divider, makeStyles, Text, tokens, Tooltip, typographyStyles } from '@fluentui/react-components';
import { Add20Regular, Delete20Regular } from '@fluentui/react-icons';
import { useDebouncedEffect } from '@react-hookz/web';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

const fnIconContainerSize = 28;

const useStyles = makeStyles({
  inputOutputContent: {
    display: 'flex',
    paddingTop: '16px',
    paddingBottom: '16px',
  },
  inputOutputStack: {
    width: '100%',
  },
  divider: {
    maxWidth: '12px',
    color: tokens.colorNeutralStroke2,
  },
  functionNameTitle: {
    ...typographyStyles.subtitle2,
    color: tokens.colorNeutralForeground1,
  },
  bodyText: {
    ...typographyStyles.body1,
    color: tokens.colorNeutralForeground1,
  },
  codeEx: {
    marginTop: '8px',
    display: 'block',
    fontFamily: tokens.fontFamilyMonospace,
  },
  fnName: {
    color: tokens.colorBrandForeground2,
    fontFamily: tokens.fontFamilyMonospace,
  },
  inputOutputStackTitle: {
    ...typographyStyles.body1Strong,
    color: tokens.colorNeutralForeground1,
  },
});

type InputValueMatrix = (string | undefined)[][];

interface FunctionNodePropertiesTabProps {
  functionData: FunctionData;
}

export const FunctionNodePropertiesTab = ({ functionData }: FunctionNodePropertiesTabProps): JSX.Element => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const styles = useStyles();

  const connectionDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);
  const selectedItemKey = useSelector((state: RootState) => state.dataMap.curDataMapOperation.selectedItemKey);

  // Consists of node names/ids and constant values
  const [inputValueArrays, setInputValueArrays] = useState<InputValueMatrix | undefined>(undefined);
  const [outputValue, setOutputValue] = useState<string>(getFunctionOutputValue([], functionData.functionName));

  const addFieldLoc = intl.formatMessage({
    defaultMessage: 'Add field',
    description: 'Add input field',
  });

  const inputLoc = intl.formatMessage({
    defaultMessage: 'Input',
    description: 'Input',
  });

  const expressionLoc = intl.formatMessage({
    defaultMessage: 'Expression',
    description: 'Expression',
  });

  const functionNoReqInputLoc = intl.formatMessage({
    defaultMessage: `This function doesn't require any input.`,
    description: `Function doesn't have or require inputs`,
  });

  const removeInputLoc = intl.formatMessage({
    defaultMessage: 'Remove input',
    description: 'Remove input',
  });

  const updateInput = (inputIndex: number, newValue: InputConnection | null) => {
    if (!selectedItemKey) {
      LogService.error(LogCategory.FunctionNodePropertiesTab, 'updateInput', {
        message: 'Attempted to update input with nothing selected on canvas',
      });

      return;
    }

    const targetNodeReactFlowKey = selectedItemKey;
    dispatch(
      setConnectionInput({
        targetNode: functionData,
        targetNodeReactFlowKey,
        inputIndex,
        input: newValue,
      })
    );
  };

  const addUnboundedInput = () => {
    updateInput(inputValueArrays ? inputValueArrays[0].length : 0, undefined);
  };

  const removeUnboundedInput = (index: number) => {
    updateInput(index, null);
  };

  const functionBranding = useMemo(() => getFunctionBrandingForCategory(functionData.category), [functionData]);
  const OutputValueTypeIcon = iconForNormalizedDataType(functionData.outputValueType, 16, false);

  const connection = useMemo<Connection | undefined>(
    () => connectionDictionary[selectedItemKey ?? ''],
    [connectionDictionary, selectedItemKey]
  );

  // Compile Function's input value(-array)s from its Connection
  useDebouncedEffect(
    () => {
      let newInputValueArrays: InputValueMatrix = [];
      const newInputNameArrays: string[] = []; // Node name or formatted custom value for fnOutputValue

      if (functionData.maxNumberOfInputs !== 0) {
        newInputValueArrays = functionData.inputs.map((_input) => []);

        if (connection?.inputs) {
          Object.values(connection.inputs).forEach((inputValueArray, idx) => {
            if (!(idx in newInputValueArrays)) {
              LogService.error(LogCategory.FunctionNodePropertiesTab, 'useEffect', {
                message: 'Connection inputs had more input-value-arrays than its Function had input slots',
                data: {
                  inputs: Object.values(connection.inputs),
                },
              });

              return;
            }

            inputValueArray.forEach((inputValue) => {
              if (inputValue === undefined) {
                newInputValueArrays[idx].push(undefined);
              } else if (isCustomValue(inputValue)) {
                newInputValueArrays[idx].push(inputValue);
                newInputNameArrays.push(inputValue);
              } else {
                newInputValueArrays[idx].push(inputValue.reactFlowKey);
                if (isFunctionData(inputValue.node)) {
                  newInputNameArrays.push(
                    `${inputValue.node.functionName}(${functionInputHasInputs(inputValue.reactFlowKey, connectionDictionary) ? '...' : ''})`
                  );
                } else {
                  newInputNameArrays.push(inputValue.node.name);
                }
              }
            });
          });
        }
      }

      setInputValueArrays(newInputValueArrays);

      let newOutputValue: string;
      if (functionData.key === indexPseudoFunctionKey) {
        const indexFunctionSourceNode =
          connection &&
          connection.inputs[0][0] &&
          isConnectionUnit(connection.inputs[0][0]) &&
          isSchemaNodeExtended(connection.inputs[0][0].node) &&
          connection.inputs[0][0].node;

        newOutputValue = indexFunctionSourceNode
          ? calculateIndexValue(indexFunctionSourceNode)
          : getFunctionOutputValue(newInputNameArrays, functionData.functionName);
      } else if (functionData.key === directAccessPseudoFunctionKey) {
        const functionValues = getInputValues(connection, connectionDictionary, false);
        newOutputValue =
          functionValues.length === 3
            ? formatDirectAccess(functionValues[0], functionValues[1], functionValues[2])
            : getFunctionOutputValue(newInputNameArrays, functionData.functionName);
      } else {
        newOutputValue = getFunctionOutputValue(newInputNameArrays, functionData.functionName);
      }

      setOutputValue(newOutputValue);
    },
    [functionData, connection, connectionDictionary],
    10,
    10
  );

  return (
    <div style={{ height: '100%' }}>
      <div>
        <Stack horizontal verticalAlign="center" style={{ marginBottom: '12px' }}>
          <span
            style={{
              backgroundColor: customTokens[functionBranding.colorTokenName],
              height: fnIconContainerSize,
              width: fnIconContainerSize,
              borderRadius: '50%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <FunctionIcon
              functionKey={functionData.key}
              functionName={functionData.functionName}
              categoryName={functionData.category}
              color={tokens.colorNeutralForegroundInverted}
            />
          </span>

          <Text className={styles.functionNameTitle} style={{ marginLeft: '8px' }}>
            {functionData.displayName}
          </Text>
        </Stack>

        <Text className={styles.bodyText}>{functionData.description}</Text>
        {functionData.functionName && (
          <Text className={styles.codeEx}>
            <Text className={styles.fnName}>{functionData.functionName}</Text>()
          </Text>
        )}
      </div>

      <Stack horizontal className={styles.inputOutputContent}>
        <Stack className={styles.inputOutputStack}>
          <Text className={styles.inputOutputStackTitle}>{inputLoc}</Text>

          {functionData.maxNumberOfInputs === 0 && ( // Functions with no inputs
            <Text className={styles.bodyText} style={{ marginTop: '16px' }}>
              {functionNoReqInputLoc}
            </Text>
          )}

          {functionData.maxNumberOfInputs > 0 && ( // Functions with bounded inputs
            <Stack>
              {functionData.inputs.map((input, idx) => {
                const inputValue =
                  inputValueArrays && idx in inputValueArrays && 0 in inputValueArrays[idx] ? inputValueArrays[idx][0] : undefined;
                return (
                  <div key={idx} style={{ marginTop: 8 }}>
                    {input.displayAttribute === InputFormat.TextBox && (
                      <InputTextbox input={input} loadedInputValue={inputValue} functionNode={functionData}></InputTextbox>
                    )}
                    {input.displayAttribute !== InputFormat.TextBox && (
                      <Tooltip relationship="label" content={input.tooltip || ''}>
                        <InputDropdown
                          currentNode={functionData}
                          label={input.name}
                          placeholder={input.placeHolder}
                          inputValue={inputValue}
                          inputIndex={idx}
                          inputStyles={{ width: '100%' }}
                          inputAllowsCustomValues={input.allowCustomInput}
                        />
                      </Tooltip>
                    )}
                  </div>
                );
              })}
            </Stack>
          )}

          {functionData.maxNumberOfInputs === -1 && ( // Function with unbounded input (first input will always be the only unbounded one)
            <>
              {inputValueArrays &&
                0 in inputValueArrays && // Unbounded input value mapping
                inputValueArrays[0].map((unboundedInputValue, idx) => (
                  <Stack key={`${functionData.inputs[0].name}-${idx}`} horizontal verticalAlign="start" style={{ marginTop: 8 }}>
                    <Tooltip relationship="label" content={functionData.inputs[0].tooltip || ''}>
                      <InputDropdown
                        currentNode={functionData}
                        label={functionData.inputs[0].name}
                        placeholder={functionData.inputs[0].placeHolder}
                        inputValue={unboundedInputValue}
                        inputIndex={idx}
                        inputStyles={{ width: '100%' }}
                        inputAllowsCustomValues={functionData.inputs[0].allowCustomInput}
                        isUnboundedInput
                      />
                    </Tooltip>

                    <Button
                      appearance="subtle"
                      icon={<Delete20Regular />}
                      onClick={() => removeUnboundedInput(idx)}
                      style={{ marginLeft: '16px', marginTop: '26px' }}
                      aria-label={removeInputLoc}
                    />
                  </Stack>
                ))}

              <div>
                <Button
                  appearance="subtle"
                  icon={<Add20Regular />}
                  onClick={addUnboundedInput}
                  style={{ minWidth: '50px', maxWidth: '300px', marginTop: '12px', padding: '4px' }}
                >
                  {addFieldLoc}
                </Button>
              </div>

              {inputValueArrays && // Any other inputs after the first unbounded input
                inputValueArrays.slice(1).map(
                  (
                    inputValueArray,
                    idx // NOTE: Actual input index will be idx+1
                  ) =>
                    idx + 1 in functionData.inputs ? (
                      <div key={idx} style={{ marginTop: 8 }}>
                        <Tooltip relationship="label" content={functionData.inputs[idx + 1].tooltip || ''}>
                          <InputDropdown
                            currentNode={functionData}
                            label={functionData.inputs[idx + 1].name}
                            placeholder={functionData.inputs[idx + 1].placeHolder}
                            inputValue={inputValueArray.length > 0 ? inputValueArray[0] : undefined}
                            inputIndex={idx + 1}
                            inputStyles={{ width: '100%' }}
                            inputAllowsCustomValues={functionData.inputs[idx + 1].allowCustomInput}
                          />
                        </Tooltip>
                      </div>
                    ) : (
                      LogService.error(LogCategory.FunctionNodePropertiesTab, 'render', {
                        message: `inputValueArrays had value-array for an unspecified input on Function ${
                          functionData.functionName
                        } at idx ${idx + 1}: ${inputValueArray
                          .map((inputVal) => (inputVal === undefined ? 'undefined' : `'${inputVal}'`))
                          .toString()}`,
                      })
                    )
                )}
            </>
          )}
        </Stack>

        <Divider
          vertical
          className={styles.divider}
          style={{ margin: '0 16px 0 16px', paddingTop: 12, paddingBottom: 12, flex: '1 1 1px' }}
        />

        <Stack className={styles.inputOutputStack}>
          <Text className={styles.inputOutputStackTitle}>{expressionLoc}</Text>

          <Stack horizontal verticalAlign="center" style={{ marginTop: 16 }}>
            <OutputValueTypeIcon />

            <Text className={styles.bodyText} style={{ marginLeft: 4 }}>
              {outputValue}
            </Text>
          </Stack>
        </Stack>
      </Stack>
    </div>
  );
};
