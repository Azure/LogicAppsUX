import { TemplatesSection, type TemplatesSectionItem } from '@microsoft/designer-ui';

import { Button, Dropdown, Option, Link, Text } from '@fluentui/react-components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowClockwise20Regular, Edit20Regular, Open16Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { useMcpAuthentication } from '../../../core/mcp/utils/queries';
import { updateAuthSettings } from '../../../core/mcp/utils/server';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../core/state/mcp/store';
import { openMcpPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';
import { DescriptionWithLink } from '../../configuretemplate/common';
import { useMcpServerStyles } from './styles';

export type ToolHandler = (tool: string) => void;

export const Authentication = ({
  resourceId,
  onOpenManageOAuth,
}: {
  resourceId: string;
  onOpenManageOAuth: () => void;
}) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const styles = useMcpServerStyles();

  const INTL_TEXT = {
    title: intl.formatMessage({
      defaultMessage: 'Authentication',
      id: 'QctOyt',
      description: 'Title for the authentication section',
    }),
    description: intl.formatMessage({
      defaultMessage: 'Manage your authentication for the MCP servers here.',
      id: 'qXBuPL',
      description: 'Description for the authentication section',
    }),
    methodLabel: intl.formatMessage({
      defaultMessage: 'Method',
      id: 'F9yRDC',
      description: 'Label for the authentication method',
    }),
    accessKeysLabel: intl.formatMessage({
      defaultMessage: 'Access keys',
      id: 'KsoxUQ',
      description: 'Label for the access keys',
    }),
    manageKeysLinkText: intl.formatMessage({
      defaultMessage: 'Manage keys',
      id: 'oaH1fi',
      description: 'Link text for managing access keys',
    }),
    manageOAuthLinkText: intl.formatMessage({
      defaultMessage: 'Manage authentication',
      id: 'vCyKJZ',
      description: 'Link text for managing OAuth settings',
    }),
    apiKeysLabel: intl.formatMessage({
      defaultMessage: 'API keys',
      id: 'DabKOm',
      description: 'Label for the API keys',
    }),
    generateKeyButtonText: intl.formatMessage({
      defaultMessage: 'Generate key',
      id: 'YZiW9F',
      description: 'Button text for generating a new API key',
    }),
  };

  const [authType, setAuthType] = useState<string>('');
  const handleGenerateKey = useCallback(() => {
    dispatch(openMcpPanelView({ panelView: 'generateKeys' }));
  }, [dispatch]);

  const items: TemplatesSectionItem[] = useMemo(() => {
    const apiKeysItem = {
      label: INTL_TEXT.apiKeysLabel,
      type: 'custom' as const,
      value: undefined,
      onRenderItem: () => (
        <Button style={{ width: '140px' }} appearance="secondary" icon={<ArrowClockwise20Regular />} onClick={handleGenerateKey}>
          {INTL_TEXT.generateKeyButtonText}
        </Button>
      ),
    };
    const oAuthItem = {
      label: INTL_TEXT.title,
      type: 'custom' as const,
      value: undefined,
      onRenderItem: () => (
        <Link onClick={onOpenManageOAuth}>
          {INTL_TEXT.manageOAuthLinkText}
          <Open16Regular style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
        </Link>
      ),
    };

    const result: TemplatesSectionItem[] = [
      {
        label: INTL_TEXT.methodLabel,
        type: 'custom' as const,
        value: undefined,
        onRenderItem: () => <AuthenticationSettings resourceId={resourceId} setAuthType={setAuthType} />,
      },
    ];

    if (authType === 'apikey' || authType === 'both') {
      result.push(apiKeysItem);
    }

    if (authType === 'oauth2' || authType === 'both') {
      result.push(oAuthItem);
    }

    return result;
  }, [
    INTL_TEXT.apiKeysLabel,
    INTL_TEXT.generateKeyButtonText,
    INTL_TEXT.manageOAuthLinkText,
    INTL_TEXT.methodLabel,
    INTL_TEXT.title,
    authType,
    handleGenerateKey,
    onOpenManageOAuth,
    resourceId,
  ]);

  return (
    <div>
      <div className={styles.sectionHeader}>
        <Text size={400} weight="bold">
          {INTL_TEXT.title}
        </Text>
      </div>
      <DescriptionWithLink text={INTL_TEXT.description} />
      <TemplatesSection items={items} />
    </div>
  );
};

const AuthenticationSettings = ({ resourceId, setAuthType }: { resourceId: string; setAuthType: (authType: string) => void }) => {
  const intl = useIntl();
  const { data: selectedAuth, isLoading } = useMcpAuthentication(resourceId);
  const INTL_TEXT = {
    keyBasedMethod: intl.formatMessage({
      defaultMessage: 'Key-based',
      id: '+QFwA1',
      description: 'Label for key-based authentication method',
    }),
    oAuthMethod: intl.formatMessage({
      defaultMessage: 'OAuth',
      id: 'chrfEn',
      description: 'Label for OAuth authentication method',
    }),
    keyAndOAuthMethod: intl.formatMessage({
      defaultMessage: 'Key-based and OAuth',
      id: 'IuTkQS',
      description: 'Label for key and OAuth authentication method',
    }),
    anonymous: intl.formatMessage({
      defaultMessage: 'Anonymous',
      id: 'NQJ/jV',
      description: 'Label for anonymous authentication method',
    }),
    editButtonText: intl.formatMessage({
      defaultMessage: 'Edit',
      id: 'BYe/Dw',
      description: 'Button text for editing authentication settings',
    }),
    saveButtonText: intl.formatMessage({
      defaultMessage: 'Save',
      id: 'jk2rY+',
      description: 'Button text for saving authentication settings',
    }),
    savingButtonText: intl.formatMessage({
      defaultMessage: 'Saving...',
      id: 'oJebOR',
      description: 'Button text displayed while saving authentication settings',
    }),
    cancelButtonText: intl.formatMessage({
      defaultMessage: 'Cancel',
      id: 'XIUFQz',
      description: 'Button text for cancelling changes to authentication settings',
    }),
  };

  const authOptions = useMemo(() => {
    const options = [
      { label: INTL_TEXT.keyBasedMethod, value: 'apikey', id: '0' },
      { label: INTL_TEXT.oAuthMethod, value: 'oauth2', id: '1' },
    ];

    if (selectedAuth === 'anonymous') {
      options.push({ label: INTL_TEXT.anonymous, value: 'anonymous', id: '2' });
    }

    return options;
  }, [INTL_TEXT.keyBasedMethod, INTL_TEXT.oAuthMethod, INTL_TEXT.anonymous, selectedAuth]);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isInvalidAuth, setIsInvalidAuth] = useState<boolean>(false);

  const authValue = useMemo(() => {
    return selectedOptions.length === 0
      ? ''
      : selectedOptions.length === 1
        ? authOptions.find((option) => option.value === selectedOptions[0])?.label
        : INTL_TEXT.keyAndOAuthMethod;
  }, [selectedOptions, authOptions, INTL_TEXT.keyAndOAuthMethod]);
  const hasAuthChanged = useMemo(() => {
    const newAuth = getAuthType(selectedOptions);
    return newAuth !== selectedAuth;
  }, [selectedAuth, selectedOptions]);

  const getOptionsFromAuth = useCallback(
    (auth: string): string[] => (auth === 'both' ? ['apikey', 'oauth2'] : auth === '' ? [] : [auth]),
    []
  );
  const enterEditing = useCallback(() => setIsEditing(true), []);
  const exitEditing = useCallback(() => setIsEditing(false), []);
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    if (hasAuthChanged) {
      await updateAuthSettings(resourceId, selectedOptions);
      setAuthType(getAuthType(selectedOptions));
    }

    setIsSaving(false);
    exitEditing();
  }, [exitEditing, hasAuthChanged, resourceId, selectedOptions, setAuthType]);
  const handleCancel = useCallback(() => {
    const options = getOptionsFromAuth(selectedAuth as string);
    setSelectedOptions(options);
    setIsInvalidAuth(false);
    exitEditing();
  }, [getOptionsFromAuth, selectedAuth, exitEditing]);

  useEffect(() => {
    if (selectedAuth !== undefined && !isLoading) {
      const options = getOptionsFromAuth(selectedAuth);
      setSelectedOptions(options);
      setAuthType(getAuthType(options));
    }
  }, [selectedAuth, isLoading, setAuthType, INTL_TEXT.anonymous, getOptionsFromAuth]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <Dropdown
        style={isEditing ? undefined : { pointerEvents: 'none', backgroundColor: '#FFFF', color: '#000' }}
        disabled={!isEditing || isSaving}
        multiselect={true}
        selectedOptions={selectedOptions}
        value={authValue}
        onOptionSelect={(_, data) => {
          const options = data.selectedOptions;
          if (options.length === 0 && !isInvalidAuth) {
            setIsInvalidAuth(true);
          } else if (isInvalidAuth) {
            setIsInvalidAuth(false);
          }

          const optionsToSet =
            options.length > 1 && options.includes('anonymous') ? options.filter((option) => option !== 'anonymous') : options;
          setSelectedOptions(optionsToSet);
        }}
      >
        {authOptions.map((option) => (
          <Option key={option.id} value={option.value}>
            {option.label}
          </Option>
        ))}
      </Dropdown>
      {isEditing ? (
        <>
          <Button appearance="primary" onClick={handleSave} disabled={isInvalidAuth || isSaving || !hasAuthChanged}>
            {isSaving ? INTL_TEXT.savingButtonText : INTL_TEXT.saveButtonText}
          </Button>
          <Button onClick={handleCancel}>{INTL_TEXT.cancelButtonText}</Button>
        </>
      ) : (
        <Button appearance="subtle" icon={<Edit20Regular />} onClick={enterEditing}>
          {INTL_TEXT.editButtonText}
        </Button>
      )}
    </div>
  );
};

const getAuthType = (selectedOptions: string[]): string => {
  if (selectedOptions.length === 1) {
    return selectedOptions[0];
  }

  if (selectedOptions.length === 2) {
    return 'both';
  }

  return '';
};
