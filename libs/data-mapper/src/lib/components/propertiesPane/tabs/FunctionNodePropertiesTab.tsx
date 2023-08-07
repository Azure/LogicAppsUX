import { customTokens } from '../../../core';
import { setConnectionInput } from '../../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../../core/state/Store';
import { InputFormat } from '../../../models';
import type { Connection, InputConnection } from '../../../models/Connection';
import type { FunctionData } from '../../../models/Function';
import { isCustomValue } from '../../../utils/Connection.Utils';
import { functionDropDownItemText, getFunctionBrandingForCategory } from '../../../utils/Function.Utils';
import { iconForNormalizedDataType } from '../../../utils/Icon.Utils';
import { LogCategory, LogService } from '../../../utils/Logging.Utils';
import { isSchemaNodeExtended } from '../../../utils/Schema.Utils';
import { FunctionIcon } from '../../functionIcon/FunctionIcon';
import { InputDropdown } from '../../inputTypes/InputDropdown';
import { InputTextbox } from '../../inputTypes/InputTextbox';
import { Stack } from '@fluentui/react';
import { Button, Divider, Text, Tooltip, makeStyles, tokens, typographyStyles } from '@fluentui/react-components';
import { Add20Regular, Delete20Regular } from '@fluentui/react-icons';
import { useMemo } from 'react';
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

interface FunctionNodePropertiesTabProps {
  functionData: FunctionData;
}

export const FunctionNodePropertiesTab = ({ functionData }: FunctionNodePropertiesTabProps): JSX.Element => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const styles = useStyles();

  const connectionDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);
  const selectedItemKey = useSelector((state: RootState) => state.dataMap.curDataMapOperation.selectedItemKey);

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

  const addUnboundedInput = (connection: Connection) => {
    updateInput(connection ? connection.inputs[0].length : 0, undefined);
  };

  const removeUnboundedInput = (index: number) => {
    updateInput(index, null);
  };

  const functionBranding = useMemo(() => getFunctionBrandingForCategory(functionData.category), [functionData]);
  const OutputValueTypeIcon = iconForNormalizedDataType(functionData.outputValueType, 16, false);

  const connection = connectionDictionary[selectedItemKey ?? ''];

  const getInputName = (inputConnection: InputConnection | undefined) => {
    if (inputConnection) {
      return isCustomValue(inputConnection)
        ? inputConnection
        : isSchemaNodeExtended(inputConnection.node)
        ? inputConnection.node.name
        : functionDropDownItemText(inputConnection.reactFlowKey, inputConnection.node, connectionDictionary);
    }

    return undefined;
  };

  const getInputValue = (inputConnection: InputConnection | undefined) => {
    if (inputConnection) {
      return isCustomValue(inputConnection) ? inputConnection : inputConnection.reactFlowKey;
    }

    return undefined;
  };

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
              {functionData.inputs.map((input, index) => {
                const inputConnection = !connection
                  ? undefined
                  : Object.values(connection.inputs).length > 1
                  ? connection.inputs[index][0]
                  : connection.inputs[0][index];

                return (
                  <div key={index} style={{ marginTop: 8 }}>
                    {input.inputEntryType === InputFormat.TextBox && (
                      <InputTextbox
                        input={input}
                        loadedInputValue={getInputValue(inputConnection)}
                        functionNode={functionData}
                      ></InputTextbox>
                    )}
                    {input.inputEntryType !== InputFormat.TextBox && (
                      <Tooltip relationship="label" content={input.tooltip || ''}>
                        <InputDropdown
                          currentNode={functionData}
                          placeholder={input.placeHolder}
                          inputName={getInputName(inputConnection)}
                          inputValue={getInputValue(inputConnection)}
                          inputIndex={index}
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
              {connection &&
                connection.inputs[0].map((input, index) => {
                  return (
                    <Stack key={`${functionData.inputs[0].name}-${index}`} horizontal verticalAlign="start" style={{ marginTop: 8 }}>
                      <Tooltip relationship="label" content={functionData.inputs[0].tooltip || ''}>
                        <InputDropdown
                          currentNode={functionData}
                          placeholder={functionData.inputs[0].placeHolder}
                          inputName={getInputName(input)}
                          inputValue={getInputValue(input)}
                          inputIndex={index}
                          inputAllowsCustomValues={functionData.inputs[0].allowCustomInput}
                          isUnboundedInput
                        />
                      </Tooltip>

                      <Button
                        appearance="subtle"
                        icon={<Delete20Regular />}
                        onClick={() => removeUnboundedInput(index)}
                        aria-label={removeInputLoc}
                      />
                    </Stack>
                  );
                })}

              <div>
                <Button
                  appearance="subtle"
                  icon={<Add20Regular />}
                  onClick={() => addUnboundedInput(connection)}
                  style={{ minWidth: '50px', maxWidth: '300px', marginTop: '12px', padding: '4px' }}
                >
                  {addFieldLoc}
                </Button>
              </div>
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
              {connection
                ? functionDropDownItemText(connection.self.reactFlowKey, functionData, connectionDictionary)
                : `${functionData.functionName}()`}
            </Text>
          </Stack>
        </Stack>
      </Stack>
    </div>
  );
};
