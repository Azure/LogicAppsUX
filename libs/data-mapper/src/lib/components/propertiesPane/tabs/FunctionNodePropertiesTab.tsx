import { customTokens } from '../../../core';
import type { RootState } from '../../../core/state/Store';
import type { Connection } from '../../../models/Connection';
import type { FunctionData } from '../../../models/Function';
import { isCustomValue } from '../../../utils/Connection.Utils';
import { getFunctionBrandingForCategory } from '../../../utils/Function.Utils';
import { getIconForFunction } from '../../../utils/Icon.Utils';
import { InputDropdown } from '../../inputDropdown/InputDropdown';
import { Stack } from '@fluentui/react';
import { Button, Divider, Input, makeStyles, Text, tokens, Tooltip, typographyStyles } from '@fluentui/react-components';
import { Add20Regular, Delete20Regular } from '@fluentui/react-icons';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

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
  const intl = useIntl();
  const styles = useStyles();

  const connectionDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);

  // Consists of node names/ids and constant values
  const [inputValueArrays, setInputValues] = useState<InputValueMatrix | undefined>(undefined);

  const addFieldLoc = intl.formatMessage({
    defaultMessage: 'Add field',
    description: 'Add input field',
  });

  const inputLoc = intl.formatMessage({
    defaultMessage: 'Input',
    description: 'Input',
  });

  const outputLoc = intl.formatMessage({
    defaultMessage: 'Output',
    description: 'Output',
  });

  const functionNoReqInputLoc = intl.formatMessage({
    defaultMessage: `This function doesn't require any input.`,
    description: `Function doesn't have or require inputs`,
  });

  const addUnboundedInput = () => {
    const newInputValues: InputValueMatrix = inputValueArrays ? [...inputValueArrays] : [];

    newInputValues[0].push('');

    setInputValues(newInputValues);
  };

  const removeUnboundedInput = (index: number) => {
    const newInputValues = inputValueArrays ? [...inputValueArrays] : [];

    // TODO: Need to remove value from connection inputs[] if there

    newInputValues.splice(index, 1);

    setInputValues(newInputValues);
  };

  const functionBranding = useMemo(() => getFunctionBrandingForCategory(functionData.category), [functionData]);

  const connection = useMemo<Connection | undefined>(() => connectionDictionary[functionData.key], [connectionDictionary, functionData]);

  const outputValue = useMemo(
    () => getFunctionOutputValue((inputValueArrays?.flat().filter((value) => !!value) as string[]) ?? [], functionData.functionName),
    [inputValueArrays, functionData]
  );

  useEffect(() => {
    const newInputValues: InputValueMatrix = [];

    if (functionData.maxNumberOfInputs !== 0) {
      functionData.inputs.forEach((_input, idx) => {
        newInputValues[idx] = [undefined];
      });

      if (connection?.inputs) {
        Object.values(connection.inputs).forEach((inputValueArray, idx) => {
          newInputValues[idx][0] =
            inputValueArray.length === 0 ? undefined : isCustomValue(inputValueArray[0]) ? inputValueArray[0] : inputValueArray[0].node.key;
        });
      }
    }

    setInputValues(newInputValues);
  }, [functionData, connection]);

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

          {functionData.maxNumberOfInputs === 0 && <Text style={{ marginTop: '16px' }}>{functionNoReqInputLoc}</Text>}

          {functionData.maxNumberOfInputs > 0 && (
            <Stack>
              {functionData.inputs.map((input, idx) => (
                <div key={idx} style={{ marginTop: 8 }}>
                  <Tooltip relationship="label" content={input.tooltip || ''}>
                    <InputDropdown
                      currentNode={functionData}
                      label={input.name}
                      placeholder={input.placeHolder}
                      inputValue={inputValueArrays ? inputValueArrays[idx][0] : undefined}
                      inputIndex={idx}
                    />
                  </Tooltip>
                </div>
              ))}
            </Stack>
          )}

          {functionData.maxNumberOfInputs === -1 && (
            <>
              {inputValueArrays &&
                inputValueArrays.map((_inputValueArray, idx) => (
                  <Stack key={idx} horizontal verticalAlign="center" style={{ marginTop: 8 }}>
                    <Tooltip relationship="label" content={functionData.inputs[0].tooltip || ''}>
                      <InputDropdown
                        currentNode={functionData}
                        label={functionData.inputs[0].name}
                        placeholder={functionData.inputs[0].placeHolder}
                        inputValue={inputValueArrays[idx][0]}
                        inputIndex={0}
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
            </>
          )}
        </Stack>

        <Divider
          vertical
          className={styles.dividerStyle}
          style={{ margin: '0 16px 0 16px', paddingTop: 12, paddingBottom: 12, flex: '1 1 1px' }}
        />

        <Stack className={styles.inputOutputStackStyle}>
          <Text className={styles.titleStyle}>{outputLoc}</Text>

          <Input value={outputValue} style={{ marginTop: 16 }} readOnly />
        </Stack>
      </Stack>
    </div>
  );
};

export const getFunctionOutputValue = (inputValues: string[], functionName: string) => {
  let outputValue = `${functionName}(`;

  inputValues.forEach((inputValue, idx) => {
    if (inputValue) {
      outputValue += `${idx === 0 ? '' : ', '}${inputValue}`;
    }
  });

  return `${outputValue})`;
};
