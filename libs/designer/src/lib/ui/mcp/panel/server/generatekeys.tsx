import {
  Button,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Text,
} from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { closePanel } from '../../../../core/state/mcp/panel/mcpPanelSlice';
import type { AppDispatch, RootState } from '../../../../core/state/mcp/store';
import { useDispatch, useSelector } from 'react-redux';
import { useMcpPanelStyles, useMcpServerPanelStyles } from '../styles';
import { useIntl } from 'react-intl';
import { useCallback, useMemo, useState } from 'react';
import { type TemplatePanelFooterProps, TemplatesPanelFooter, TemplatesSection, type TemplatesSectionItem } from '@microsoft/designer-ui';
import { generateKeys } from '../../../../core/mcp/utils/server';
import { getStandardLogicAppId } from '../../../../core/configuretemplate/utils/helper';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export const GenerateKeys = () => {
  const styles = { ...useMcpPanelStyles(), ...useMcpServerPanelStyles() };
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const { subscriptionId, resourceGroup, logicAppName } = useSelector((state: RootState) => ({
    subscriptionId: state.resource.subscriptionId,
    resourceGroup: state.resource.resourceGroup,
    logicAppName: state.resource.logicAppName,
  }));
  const logicAppId = useMemo(
    () => getStandardLogicAppId(subscriptionId, resourceGroup, logicAppName ?? ''),
    [subscriptionId, resourceGroup, logicAppName]
  );

  const INTL_TEXT = {
    title: intl.formatMessage({
      defaultMessage: 'Generate MCP API key',
      id: '3DEbi3',
      description: 'Title for the MCP generate keys panel',
    }),
    closeAriaLabel: intl.formatMessage({
      defaultMessage: 'Close',
      id: 'wgikZJ',
      description: 'Aria label for closing the MCP generate keys panel',
    }),
    detailsTitle: intl.formatMessage({
      defaultMessage: 'Key access duration',
      id: 'AfJvdR',
      description: 'Title for the MCP generate keys details section',
    }),
    detailsDescription: intl.formatMessage({
      defaultMessage:
        'Set how long this key should be valid. This key will be shown only once and cannot be retrieved later. The key is not stored on Azure, save it securely. You will need to regenerate the key if lost.',
      id: 'Vfa/1M',
      description: 'Description for the MCP generate keys section',
    }),
    resultTitle: intl.formatMessage({
      defaultMessage: 'MCP API key',
      id: 'Jx88eq',
      description: 'Title for the MCP Server workflows section',
    }),
    resultDescription: intl.formatMessage({
      defaultMessage:
        'Save MCP API key information in a secure location, it will not be available later. The old API keys will still work based on their expiration date. If access keys are regenerated that would invalidate all access keys.',
      id: 'XOMMsL',
      description: 'Description for the MCP Server workflows section',
    }),
    learnMoreLinkText: intl.formatMessage({
      defaultMessage: 'Learn more',
      id: 'm0e5px',
      description: 'Link text for learn more',
    }),
    infoTitle: intl.formatMessage({
      defaultMessage: 'Key generated successfully.',
      id: 'oDa/YD',
      description: 'Info message title about key generation',
    }),
    infoMessage: intl.formatMessage({
      defaultMessage: 'Copy and save this key. It wont be displayed again.',
      id: 'nK7yfo',
      description: 'Info message about key generation',
    }),
    durationLabel: intl.formatMessage({
      defaultMessage: 'Duration (days)',
      id: '6DsS1M',
      description: 'Label for the key duration input field',
    }),
    accessKeyLabel: intl.formatMessage({
      defaultMessage: 'Access Key',
      id: '7vrHE/',
      description: 'Label for the access key',
    }),
    accessKeyInfoText: intl.formatMessage({
      defaultMessage: 'Select the access key you want to generate your keys from',
      id: 'dxNeLe',
      description: 'Info text for access key selection',
    }),
    hoursText: intl.formatMessage({
      defaultMessage: 'hours',
      id: 'x74tKg',
      description: 'Text for hours',
    }),
    daysText: intl.formatMessage({
      defaultMessage: 'days',
      id: 'j7HEKm',
      description: 'Text for days',
    }),
    neverExpiresText: intl.formatMessage({
      defaultMessage: 'Never expires',
      id: 'crvmH2',
      description: 'Text for never expires',
    }),
    primaryKeyText: intl.formatMessage({
      defaultMessage: 'Primary key',
      id: 'HOwcCC',
      description: 'Text for primary access key',
    }),
    secondaryKeyText: intl.formatMessage({
      defaultMessage: 'Secondary key',
      id: 'T7aD3v',
      description: 'Text for secondary access key',
    }),
    apiKeyLabel: intl.formatMessage({
      defaultMessage: 'API key',
      id: 'duhwio',
      description: 'Label for the API key',
    }),
    generatedLabel: intl.formatMessage({
      defaultMessage: 'Generated',
      id: 'VTcDce',
      description: 'Label for the generated key',
    }),
    expiresLabel: intl.formatMessage({
      defaultMessage: 'Expires',
      id: 'GxdV2y',
      description: 'Label for the key expiration',
    }),
    generateButtonText: intl.formatMessage({
      defaultMessage: 'Generate',
      id: 'EOx5fA',
      description: 'Button text for creating the MCP Server',
    }),
    closeButtonText: intl.formatMessage({
      defaultMessage: 'Close',
      id: '8cgUrz',
      description: 'Button text for closing MCP Server creation',
    }),
  };
  const durationOptions = useMemo(() => {
    return [
      { id: '1', label: `24 ${INTL_TEXT.hoursText}`, value: '1' },
      { id: '2', label: `7 ${INTL_TEXT.daysText}`, value: '2' },
      { id: '3', label: `30 ${INTL_TEXT.daysText}`, value: '3' },
      { id: '4', label: `90 ${INTL_TEXT.daysText}`, value: '4' },
      { id: '5', label: INTL_TEXT.neverExpiresText, value: '5' },
    ];
  }, [INTL_TEXT.daysText, INTL_TEXT.hoursText, INTL_TEXT.neverExpiresText]);
  const keysOptions = useMemo(() => {
    return [
      { id: 'primary', label: INTL_TEXT.primaryKeyText, value: 'primary' },
      { id: 'secondary', label: INTL_TEXT.secondaryKeyText, value: 'secondary' },
    ];
  }, [INTL_TEXT.primaryKeyText, INTL_TEXT.secondaryKeyText]);

  const [duration, setDuration] = useState('1');
  const [accessKey, setAccessKey] = useState('primary');

  const [generatedKey, setGeneratedKey] = useState<string | undefined>(undefined);
  const [generatedTime, setGeneratedTime] = useState<string | undefined>(undefined);
  const [expiresTime, setExpiresTime] = useState<string | undefined>(undefined);
  const [showSuccessInfo, setShowSuccessInfo] = useState<boolean>(false);

  const keySectionItems: TemplatesSectionItem[] = useMemo(() => {
    return [
      {
        label: INTL_TEXT.durationLabel,
        value: duration ? durationOptions.find((option) => option.value === duration)?.label : undefined,
        type: 'dropdown',
        required: true,
        options: durationOptions,
        controlled: true,
        selectedOptions: duration ? [duration] : [],
        onOptionSelect: (options) => setDuration(options[0]),
      },
      {
        label: INTL_TEXT.accessKeyLabel,
        value: accessKey ? keysOptions.find((option) => option.value === accessKey)?.label : undefined,
        description: INTL_TEXT.accessKeyInfoText,
        type: 'dropdown',
        required: true,
        options: keysOptions,
        controlled: true,
        selectedOptions: accessKey ? [accessKey] : [],
        onOptionSelect: (options) => setAccessKey(options[0]),
      },
    ];
  }, [INTL_TEXT.durationLabel, INTL_TEXT.accessKeyLabel, INTL_TEXT.accessKeyInfoText, duration, durationOptions, accessKey, keysOptions]);

  const generatedSectionItems: TemplatesSectionItem[] = useMemo(() => {
    return [
      {
        label: INTL_TEXT.apiKeyLabel,
        value: generatedKey,
        type: 'text',
      },
      {
        label: INTL_TEXT.generatedLabel,
        value: generatedTime,
        type: 'text',
      },
      {
        label: INTL_TEXT.expiresLabel,
        value: expiresTime,
        type: 'text',
      },
    ];
  }, [INTL_TEXT.apiKeyLabel, INTL_TEXT.generatedLabel, INTL_TEXT.expiresLabel, generatedKey, generatedTime, expiresTime]);

  const handleGenerate = useCallback(async () => {
    const { key, generatedTime, expiresTime } = await generateKeys(logicAppId, duration, accessKey);
    setGeneratedKey(key);
    setGeneratedTime(generatedTime);
    setExpiresTime(expiresTime);
    setShowSuccessInfo(true);
  }, [logicAppId, duration, accessKey]);

  const handleClose = useCallback(() => {
    dispatch(closePanel());
  }, [dispatch]);

  const renderInfoBar = useCallback(() => {
    return (
      <div style={{ padding: '15px 0 0px 0' }}>
        <MessageBar intent={'success'}>
          <MessageBarBody>
            <MessageBarTitle>{INTL_TEXT.infoTitle}</MessageBarTitle>
            {INTL_TEXT.infoMessage}
          </MessageBarBody>
        </MessageBar>
      </div>
    );
  }, [INTL_TEXT.infoTitle, INTL_TEXT.infoMessage]);

  const footerContent: TemplatePanelFooterProps = useMemo(() => {
    return {
      buttonContents: [
        {
          type: 'action',
          text: INTL_TEXT.generateButtonText,
          appearance: 'primary',
          onClick: handleGenerate,
          disabled: !duration || !accessKey,
        },
        {
          type: 'action',
          text: INTL_TEXT.closeButtonText,
          onClick: handleClose,
        },
      ],
    };
  }, [INTL_TEXT.generateButtonText, INTL_TEXT.closeButtonText, handleGenerate, duration, accessKey, handleClose]);

  return (
    <Drawer
      className={styles.drawer}
      open={true}
      onOpenChange={(_, { open }) => !open && handleClose()}
      position="end"
      style={{ width: '650px' }}
    >
      <DrawerHeader className={styles.header}>
        <div className={styles.headerContent}>
          <Text size={600} weight="semibold" style={{ flex: 1 }}>
            {INTL_TEXT.title}
          </Text>
          <Button appearance="subtle" icon={<CloseIcon />} onClick={handleClose} aria-label={INTL_TEXT.closeAriaLabel} />
        </div>
      </DrawerHeader>
      <DrawerBody className={styles.body}>
        <TemplatesSection
          cssOverrides={{ sectionItems: styles.workflowSection }}
          title={INTL_TEXT.detailsTitle}
          description={INTL_TEXT.detailsDescription}
          descriptionLink={{
            text: INTL_TEXT.learnMoreLinkText,
            href: 'https://learn.microsoft.com/en-us/azure/logic-apps/microsoft-cloud-platform/mcp-overview',
          }}
          items={keySectionItems}
        />
        {showSuccessInfo ? (
          <TemplatesSection
            cssOverrides={{ sectionItems: styles.workflowSection }}
            title={INTL_TEXT.resultTitle}
            description={INTL_TEXT.resultDescription}
            descriptionLink={{
              text: INTL_TEXT.learnMoreLinkText,
              href: 'https://learn.microsoft.com/en-us/azure/logic-apps/microsoft-cloud-platform/mcp-overview',
            }}
            items={generatedSectionItems}
            onRenderInfoBar={renderInfoBar}
          />
        ) : null}
      </DrawerBody>
      <DrawerFooter className={styles.footer}>
        <TemplatesPanelFooter {...footerContent} />
      </DrawerFooter>
    </Drawer>
  );
};
