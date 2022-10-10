import { sourcePrefix } from '../../../constants/ReactFlowConstants';
import { customTokens } from '../../../core';
import { makeConnection } from '../../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../../core/state/Store';
import { NormalizedDataType } from '../../../models';
import type { Connection } from '../../../models/Connection';
import { getFunctionBrandingForCategory } from '../../../utils/Function.Utils';
import { getIconForFunction } from '../../../utils/Icon.Utils';
import { ComboBox, Stack, type ISelectableOption } from '@fluentui/react';
import { Button, Divider, Input, makeStyles, Text, tokens, Tooltip, typographyStyles } from '@fluentui/react-components';
import { Add20Regular, Delete20Regular } from '@fluentui/react-icons';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
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

interface FunctionNodePropertiesTabProps {
  nodeKey: string;
}

export const FunctionNodePropertiesTab = ({ nodeKey }: FunctionNodePropertiesTabProps): JSX.Element => {
  const intl = useIntl();
  const styles = useStyles();
  const dispatch = useDispatch<AppDispatch>();

  const currentSourceNodes = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentSourceNodes);
  const sourceSchemaDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedSourceSchema);
  const functionNodeDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentFunctionNodes);
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);

  // Consists of node names/ids and constant values
  const [inputValues, setInputValues] = useState<string[]>([]);

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
    const newInputValues = [...inputValues];

    // NOTE: Should be safe to leave values out of connection.inputs[] if
    // they're empty strings (which will always be the case here) ?

    newInputValues.push('');

    setInputValues(newInputValues);
  };

  const removeUnboundedInput = (index: number) => {
    const newInputValues = [...inputValues];

    // TODO: Need to remove value from connection inputs[] if there

    newInputValues.splice(index, 1);

    setInputValues(newInputValues);
  };

  const validateAndCreateConnection = (inputIdx: number, option?: ISelectableOption<InputOptionData>) => {
    if (!option?.data) {
      return;
    }

    // Don't do anything if same value
    if (option.key === inputValues[inputIdx]) {
      return;
    }

    // Ensure that new connection won't create loop/circular-logic

    // TODO

    // Remove current connection if it exists

    // TODO

    // Create new connection

    const selectedNodeKey = option.key as string; // TODO: constant values
    const isFunction = option.data.isFunction;

    const sourceKey = isFunction ? selectedNodeKey : `${sourcePrefix}${selectedNodeKey}`;
    const source = isFunction ? functionNodeDictionary[sourceKey] : sourceSchemaDictionary[sourceKey];
    const destination = functionNodeDictionary[nodeKey];

    dispatch(
      makeConnection({
        source,
        destination,
        reactFlowDestination: nodeKey,
        reactFlowSource: sourceKey,
      })
    );
  };

  const functionNode = useMemo(() => functionNodeDictionary[nodeKey], [nodeKey, functionNodeDictionary]);

  const functionBranding = useMemo(() => getFunctionBrandingForCategory(functionNode.category), [functionNode]);

  const possibleInputOptions = useMemo<InputOptions>(() => {
    const newPossibleInputOptionsDictionary = {} as InputOptions;

    currentSourceNodes.forEach((srcNode) => {
      if (!newPossibleInputOptionsDictionary[srcNode.normalizedDataType]) {
        newPossibleInputOptionsDictionary[srcNode.normalizedDataType] = [];
      }

      newPossibleInputOptionsDictionary[srcNode.normalizedDataType].push({
        nodeKey: srcNode.key,
        nodeName: srcNode.name,
        isFunctionNode: false,
      });
    });

    Object.entries(functionNodeDictionary).forEach(([key, node]) => {
      if (!newPossibleInputOptionsDictionary[node.outputValueType]) {
        newPossibleInputOptionsDictionary[node.outputValueType] = [];
      }

      newPossibleInputOptionsDictionary[node.outputValueType].push({
        nodeKey: key,
        nodeName: node.functionName,
        isFunctionNode: true,
      });
    });

    return newPossibleInputOptionsDictionary;
  }, [currentSourceNodes, functionNodeDictionary]);

  const inputOptions = useMemo<ISelectableOption<InputOptionData>[][]>(() => {
    const newInputOptions: ISelectableOption<InputOptionData>[][] = [];

    functionNode.inputs.forEach((input, idx) => {
      newInputOptions.push([]);

      input.allowedTypes.forEach((type) => {
        if (type === NormalizedDataType.Any) {
          Object.values(possibleInputOptions).forEach((typeEntry) => {
            typeEntry.forEach((possibleOption) => {
              newInputOptions[idx].push({
                key: possibleOption.nodeKey,
                text: possibleOption.nodeName,
                data: {
                  isFunction: !!possibleOption.isFunctionNode,
                },
              });
            });
          });
        } else {
          if (!possibleInputOptions[type]) {
            return;
          }

          possibleInputOptions[type].forEach((possibleOption) => {
            newInputOptions[idx].push({
              key: possibleOption.nodeKey,
              text: possibleOption.nodeName,
              data: {
                isFunction: !!possibleOption.isFunctionNode,
              },
            });
          });
        }
      });
    });

    return newInputOptions;
  }, [possibleInputOptions, functionNode]);

  const connection = useMemo<Connection | undefined>(() => connectionDictionary[nodeKey], [connectionDictionary, nodeKey]);

  // TODO: Figure out input-ids not being *displayed* properly
  const getOutputValue = () => {
    let outputValue = `${functionNode.functionName}(`;

    inputValues.forEach((input, idx) => {
      outputValue += `${input}${idx === inputValues.length - 1 ? '' : ', '}`;
    });

    return `${outputValue})`;
  };

  useEffect(() => {
    const newInputValues: string[] = [];

    if (functionNode.maxNumberOfInputs === 0) {
      return;
    }

    if (functionNode.maxNumberOfInputs === -1) {
      if (connection) {
        connection.sources.forEach((src) => {
          newInputValues.push(src.node.key);
        });
      }
    } else {
      functionNode.inputs.forEach((_input) => {
        newInputValues.push('');
      });

      if (connection) {
        connection.sources.forEach((src, idx) => {
          newInputValues[idx] = src.node.key;
        });
      }
    }

    setInputValues(newInputValues);
  }, [functionNode, connection]);

  return (
    <div style={{ height: '100%' }}>
      <div>
        <Stack horizontal verticalAlign="center" style={{ marginBottom: '12px' }}>
          <span
            style={{
              backgroundColor: customTokens[functionBranding.colorTokenName],
              height: '28px',
              width: '28px',
              borderRadius: '14px',
            }}
          >
            <div style={{ paddingTop: '4px', color: tokens.colorNeutralBackground1, textAlign: 'center' }}>
              {getIconForFunction(functionNode.functionName, undefined, functionBranding)}
            </div>
          </span>

          <Text className={styles.titleStyle} style={{ marginLeft: '8px' }}>
            {functionNode.displayName}
          </Text>
        </Stack>

        <Text>{functionNode.description}</Text>
        <Text className={styles.codeExStyle}>
          <Text className={styles.fnNameStyle}>{functionNode.functionName}</Text>()
        </Text>
      </div>

      <Stack horizontal className={styles.inputOutputContentStyle}>
        <Stack className={styles.inputOutputStackStyle}>
          <Text className={styles.titleStyle}>{inputLoc}</Text>

          {functionNode.maxNumberOfInputs === 0 && <Text style={{ marginTop: '16px' }}>{functionNoReqInputLoc}</Text>}

          {functionNode.maxNumberOfInputs > 0 && (
            <Stack>
              {functionNode.inputs.map((input, idx) => (
                <div key={idx} style={{ marginTop: 8 }}>
                  <Tooltip relationship="label" content={input.tooltip}>
                    <ComboBox
                      label={input.displayName}
                      placeholder={input.placeholder}
                      options={inputOptions[idx]}
                      selectedKey={inputValues[idx]}
                      onChange={(_e, option) => validateAndCreateConnection(idx, option)}
                      allowFreeform={false}
                    />
                  </Tooltip>
                </div>
              ))}
            </Stack>
          )}

          {functionNode.maxNumberOfInputs === -1 && (
            <>
              {inputValues.map((_value, idx) => (
                <Stack key={idx} horizontal verticalAlign="center" style={{ marginTop: 8 }}>
                  <Tooltip relationship="label" content={functionNode.inputs[0].tooltip}>
                    <ComboBox
                      label={functionNode.inputs[0].displayName}
                      placeholder={functionNode.inputs[0].placeholder}
                      options={inputOptions[idx]}
                      selectedKey={inputValues[idx]}
                      onChange={(_e, option) => validateAndCreateConnection(idx, option)}
                      allowFreeform={false}
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

          <Input defaultValue={getOutputValue()} style={{ marginTop: 16 }} readOnly />
        </Stack>
      </Stack>
    </div>
  );
};
