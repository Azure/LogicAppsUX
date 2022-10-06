import type { RootState } from '../../../core/state/Store';
import { getFunctionBrandingForCategory } from '../../../utils/Function.Utils';
import { getIconForFunction } from '../../../utils/Icon.Utils';
import { Stack } from '@fluentui/react';
import { Button, Divider, Input, Label, makeStyles, Text, tokens, Tooltip, typographyStyles } from '@fluentui/react-components';
import { Add20Regular, Delete20Regular } from '@fluentui/react-icons';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

const useStyles = makeStyles({
  inputOutputContentStyle: {
    display: 'flex',
    marginTop: '16px',
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

  const functionNodeDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentFunctionNodes);

  const [unboundedInputs, _setUnboundedInputs] = useState([]);

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

  const functionNode = useMemo(() => functionNodeDictionary[nodeKey], [nodeKey, functionNodeDictionary]);

  const functionBranding = useMemo(() => getFunctionBrandingForCategory(functionNode.category), [functionNode]);

  return (
    <div style={{ height: '100%' }}>
      <div>
        <Stack horizontal verticalAlign="center" style={{ marginBottom: '12px' }}>
          <span
            style={{
              backgroundColor: functionBranding.colorLight,
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
                <div key={idx}>
                  <Label htmlFor={`nodeInput-${idx}`}>{input.displayName}</Label>
                  <Tooltip relationship="label" content={input.tooltip}>
                    <Input id={`nodeInput-${idx}`} placeholder={input.placeholder} style={{ marginTop: 16 }} />
                  </Tooltip>
                </div>
              ))}
            </Stack>
          )}

          {functionNode.maxNumberOfInputs === -1 && (
            <>
              {unboundedInputs.map((input, idx) => (
                <Stack key={idx} horizontal verticalAlign="center">
                  <div>
                    <Label htmlFor={`nodeInput-${idx}`}>{functionNode.inputs[0].displayName}</Label>
                    <Tooltip relationship="label" content={functionNode.inputs[0].tooltip}>
                      <Input id={`nodeInput-${idx}`} placeholder={functionNode.inputs[0].placeholder} style={{ marginTop: 16 }} />
                    </Tooltip>
                  </div>

                  <Button icon={<Delete20Regular />} />
                </Stack>
              ))}

              <Button appearance="subtle" icon={<Add20Regular />}>
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

          <Input placeholder="Temporary placeholder" style={{ marginTop: 16 }} />
        </Stack>
      </Stack>
    </div>
  );
};
