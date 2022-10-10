import { customTokens } from '../../../core';
import type { RootState } from '../../../core/state/Store';
import { getFunctionBrandingForCategory } from '../../../utils/Function.Utils';
import { getIconForFunction } from '../../../utils/Icon.Utils';
import { Stack } from '@fluentui/react';
import { Button, Divider, Input, makeStyles, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { Add20Regular, Delete20Regular } from '@fluentui/react-icons';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

const useStyles = makeStyles({
  inputOutputContentStyle: {
    height: '100%',
    marginTop: '16px',
  },
  inputOutputStackStyle: {
    width: '100%',
  },
  dividerStyle: {
    height: '100%',
    maxWidth: '12px',
    color: tokens.colorNeutralStroke2,
  },
  titleStyle: {
    ...typographyStyles.body1Strong,
  },
});

interface FunctionNodePropertiesTabProps {
  nodeKey: string;
}

export const FunctionNodePropertiesTab = ({ nodeKey }: FunctionNodePropertiesTabProps): JSX.Element => {
  const intl = useIntl();
  const styles = useStyles();

  const functionNodeDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentFunctionNodes);

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
        <Stack horizontal verticalAlign="center">
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

          <Text style={{ marginLeft: '8px' }}>{functionNode.displayName}</Text>
        </Stack>

        <Text style={{ marginTop: '8px' }}>{functionNode.description}</Text>
        <Text style={{ marginTop: '8px' }}>{/* TODO: Code example of Function */}</Text>
      </div>

      <Stack horizontal className={styles.inputOutputContentStyle}>
        <Stack className={styles.inputOutputStackStyle}>
          <Text className={styles.titleStyle}>{inputLoc}</Text>

          {functionNode.maxNumberOfInputs > 0 ? (
            <>
              {functionNode.inputs.map((input) => (
                <Stack horizontal verticalAlign="center" key={input.displayName}>
                  <Input placeholder="Temporary placeholder" style={{ marginTop: 16 }} />
                  <Button icon={<Delete20Regular />} />
                </Stack>
              ))}

              <Button appearance="subtle" icon={<Add20Regular />}>
                {addFieldLoc}
              </Button>
            </>
          ) : (
            <Text style={{ marginTop: '16px' }}>{functionNoReqInputLoc}</Text>
          )}
        </Stack>

        <Divider vertical className={styles.dividerStyle} style={{ margin: '0 16px 0 16px', paddingTop: 12, paddingBottom: 12 }} />

        <Stack className={styles.inputOutputStackStyle}>
          <Text className={styles.titleStyle}>{outputLoc}</Text>

          <Input placeholder="Temporary placeholder" style={{ marginTop: 16 }} />
        </Stack>
      </Stack>
    </div>
  );
};
