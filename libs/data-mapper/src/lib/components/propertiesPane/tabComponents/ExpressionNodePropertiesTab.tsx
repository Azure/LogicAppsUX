import { Stack } from '@fluentui/react';
import { Button, Divider, Image, Input, makeStyles, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import type { SelectedExpressionNode } from '../../../models/SelectedNode';
import { iconUriForIconImageName } from '../../../utils/Icon.Utils';
import { Delete20Regular, Add20Regular } from '@fluentui/react-icons';

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

interface ExpressionNodePropertiesTabProps {
  currentNode: SelectedExpressionNode;
}

export const ExpressionNodePropertiesTab = ({ currentNode }: ExpressionNodePropertiesTabProps): JSX.Element => {
  const intl = useIntl();
  const styles = useStyles();

  const addFieldLoc = intl.formatMessage({
    defaultMessage: 'Add field',
    description: 'Add input field'
  });

  const inputLoc = intl.formatMessage({
    defaultMessage: 'Input',
    description: 'Input',
  });

  const outputLoc = intl.formatMessage({
    defaultMessage: 'Output',
    description: 'Output',
  });
  
  const exprNoReqInputLoc = intl.formatMessage({
    defaultMessage: `This expression doesn't require any input.`,
    description: `Expression doesn't have or require inputs`,
  }); 

  return (
    <div style={{ height: '100%' }}>
      <div>
        <Stack horizontal verticalAlign='center'>
          <Image src={iconUriForIconImageName(currentNode.iconName)} height={48} width={48} />
          <Text style={{ marginLeft: '8px' }}>{currentNode.name}</Text>
        </Stack>
        
        <Text style={{ marginTop: '8px' }}>{currentNode.description}</Text>
        <Text style={{ marginTop: '8px' }}>{currentNode.codeEx}</Text>
      </div>

      <Stack horizontal className={styles.inputOutputContentStyle}>
        <Stack className={styles.inputOutputStackStyle}>
          <Text className={styles.titleStyle}>{inputLoc}</Text>

          {currentNode.inputs.length > 0 ?
            <>
              {currentNode.inputs.map((input) =>
                <Stack horizontal verticalAlign='center' key={input.inputName}>
                  <Input placeholder='Temporary placeholder' style={{ marginTop: 16 }} />
                  <Button icon={<Delete20Regular />} />
                </Stack>
                
              )}

              <Button appearance='subtle' icon={<Add20Regular />}>{addFieldLoc}</Button>
            </>
          :
            <Text style={{ marginTop: '16px' }}>{exprNoReqInputLoc}</Text>
          }

          
        </Stack>

        <Divider vertical className={styles.dividerStyle} style={{ margin: '0 16px 0 16px', paddingTop: 12, paddingBottom: 12 }} />

        <Stack className={styles.inputOutputStackStyle}>
          <Text className={styles.titleStyle}>{outputLoc}</Text>

          <Input placeholder='Temporary placeholder' style={{ marginTop: 16 }} />
        </Stack>
      </Stack>
    </div>
  );
};
