import { type TemplatePanelFooterProps, TemplatesPanelFooter, TemplatesSection, type TemplatesSectionItem } from '@microsoft/designer-ui';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../core/state/knowledge/store';
import { closePanel, KnowledgePanelView } from '../../../../core/state/knowledge/panelSlice';
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Text,
} from '@fluentui/react-components';
import { useEditPanelStyles, usePanelStyles } from '../styles';
import { useIntl } from 'react-intl';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useConnection } from '../../../../core/knowledge/utils/queries';
import { createOrUpdateConnection, getConnectionParametersForEdit } from '../../../../core/knowledge/utils/connection';
import { type ConnectionParameterSetParameter, equals, isEmptyString } from '@microsoft/logic-apps-shared';
import { setNotification } from '../../../../core/state/knowledge/optionsSlice';
import type { ServerNotificationData } from '../../../mcp/servers/servers';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export const EditConnectionPanel = ({ mountNode }: { mountNode: HTMLDivElement | null }) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const { isOpen, panelMode } = useSelector((state: RootState) => ({
    isOpen: state.knowledgeHubPanel?.isOpen ?? false,
    panelMode: state.knowledgeHubPanel?.currentPanelView ?? null,
  }));
  const { data: connection, isLoading } = useConnection();
  const { connectionParameters, parameterValues } = useMemo(() => getConnectionParametersForEdit(intl, connection), [connection, intl]);
  const [connectionParameterValues, setConnectionParameterValues] = useState<Record<string, any>>(parameterValues ?? {});
  const [isDirty, setIsDirty] = useState(false);

  useEffect(
    () => setIsDirty(hasValuesChanged(connectionParameterValues, parameterValues ?? {})),
    [connectionParameterValues, parameterValues]
  );

  useEffect(() => {
    if (parameterValues) {
      setConnectionParameterValues(parameterValues);
    }
  }, [parameterValues]);

  const [isSaving, setIsSaving] = useState(false);
  const styles = { ...usePanelStyles(), ...useEditPanelStyles() };
  const INTL_TEXT = useMemo(
    () => ({
      loadingText: intl.formatMessage({
        defaultMessage: 'Loading connection details...',
        id: 'VDsEqR',
        description: 'Text displayed while loading connection details',
      }),
      infoText: intl.formatMessage({
        defaultMessage: 'You can edit only the names for the connection and models at this time.',
        id: 'K6VGan',
        description: 'Informational text for edit connection panel',
      }),
      updateTitle: intl.formatMessage({
        defaultMessage: 'Update connection',
        id: 'CwKE/Q',
        description: 'Header for the panel to update a knowledge hub connection',
      }),
      closeAriaLabel: intl.formatMessage({
        id: 'kdCuJZ',
        defaultMessage: 'Close panel',
        description: 'Aria label for close button',
      }),
      buttonText: intl.formatMessage({
        id: 'luCPhK',
        defaultMessage: 'Save',
        description: 'Button text for update connection',
      }),
      savingText: intl.formatMessage({
        id: 'ZbcukP',
        defaultMessage: 'Saving...',
        description: 'Button text for when the connection is being updated',
      }),
      cancelButton: intl.formatMessage({
        id: 'jfBXq8',
        defaultMessage: 'Cancel',
        description: 'Button text for cancelling updating the connection',
      }),
      errorText: intl.formatMessage({
        id: '2XMSCZ',
        defaultMessage: 'Requires a parameter value.',
        description: 'Error message when a required parameter value is missing',
      }),
      detailsTitle: intl.formatMessage({
        id: 'ISO6j1',
        defaultMessage: 'Details',
        description: 'Knowledge hub connection details label',
      }),
      cosmosDBTitle: intl.formatMessage({
        id: 'mQb69n',
        defaultMessage: 'Cosmos database',
        description: 'Azure Cosmos DB details label',
      }),
      openAITitle: intl.formatMessage({
        id: 'FeqzjX',
        defaultMessage: 'Azure OpenAI model',
        description: 'Azure OpenAI model label',
      }),
      displayNameFieldLabel: intl.formatMessage({
        id: '3cdEwu',
        defaultMessage: 'Connection display name',
        description: 'Label for the display name field in edit connection panel',
      }),
    }),
    [intl]
  );

  const handleDismiss = useCallback(() => {
    dispatch(closePanel());
  }, [dispatch]);

  const getParameterItem = useCallback(
    (key: string, parameter: ConnectionParameterSetParameter, disabled = true, isSecretField = false) => {
      const parameterValue = connectionParameterValues[key] ?? undefined;
      return {
        type: 'textfield',
        label: parameter.uiDefinition.displayName,
        value: parameterValue ?? '',
        isSecret: isSecretField,
        required: true,
        disabled,
        onChange: (value: string) => setConnectionParameterValues((prev) => ({ ...prev, [key]: value })),
        errorMessage: parameterValue !== undefined && isEmptyString(parameterValue) ? INTL_TEXT.errorText : undefined,
      } as TemplatesSectionItem;
    },
    [INTL_TEXT.errorText, connectionParameterValues]
  );

  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const handleNameChange = useCallback(
    (name: string) => {
      setConnectionParameterValues((prev) => ({ ...prev, displayName: name }));
      setNameError(isEmptyString(name) ? INTL_TEXT.errorText : undefined);
    },
    [INTL_TEXT.errorText]
  );

  const detailsItem: TemplatesSectionItem = useMemo(
    () => ({
      label: INTL_TEXT.displayNameFieldLabel,
      value: connectionParameterValues.displayName ?? '',
      type: 'textfield',
      required: true,
      onChange: handleNameChange,
      errorMessage: nameError,
    }),
    [INTL_TEXT.displayNameFieldLabel, connectionParameterValues.displayName, handleNameChange, nameError]
  );
  const cosmosItems: TemplatesSectionItem[] = useMemo(() => {
    const items = [
      getParameterItem('cosmosDBAuthenticationType', connectionParameters.cosmosDBAuthenticationType),
      getParameterItem('cosmosDBEndpoint', connectionParameters.cosmosDBEndpoint),
    ];

    if (equals(connectionParameterValues['cosmosDBAuthenticationType'], 'key')) {
      items.push(getParameterItem('cosmosDBKey', connectionParameters.cosmosDBKey, /* disabled */ true, /* isSecretField */ true));
    }
    return items;
  }, [getParameterItem, connectionParameters, connectionParameterValues]);
  const openAIItems: TemplatesSectionItem[] = useMemo(() => {
    const items = [
      getParameterItem('openAIAuthenticationType', connectionParameters.openAIAuthenticationType),
      getParameterItem('openAIEndpoint', connectionParameters.openAIEndpoint),
      getParameterItem('openAICompletionsModel', connectionParameters.openAICompletionsModel, /* disabled */ false),
      getParameterItem('openAIEmbeddingsModel', connectionParameters.openAIEmbeddingsModel, /* disabled */ false),
    ];
    if (equals(connectionParameterValues['openAIAuthenticationType'], 'key')) {
      items.splice(2, 0, getParameterItem('openAIKey', connectionParameters.openAIKey, /* disabled */ true, /* isSecretField */ true));
    }
    return items;
  }, [getParameterItem, connectionParameters, connectionParameterValues]);

  const [updateError, setUpdateError] = useState<ServerNotificationData | null>(null);
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setUpdateError(null);
    try {
      await createOrUpdateConnection(connectionParameterValues, /* isCreate */ false);
      dispatch(
        setNotification({
          title: intl.formatMessage({
            defaultMessage: 'Connection updated',
            id: 'QzjaQG',
            description: 'Notification title for successful connection update',
          }),
          content: intl.formatMessage({
            defaultMessage: 'Successfully updated details for knowledge hub connection.',
            id: 'QW+oZz',
            description: 'Notification content for successful connection update',
          }),
        })
      );
      handleDismiss();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setUpdateError({
        title: intl.formatMessage({
          defaultMessage: 'Failed to update connection',
          id: '9mG3yl',
          description: 'Error title when connection update fails',
        }),
        content: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  }, [connectionParameterValues, dispatch, handleDismiss, intl]);

  const footerContent: TemplatePanelFooterProps = useMemo(() => {
    return {
      buttonContents: [
        {
          type: 'action',
          text: isSaving ? INTL_TEXT.savingText : INTL_TEXT.buttonText,
          disabled: isSaving || !isDirty || isLoading,
          appearance: 'primary',
          onClick: handleSave,
        },
        {
          type: 'action',
          text: INTL_TEXT.cancelButton,
          onClick: handleDismiss,
        },
      ],
    };
  }, [isSaving, INTL_TEXT.savingText, INTL_TEXT.buttonText, INTL_TEXT.cancelButton, isDirty, isLoading, handleSave, handleDismiss]);

  return (
    <Drawer
      className={styles.drawer}
      open={isOpen && panelMode === KnowledgePanelView.EditConnection}
      onOpenChange={(_, { open }) => !open && handleDismiss()}
      position="end"
      size="large"
      mountNode={{ element: mountNode }}
    >
      <DrawerHeader className={styles.header}>
        <div className={styles.headerContent}>
          <Text size={600} weight="semibold" style={{ flex: 1 }}>
            {INTL_TEXT.updateTitle}
          </Text>
          <Button appearance="subtle" icon={<CloseIcon />} onClick={handleDismiss} aria-label={INTL_TEXT.closeAriaLabel} />
        </div>
      </DrawerHeader>
      <DrawerBody className={styles.body}>
        {updateError ? (
          <MessageBar intent="error" style={{ marginBottom: 16 }}>
            <MessageBarBody>
              <MessageBarTitle>{updateError.title}</MessageBarTitle>
              {updateError.content}
            </MessageBarBody>
          </MessageBar>
        ) : null}
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <Spinner size="huge" />
            <Text weight="medium" size={500} className={styles.loadingText}>
              {INTL_TEXT.loadingText}
            </Text>
          </div>
        ) : (
          <div>
            <MessageBar intent="info" className={styles.infoBar}>
              {INTL_TEXT.infoText}
            </MessageBar>
            <TemplatesSection title={INTL_TEXT.detailsTitle} items={[detailsItem]} cssOverrides={{ sectionItem: styles.sectionItem }} />
            <TemplatesSection title={INTL_TEXT.cosmosDBTitle} items={cosmosItems} cssOverrides={{ sectionItem: styles.sectionItem }} />
            <TemplatesSection title={INTL_TEXT.openAITitle} items={openAIItems} cssOverrides={{ sectionItem: styles.sectionItem }} />
          </div>
        )}
      </DrawerBody>
      <DrawerFooter className={styles.footer}>
        <TemplatesPanelFooter {...footerContent} />
      </DrawerFooter>
    </Drawer>
  );
};

const hasValuesChanged = (currentValues: Record<string, any>, initialValues: Record<string, any>) => {
  for (const key of Object.keys(initialValues)) {
    const currentValue = currentValues[key] ?? '';
    const initialValue = initialValues[key] ?? '';
    if (!equals(currentValue, initialValue)) {
      return true;
    }
  }

  return false;
};
