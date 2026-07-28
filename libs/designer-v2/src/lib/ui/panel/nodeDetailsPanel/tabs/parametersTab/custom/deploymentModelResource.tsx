import { type ChangeState, DropdownEditor, Label, StringEditor } from '@microsoft/designer-ui';
import {
  CognitiveServiceService,
  customLengthGuid,
  equals,
  guid,
  LogEntryLevel,
  LoggerService,
  parseErrorMessage,
  type IEditorProps,
} from '@microsoft/logic-apps-shared';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { deploymentModelNameStyle, useDeploymentModelResourceStyles } from './styles';
import { Button, mergeClasses, Text } from '@fluentui/react-components';
import { useAvailableModelsForAccount } from '../../../../connectionsPanel/createConnection/custom/useCognitiveService';

export const CustomDeploymentModelResource = (props: IEditorProps) => {
  const intl = useIntl();
  const { metadata, onClose } = props;
  const styles = useDeploymentModelResourceStyles();
  const isFoundry = metadata?.agentModelType === 'MicrosoftFoundry';
  const resourceId = useMemo(() => metadata?.cognitiveServiceAccountId?.replace(/\/models$/, ''), [metadata?.cognitiveServiceAccountId]);
  const { data: availableModels, isLoading: isLoadingModels } = useAvailableModelsForAccount(resourceId);

  // Build the deployable-model list from the account's region model catalog, keeping only ready
  // chat-completion models (and, for Azure OpenAI, only OpenAI-format models), deduped to the latest version.
  const modelOptions = useMemo(() => {
    const byName = new Map<string, { name: string; version: string; format: string; isDefault: boolean }>();
    for (const entry of availableModels ?? []) {
      const model = entry?.model;
      const modelName = model?.name;
      if (!modelName) {
        continue;
      }
      const isChatCompletion = equals(String(model?.capabilities?.chatCompletion ?? ''), 'true');
      const lifecycle = model?.lifecycleStatus;
      const isActive = !lifecycle || (!equals(String(lifecycle), 'Deprecated') && !equals(String(lifecycle), 'Retired'));
      const formatOk = isFoundry || equals(String(model?.format ?? ''), 'OpenAI');
      // Only surface models deployable with the SKU we create with (GlobalStandard); otherwise the create call fails.
      const skuOk = !Array.isArray(model?.skus) || model.skus.some((sku: any) => equals(String(sku?.name ?? ''), 'GlobalStandard'));
      if (!isChatCompletion || !isActive || !formatOk || !skuOk) {
        continue;
      }
      const isDefault = model?.isDefaultVersion === true;
      const version = model?.version ?? '';
      const existing = byName.get(modelName);
      // Prefer the catalog's default version; otherwise fall back to the greatest version string.
      const preferNew = !existing || (isDefault && !existing.isDefault) || (isDefault === existing.isDefault && version > existing.version);
      if (preferNew) {
        byName.set(modelName, { name: modelName, version, format: model?.format ?? 'OpenAI', isDefault });
      }
    }
    return Array.from(byName.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ name, version, format }) => ({ name, version, format }));
  }, [availableModels, isFoundry]);

  const [name, setName] = useState(`model-${customLengthGuid(5)}`);
  const [modelKey, setModelKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Derive the effective selection during render so it can never point at a model that
  // dropped out of the catalog (account/type change or refetch). Storing the key and only
  // seeding it once could leave a stale name that resolves to no model on submit.
  const effectiveModelKey = useMemo(
    () => (modelKey && modelOptions.some((option) => option.name === modelKey) ? modelKey : (modelOptions[0]?.name ?? '')),
    [modelKey, modelOptions]
  );

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
      DEFAULT_ERROR_MESSAGE: intl.formatMessage({
        defaultMessage: 'An error occurred while creating the deployment model resource.',
        id: 'aZtqSZ',
        description: 'Default error message for deployment model resource creation',
      }),
    }),
    [intl]
  );

  const onSubmit = useCallback(async () => {
    if (!resourceId) {
      console.error('OpenAI account ID is not provided in metadata.');
      return;
    }
    setIsSaving(true);

    try {
      const selectedModel = modelOptions.find((option) => option.name === effectiveModelKey);
      const newDeploymentResponse = await CognitiveServiceService().createNewDeployment(name, effectiveModelKey, resourceId, selectedModel);
      setErrorMessage('');
      setIsSaving(false);
      onClose?.(newDeploymentResponse ? name : undefined);
      return;
    } catch (error: any) {
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'agent-connection-deployment-model-create',
        message: 'Failed to create deployment',
        error: error,
      });
      setIsSaving(false);
      setErrorMessage(parseErrorMessage(error, stringResources.DEFAULT_ERROR_MESSAGE));
    }
  }, [resourceId, modelOptions, effectiveModelKey, name, onClose, stringResources.DEFAULT_ERROR_MESSAGE]);

  const onCloseModal = useCallback(() => {
    onClose?.(undefined);
  }, [onClose]);

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
          key={effectiveModelKey}
          initialValue={[
            {
              type: 'literal',
              value: effectiveModelKey,
              id: guid(),
            },
          ]}
          options={modelOptions.map((option) => ({
            key: option.name,
            displayName: option.name,
            value: option.name,
          }))}
          onChange={(state: ChangeState) => {
            if (state.value.length > 0) {
              setModelKey(state.value[0]?.value);
            }
          }}
        />
        <div className={mergeClasses(styles.rowContainer, styles.buttonContainer)}>
          <Button
            appearance="primary"
            disabled={isSaving || isLoadingModels || !name || !effectiveModelKey || modelOptions.length === 0}
            size={'small'}
            onClick={onSubmit}
          >
            {stringResources.SUBMIT_BUTTON}
          </Button>
          <Button disabled={isSaving || !name} size={'small'} onClick={onCloseModal}>
            {stringResources.CANCEL_BUTTON}
          </Button>
        </div>
        <div className={mergeClasses(styles.rowContainer, styles.buttonContainer)}>
          <Text className={styles.errorMessageText}>{errorMessage}</Text>
        </div>
      </div>
    </>
  );
};
