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

    if (authType === '1' || authType === '3') {
      result.push(apiKeysItem);
    }

    if (authType === '2' || authType === '3') {
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
    cancelButtonText: intl.formatMessage({
      defaultMessage: 'Cancel',
      id: 'XIUFQz',
      description: 'Button text for cancelling changes to authentication settings',
    }),
  };
  const authOptions = useMemo(
    () => [
      { label: INTL_TEXT.keyBasedMethod, value: 'keybased', id: '0' },
      { label: INTL_TEXT.oAuthMethod, value: 'oauth', id: '1' },
    ],
    [INTL_TEXT.keyBasedMethod, INTL_TEXT.oAuthMethod]
  );

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isInvalidAuth, setIsInvalidAuth] = useState<boolean>(false);

  useEffect(() => {
    if (selectedAuth && !isLoading) {
      if (selectedAuth.isAuthenticated) {
        setAuthType('2');
        setSelectedOptions(['oauth']);
      } else {
        setAuthType('1');
        setSelectedOptions(['keybased']);
      }
    }
  }, [selectedAuth, isLoading, setAuthType]);

  const authValue = useMemo(() => {
    return selectedOptions.length === 0
      ? ''
      : selectedOptions.length === 1
        ? authOptions.find((option) => option.value === selectedOptions[0])?.label
        : INTL_TEXT.keyAndOAuthMethod;
  }, [selectedOptions, authOptions, INTL_TEXT.keyAndOAuthMethod]);

  const enterEditing = useCallback(() => setIsEditing(true), []);
  const exitEditing = useCallback(() => setIsEditing(false), []);
  const handleSave = useCallback(async () => {
    await updateAuthSettings(resourceId, selectedOptions);
    setAuthType(selectedOptions.length === 1 ? (selectedOptions[0] === 'keybased' ? '1' : '2') : '3');
    exitEditing();
  }, [exitEditing, resourceId, selectedOptions, setAuthType]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <Dropdown
        style={isEditing ? undefined : { pointerEvents: 'none', backgroundColor: '#FFFF', color: '#000' }}
        disabled={!isEditing}
        multiselect={true}
        selectedOptions={selectedOptions}
        value={authValue}
        onOptionSelect={(_, data) => {
          if (data.selectedOptions.length === 0 && !isInvalidAuth) {
            setIsInvalidAuth(true);
          } else if (isInvalidAuth) {
            setIsInvalidAuth(false);
          }

          setSelectedOptions(data.selectedOptions);
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
          <Button appearance="primary" onClick={handleSave} disabled={isInvalidAuth}>
            {INTL_TEXT.saveButtonText}
          </Button>
          <Button onClick={exitEditing}>{INTL_TEXT.cancelButtonText}</Button>
        </>
      ) : (
        <Button appearance="subtle" icon={<Edit20Regular />} onClick={enterEditing}>
          {INTL_TEXT.editButtonText}
        </Button>
      )}
    </div>
  );
};
