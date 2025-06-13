import { type ChangeState, DropdownEditor, Label, StringEditor } from '@microsoft/designer-ui';
import {
  CognitiveServiceService,
  customLengthGuid,
  guid,
  LogEntryLevel,
  LoggerService,
  type IEditorProps,
} from '@microsoft/logic-apps-shared';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import constants from '../../../../../../common/constants';
import { deploymentModelNameStyle, useDeploymentModelResourceStyles } from './styles';
import { Text } from '@fluentui/react';
import { Button, mergeClasses } from '@fluentui/react-components';

export const CustomDeploymentModelResource = (props: IEditorProps) => {
  const intl = useIntl();
  const { metadata, onClose } = props;
  const styles = useDeploymentModelResourceStyles();
  const [name, setName] = useState(`model-${customLengthGuid(5)}`);
  const [modelKey, setModelKey] = useState(constants.SUPPORTED_AGENT_MODELS[0]);
  const [isSaving, setIsSaving] = useState(false);

  const stringResources = useMemo(
    () => ({
      DEPLOYMENT_NAME: intl.formatMessage({
        defaultMessage: 'Name',
        id: '7ScdN6',
        description: 'Deployment model resource name label',
      }),
      DEPLOYMENT_MODEL: intl.formatMessage({
        defaultMessage: 'Model',
        id: '0G6CfM',
        description: 'Deployment model resource label',
      }),
      CREATE_DEPLOYMENT_MODE: intl.formatMessage({
        defaultMessage: 'Create deployment model',
        id: 'Q13J5V',
        description: 'Create deployment model resource label',
      }),
      SUBMIT_BUTTON: intl.formatMessage({
        defaultMessage: 'Submit',
        id: 'xL0gmX',
        description: 'Submit button text for deployment model resource',
      }),
      CANCEL_BUTTON: intl.formatMessage({
        defaultMessage: 'Cancel',
        id: '7rItIH',
        description: 'Cancel button text for deployment model resource',
      }),
    }),
    [intl]
  );

  const onSubmit = useCallback(async () => {
    const resourceId = metadata?.cognitiveServiceAccountId;
    if (!resourceId) {
      console.error('OpenAI account ID is not provided in metadata.');
      return;
    }
    setIsSaving(true);

    try {
      const newDeploymentResponse = await CognitiveServiceService().createNewDeployment(name, modelKey, resourceId);

      if (newDeploymentResponse) {
        onClose?.(name);
        setIsSaving(false);
        return;
      }
    } catch (error: any) {
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'agent-connection-deployment-model-create',
        message: 'Failed to create deployment',
        error: error,
      });
    }

    onClose?.();
    setIsSaving(false);
  }, [metadata?.cognitiveServiceAccountId, modelKey, name, onClose]);

  return (
    <>
      <Text className={styles.containerTitle}>{stringResources.CREATE_DEPLOYMENT_MODE}</Text>
      <div className={styles.rowContainer}>
        <div className="msla-input-parameter-label">
          <Label text={stringResources.DEPLOYMENT_NAME} isRequiredField={true} />
        </div>
        <StringEditor
          initialValue={[
            {
              type: 'literal',
              value: name,
              id: guid(),
            },
          ]}
          style={deploymentModelNameStyle}
          onChange={(state: ChangeState) => {
            if (state.value.length > 0) {
              setName(state.value[0]?.value);
            }
          }}
        />
      </div>
      <div className={styles.rowContainer}>
        <div className="msla-input-parameter-label">
          <Label text={stringResources.DEPLOYMENT_MODEL} isRequiredField={true} />
        </div>
        <DropdownEditor
          initialValue={[
            {
              type: 'literal',
              value: modelKey,
              id: guid(),
            },
          ]}
          options={constants.SUPPORTED_AGENT_MODELS.map((supportedModel) => ({
            key: supportedModel,
            displayName: supportedModel,
            value: supportedModel,
          }))}
          onChange={(state: ChangeState) => {
            if (state.value.length > 0) {
              setModelKey(state.value[0]?.value);
            }
          }}
        />
        <div className={mergeClasses(styles.rowContainer, styles.buttonContainer)}>
          <Button appearance="primary" disabled={isSaving || !name || !modelKey} size={'small'} onClick={onSubmit}>
            {stringResources.SUBMIT_BUTTON}
          </Button>
          <Button disabled={isSaving || !name || !modelKey} size={'small'}>
            {stringResources.CANCEL_BUTTON}
          </Button>
        </div>
      </div>
    </>
  );
};
