import { customTokens } from '../../../core';
import { updateConnectionInput } from '../../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../../core/state/Store';
import type { Connection, InputConnection } from '../../../models/Connection';
import type { FunctionData } from '../../../models/Function';
import { isCustomValue } from '../../../utils/Connection.Utils';
import {
  functionInputHasInputs,
  getFunctionBrandingForCategory,
  getFunctionOutputValue,
  isFunctionData,
} from '../../../utils/Function.Utils';
import { getIconForFunction } from '../../../utils/Icon.Utils';
import { InputDropdown } from '../../inputDropdown/InputDropdown';
import { Stack } from '@fluentui/react';
import { Button, Divider, makeStyles, Text, tokens, Tooltip, typographyStyles } from '@fluentui/react-components';
import { Add20Regular, Delete20Regular } from '@fluentui/react-icons';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

const fnIconContainerSize = 28;

const useStyles = makeStyles({
  inputOutputContentStyle: {
    display: 'flex',
    paddingTop: '16px',
    paddingBottom: '16px',
  },
  inputOutputStackStyle: {
    width: '100%',
  },
  dividerStyle: {
    maxWidth: '12px',
    color: tokens.colorNeutralStroke2,
  },
  titleStyle: {
    ...typographyStyles.body1Strong,
  },
  codeExStyle: {
    marginTop: '8px',
    display: 'block',
    fontFamily: tokens.fontFamilyMonospace,
  },
  fnNameStyle: {
    color: tokens.colorBrandForeground2,
    fontFamily: tokens.fontFamilyMonospace,
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

  const updateInput = (inputIndex: number, newValue: InputConnection | null) => {
    if (!selectedItemKey) {
      console.error('PropPane - Function: Attempted to update input with nothing selected on canvas');
      return;
    }

    const targetNodeReactFlowKey = selectedItemKey;
    dispatch(
      updateConnectionInput({ targetNode: functionData, targetNodeReactFlowKey, inputIndex, value: newValue, isUnboundedInput: true })
    );
  };

  const addUnboundedInput = () => {
    updateInput(inputValueArrays ? inputValueArrays[0].length : 0, undefined);
  };

  const removeUnboundedInput = (index: number) => {
    updateInput(index, null);
  };

  const functionBranding = useMemo(() => getFunctionBrandingForCategory(functionData.category), [functionData]);

  const connection = useMemo<Connection | undefined>(
    () => connectionDictionary[selectedItemKey ?? ''],
    [connectionDictionary, selectedItemKey]
  );

  // Compile Function's input value(-array)s from its Connection
  useEffect(() => {
    let newInputValueArrays: InputValueMatrix = [];
    const newInputNameArrays: string[] = []; // Node name or formatted custom value for fnOutputValue

    if (functionData.maxNumberOfInputs !== 0) {
      newInputValueArrays = functionData.inputs.map((_input) => []);

      if (connection?.inputs) {
        Object.values(connection.inputs).forEach((inputValueArray, idx) => {
          if (!(idx in newInputValueArrays)) {
            console.error(
              `Connection inputs had more input-value-arrays than its Function had input slots - connection.inputs -> ${Object.values(
                connection.inputs
              ).map((input) => (!input ? 'undefined' : input.toString()))}`
            );
            return;
          }

          inputValueArray.forEach((inputValue) => {
            if (!inputValue) {
              newInputValueArrays[idx].push(undefined);
            } else if (isCustomValue(inputValue)) {
              newInputValueArrays[idx].push(inputValue);
              newInputNameArrays.push(`"${inputValue}"`);
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
    setOutputValue(getFunctionOutputValue(newInputNameArrays, functionData.functionName));
  }, [functionData, connection, connectionDictionary]);

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
            }}
          >
            <div style={{ paddingTop: '4px', color: tokens.colorNeutralBackground1, textAlign: 'center' }}>
              {getIconForFunction(functionData.functionName, undefined, functionBranding)}
            </div>
          </span>

          <Text className={styles.titleStyle} style={{ marginLeft: '8px' }}>
            {functionData.displayName}
          </Text>
        </Stack>

        <Text>{functionData.description}</Text>
        <Text className={styles.codeExStyle}>
          <Text className={styles.fnNameStyle}>{functionData.functionName}</Text>()
        </Text>
      </div>

      <Stack horizontal className={styles.inputOutputContentStyle}>
        <Stack className={styles.inputOutputStackStyle}>
          <Text className={styles.titleStyle}>{inputLoc}</Text>

          {functionData.maxNumberOfInputs === 0 && ( // Functions with no inputs
            <Text style={{ marginTop: '16px' }}>{functionNoReqInputLoc}</Text>
          )}

          {functionData.maxNumberOfInputs > 0 && ( // Functions with bounded inputs
            <Stack>
              {functionData.inputs.map((input, idx) => (
                <div key={idx} style={{ marginTop: 8 }}>
                  <Tooltip relationship="label" content={input.tooltip || ''}>
                    <InputDropdown
                      currentNode={functionData}
                      label={input.name}
                      placeholder={input.placeHolder}
                      inputValue={inputValueArrays && idx in inputValueArrays && 0 in inputValueArrays[idx] ? inputValueArrays[idx][0] : ''}
                      inputIndex={idx}
                      inputStyles={{ width: '100%' }}
                    />
                  </Tooltip>
                </div>
              ))}
            </Stack>
          )}

          {functionData.maxNumberOfInputs === -1 && ( // Function with unbounded input (first input will always be the only unbounded one)
            <>
              {inputValueArrays &&
                0 in inputValueArrays && // Unbounded input value mapping
                inputValueArrays[0].map((unboundedInputValue, idx) => (
                  <Stack key={`${functionData.inputs[0].name}-${idx}`} horizontal verticalAlign="center" style={{ marginTop: 8 }}>
                    <Tooltip relationship="label" content={functionData.inputs[0].tooltip || ''}>
                      <InputDropdown
                        currentNode={functionData}
                        label={functionData.inputs[0].name}
                        placeholder={functionData.inputs[0].placeHolder}
                        inputValue={unboundedInputValue}
                        inputIndex={idx}
                        inputStyles={{ width: '100%' }}
                        isUnboundedInput
                      />
                    </Tooltip>

                    <Button
                      appearance="subtle"
                      icon={<Delete20Regular />}
                      onClick={() => removeUnboundedInput(idx)}
                      style={{ marginLeft: '16px' }}
                    />
                  </Stack>
                ))}

              <Button appearance="subtle" icon={<Add20Regular />} onClick={addUnboundedInput} style={{ width: '72px', marginTop: 12 }}>
                {addFieldLoc}
              </Button>

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
                          />
                        </Tooltip>
                      </div>
                    ) : (
                      console.error(
                        `inputValueArrays had value-array for an unspecified input on Function ${functionData.functionName} at idx ${
                          idx + 1
                        }: ${inputValueArray.toString()}`
                      )
                    )
                )}
            </>
          )}
        </Stack>

        <Divider
          vertical
          className={styles.dividerStyle}
          style={{ margin: '0 16px 0 16px', paddingTop: 12, paddingBottom: 12, flex: '1 1 1px' }}
        />

        <Stack className={styles.inputOutputStackStyle}>
          <Text className={styles.titleStyle}>{expressionLoc}</Text>

          <Text style={{ marginTop: 16 }}>{outputValue}</Text>
        </Stack>
      </Stack>
    </div>
  );
};
