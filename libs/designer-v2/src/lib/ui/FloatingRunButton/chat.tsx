import { useIntl } from 'react-intl';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Field,
  Input,
  Link,
  Skeleton,
  SkeletonItem,
  Spinner,
  SplitButton,
  Tab,
  TabList,
  Text,
  tokens,
  Tooltip,
} from '@fluentui/react-components';
import type { ButtonProps } from '@fluentui/react-components';
import { WorkflowService } from '@microsoft/logic-apps-shared';
import type { AgentURL } from '@microsoft/logic-apps-shared';
import {
  ArrowClockwise24Filled,
  ArrowClockwise24Regular,
  bundleIcon,
  Chat24Filled,
  Chat24Regular,
  Copy24Filled,
  Copy24Regular,
  Dismiss24Filled,
  Dismiss24Regular,
  Info24Filled,
  Info24Regular,
} from '@fluentui/react-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const ChatIcon = bundleIcon(Chat24Filled, Chat24Regular);
const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);
const InfoIcon = bundleIcon(Info24Filled, Info24Regular);
const CopyIcon = bundleIcon(Copy24Filled, Copy24Regular);
const RefreshIcon = bundleIcon(ArrowClockwise24Filled, ArrowClockwise24Regular);

// Child Components
interface ChatAvailabilitySectionProps {
  intlText: {
    INFO_DIALOG_DEVELOPMENT: string;
    INFO_DIALOG_DEVELOPMENT_DESC: string;
    INFO_DIALOG_PRODUCTION: string;
    INFO_DIALOG_PRODUCTION_DESC: string;
    INFO_DIALOG_SETUP: string;
    INFO_DIALOG_SETUP_DESC: string;
    INFO_DIALOG_LEARN_MORE: string;
  };
}

const ChatAvailabilitySection = ({ intlText }: ChatAvailabilitySectionProps) => {
  return (
    <>
      <div>
        <Text weight="semibold" as="h4" block style={{ marginBottom: tokens.spacingVerticalXS }}>
          {intlText.INFO_DIALOG_DEVELOPMENT}
        </Text>
        <Text as="p" block>
          {intlText.INFO_DIALOG_DEVELOPMENT_DESC}
        </Text>
      </div>

      <div>
        <Text weight="semibold" as="h4" block style={{ marginBottom: tokens.spacingVerticalXS }}>
          {intlText.INFO_DIALOG_PRODUCTION}
        </Text>
        <Text as="p" block>
          {intlText.INFO_DIALOG_PRODUCTION_DESC}
        </Text>
      </div>

      <div>
        <Text weight="semibold" as="h4" block style={{ marginBottom: tokens.spacingVerticalXS }}>
          {intlText.INFO_DIALOG_SETUP}
        </Text>
        <Text as="p" block>
          {intlText.INFO_DIALOG_SETUP_DESC}{' '}
          <Link
            href="https://azure.github.io/logicapps-labs/docs/logicapps-ai-course/build_conversational_agents/add-user-context-to-tools"
            target="_blank"
            rel="noopener noreferrer"
          >
            {intlText.INFO_DIALOG_LEARN_MORE}
          </Link>
        </Text>
      </div>
    </>
  );
};

interface CredentialFieldProps {
  label: string;
  value: string;
  isCopied: boolean;
  onCopy: () => void;
  copyButtonText: string;
  copiedButtonText: string;
  isPassword?: boolean;
}

const CredentialField = ({ label, value, isCopied, onCopy, copyButtonText, copiedButtonText, isPassword }: CredentialFieldProps) => {
  return (
    <Field label={label}>
      <div style={{ display: 'flex', gap: tokens.spacingHorizontalS }}>
        <Input value={value} readOnly type={isPassword ? 'password' : 'text'} style={{ flex: 1 }} />
        <Button icon={<CopyIcon />} onClick={onCopy} disabled={!value}>
          {isCopied ? copiedButtonText : copyButtonText}
        </Button>
      </div>
    </Field>
  );
};

interface ConnectToAgentSectionProps {
  intlText: {
    INFO_DIALOG_OPTION1_TITLE: string;
    INFO_DIALOG_OPTION1_DESC: string;
    INFO_DIALOG_AGENT_URL_LABEL: string;
    INFO_DIALOG_API_KEY_LABEL: string;
    INFO_DIALOG_COPY_BUTTON: string;
    INFO_DIALOG_COPIED_BUTTON: string;
    INFO_DIALOG_OPTION2_TITLE: string;
    INFO_DIALOG_OPTION2_DESC_WITH_AUTH: string;
    INFO_DIALOG_OPTION2_DESC_NO_AUTH: string;
    INFO_DIALOG_OPEN_CHAT: string;
    INFO_DIALOG_AUTH_SETTINGS: string;
    INFO_DIALOG_REFRESH_BUTTON: string;
  };
  agentUrl: string;
  apiKey: string;
  copiedAgentUrl: boolean;
  copiedApiKey: boolean;
  onCopyAgentUrl: () => void;
  onCopyApiKey: () => void;
  onConfigureAuth: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  authenticationEnabled?: boolean;
  chatUrl?: string;
  siteResourceId?: string;
}

const ConnectToAgentSection = ({
  intlText,
  agentUrl,
  apiKey,
  copiedAgentUrl,
  copiedApiKey,
  onCopyAgentUrl,
  onCopyApiKey,
  onConfigureAuth,
  onRefresh,
  isRefreshing,
  authenticationEnabled,
  chatUrl,
}: ConnectToAgentSectionProps) => {
  return (
    <>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacingVerticalXS }}>
          <Text weight="semibold" as="h4">
            {intlText.INFO_DIALOG_OPTION1_TITLE}
          </Text>
          <Button appearance="subtle" size="small" icon={<RefreshIcon />} onClick={onRefresh} disabled={isRefreshing}>
            {intlText.INFO_DIALOG_REFRESH_BUTTON}
          </Button>
        </div>
        <Text as="p" block style={{ marginBottom: tokens.spacingVerticalM }}>
          {intlText.INFO_DIALOG_OPTION1_DESC}
        </Text>

        {isRefreshing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS }}>
            <Skeleton>
              <SkeletonItem style={{ height: '56px', width: '100%' }} />
            </Skeleton>
            <Skeleton>
              <SkeletonItem style={{ height: '56px', width: '100%' }} />
            </Skeleton>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS }}>
            <CredentialField
              label={intlText.INFO_DIALOG_AGENT_URL_LABEL}
              value={agentUrl}
              isCopied={copiedAgentUrl}
              onCopy={onCopyAgentUrl}
              copyButtonText={intlText.INFO_DIALOG_COPY_BUTTON}
              copiedButtonText={intlText.INFO_DIALOG_COPIED_BUTTON}
            />

            <CredentialField
              label={intlText.INFO_DIALOG_API_KEY_LABEL}
              value={apiKey}
              isCopied={copiedApiKey}
              onCopy={onCopyApiKey}
              copyButtonText={intlText.INFO_DIALOG_COPY_BUTTON}
              copiedButtonText={intlText.INFO_DIALOG_COPIED_BUTTON}
              isPassword
            />
          </div>
        )}
      </div>

      <div>
        <Text weight="semibold" as="h4" block style={{ marginBottom: tokens.spacingVerticalXS }}>
          {intlText.INFO_DIALOG_OPTION2_TITLE}
        </Text>
        <Text as="p" block>
          {authenticationEnabled ? intlText.INFO_DIALOG_OPTION2_DESC_WITH_AUTH : intlText.INFO_DIALOG_OPTION2_DESC_NO_AUTH}{' '}
          {authenticationEnabled ? (
            <Link href={chatUrl} target="_blank" rel="noopener noreferrer">
              {intlText.INFO_DIALOG_OPEN_CHAT}
            </Link>
          ) : (
            <Link onClick={onConfigureAuth} style={{ cursor: 'pointer' }}>
              {intlText.INFO_DIALOG_AUTH_SETTINGS}
            </Link>
          )}
        </Text>
      </div>
    </>
  );
};

interface SectionTabsProps {
  activeSection: 'connect' | 'availability';
  onSectionChange: (section: 'connect' | 'availability') => void;
  intlText: {
    INFO_SECTION_CONNECT: string;
    INFO_SECTION_AVAILABILITY: string;
  };
}

const SectionTabs = ({ activeSection, onSectionChange, intlText }: SectionTabsProps) => {
  return (
    <TabList
      selectedValue={activeSection}
      onTabSelect={(_, data) => onSectionChange(data.value as 'connect' | 'availability')}
      style={{ marginBottom: tokens.spacingVerticalS }}
    >
      <Tab value="connect">{intlText.INFO_SECTION_CONNECT}</Tab>
      <Tab value="availability">{intlText.INFO_SECTION_AVAILABILITY}</Tab>
    </TabList>
  );
};

export const useAgentUrl = (props: { isDraftMode?: boolean }): UseQueryResult<AgentURL> => {
  return useQuery(
    ['agentUrl', props.isDraftMode],
    async () => {
      return WorkflowService().getAgentUrl?.(props.isDraftMode);
    },
    {
      cacheTime: 1000 * 60 * 60 * 24,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );
};

export type ChatButtonProps = ButtonProps & {
  isDarkMode: boolean;
  isDraftMode?: boolean;
  siteResourceId?: string;
  workflowName?: string;
  tooltipText?: string;
  saveWorkflow: () => Promise<void>;
};

export const ChatButton = (props: ChatButtonProps) => {
  const intl = useIntl();
  const { isDarkMode, isDraftMode, saveWorkflow, tooltipText: clientStateTooltipText, ...buttonProps } = props;
  const { isLoading, data, refetch, isFetching } = useAgentUrl({ isDraftMode });
  const [isSaving, setIsSaving] = useState(false);
  const [onDialogOpen, setOnDialogOpen] = useState(false);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [copiedAgentUrl, setCopiedAgentUrl] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const [activeSection, setActiveSection] = useState<'connect' | 'availability'>('connect');
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const agentUrlTimerRef = useRef<NodeJS.Timeout | null>(null);
  const apiKeyTimerRef = useRef<NodeJS.Timeout | null>(null);

  const agentChatUrl = useMemo(() => data?.chatUrl, [data?.chatUrl]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (agentUrlTimerRef.current) {
        clearTimeout(agentUrlTimerRef.current);
      }
      if (apiKeyTimerRef.current) {
        clearTimeout(apiKeyTimerRef.current);
      }
    };
  }, []);

  const IntlText = useMemo(
    () => ({
      CHAT_TEXT: intl.formatMessage({
        defaultMessage: 'Chat',
        id: '9VbsXx',
        description: 'Chat button text',
      }),
      LOADING: intl.formatMessage({
        defaultMessage: 'Loading',
        id: 'WgJsL1',
        description: 'Loading text',
      }),
      TITLE: intl.formatMessage({
        defaultMessage: 'Agent chat',
        id: 'Xj/wPS',
        description: 'Agent chat title',
      }),
      DEFAULT_TOOLTIP: intl.formatMessage({
        defaultMessage: 'Click here to chat with your workflow',
        id: 'sBGZCI',
        description: 'Tooltip for chat button',
      }),
      CHAT_IN_AUTHENTICATION_DRAFT: intl.formatMessage(
        {
          defaultMessage:
            'Embedded chat is unavailable with authentication enabled. Publish to access the chat client and click to open in new tab: {url}',
          id: '3MaYXN',
          description: 'Tooltip for chat button',
        },
        {
          url: agentChatUrl,
        }
      ),
      CHAT_IN_AUTHENTICATION_PROD: intl.formatMessage(
        {
          defaultMessage: 'Embedded chat is unavailable with authentication enabled. Click to open in new tab: {url}',
          id: '7rokiZ',
          description: 'Tooltip for chat button',
        },
        {
          url: agentChatUrl,
        }
      ),
      INFO_TOOLTIP: intl.formatMessage({
        defaultMessage: 'Chat availability information',
        id: 'a1fbm6',
        description: 'Tooltip for info button',
      }),
      INFO_DIALOG_TITLE: intl.formatMessage({
        defaultMessage: 'Chat availability: Development vs Production',
        id: 'FiSFtL',
        description: 'Title for chat info dialog',
      }),
      INFO_DIALOG_DEVELOPMENT: intl.formatMessage({
        defaultMessage: 'Development & Testing',
        id: '2p9WPX',
        description: 'Development section header in info dialog',
      }),
      INFO_DIALOG_DEVELOPMENT_DESC: intl.formatMessage({
        defaultMessage:
          'In-portal chat is available for testing and development purposes. This allows you to test your conversational workflows before deploying to production.',
        id: 'qIT2h2',
        description: 'Development section description in info dialog',
      }),
      INFO_DIALOG_PRODUCTION: intl.formatMessage({
        defaultMessage: 'Production',
        id: 'uG+CHc',
        description: 'Production section header in info dialog',
      }),
      INFO_DIALOG_PRODUCTION_DESC: intl.formatMessage({
        defaultMessage:
          'Chat is only available in production when authentication is enabled on the app. This ensures secure access to your workflow.',
        id: '8lZGy+',
        description: 'Production section description in info dialog',
      }),
      INFO_DIALOG_SETUP: intl.formatMessage({
        defaultMessage: 'Setting up authentication',
        id: 'PAkWmu',
        description: 'Setup section header in info dialog',
      }),
      INFO_DIALOG_SETUP_DESC: intl.formatMessage({
        defaultMessage: 'To enable authentication for production use, follow the authentication setup guide.',
        id: 'ukB9Bs',
        description: 'Setup section description in info dialog',
      }),
      INFO_DIALOG_LEARN_MORE: intl.formatMessage({
        defaultMessage: 'Learn more about authentication setup',
        id: 'DvKGRc',
        description: 'Link text for authentication setup guide',
      }),
      INFO_DIALOG_CONNECTING: intl.formatMessage({
        defaultMessage: 'Connecting to Agent',
        id: 'DserLU',
        description: 'Connecting to agent section header in info dialog',
      }),
      INFO_DIALOG_OPTION1_TITLE: intl.formatMessage({
        defaultMessage: 'Option 1: Use Agent URL and API Key',
        id: 'YaDZo9',
        description: 'Option 1 header in info dialog',
      }),
      INFO_DIALOG_OPTION1_DESC: intl.formatMessage({
        defaultMessage: 'Use the following credentials to connect to your agent from external applications or custom integrations.',
        id: '3Y9Ff3',
        description: 'Option 1 description in info dialog',
      }),
      INFO_DIALOG_AGENT_URL_LABEL: intl.formatMessage({
        defaultMessage: 'Agent URL',
        id: 'vlaPca',
        description: 'Agent URL field label',
      }),
      INFO_DIALOG_API_KEY_LABEL: intl.formatMessage({
        defaultMessage: 'API Key',
        id: 'QCRYMS',
        description: 'API Key field label',
      }),
      INFO_DIALOG_COPY_BUTTON: intl.formatMessage({
        defaultMessage: 'Copy',
        id: 'uxhuCo',
        description: 'Copy button text',
      }),
      INFO_DIALOG_COPIED_BUTTON: intl.formatMessage({
        defaultMessage: 'Copied!',
        id: 'DGPz3M',
        description: 'Copied button text',
      }),
      INFO_DIALOG_OPTION2_TITLE: intl.formatMessage({
        defaultMessage: 'Option 2: Chat Client',
        id: 'OkFPf3',
        description: 'Option 2 header in info dialog',
      }),
      INFO_DIALOG_OPTION2_DESC_NO_AUTH: intl.formatMessage({
        defaultMessage: 'To enable chat client for production, setup authentication.',
        id: 'GXFvm+',
        description: 'Option 2 description when auth is not enabled',
      }),
      INFO_DIALOG_OPTION2_DESC_WITH_AUTH: intl.formatMessage({
        defaultMessage: 'Use the chat client to talk to your agent.',
        id: 'ViOMjt',
        description: 'Option 2 description when auth is enabled',
      }),
      INFO_DIALOG_OPEN_CHAT: intl.formatMessage({
        defaultMessage: 'Open Chat Client',
        id: '3YFMW8',
        description: 'Link text for chat client',
      }),
      INFO_DIALOG_AUTH_SETTINGS: intl.formatMessage({
        defaultMessage: 'Configure Authentication',
        id: 'FKwmYD',
        description: 'Link text for authentication settings',
      }),
      INFO_DIALOG_AUTH_DOCS: intl.formatMessage({
        defaultMessage: 'Learn more about authentication',
        id: 'MdtNYy',
        description: 'Link text for authentication documentation',
      }),
      INFO_DIALOG_REFRESH_BUTTON: intl.formatMessage({
        defaultMessage: 'Refresh',
        id: 'GSzT3T',
        description: 'Refresh button text to reload agent details',
      }),
      INFO_SECTION_CONNECT: intl.formatMessage({
        defaultMessage: 'Connect to Agent',
        id: '9/yaph',
        description: 'Section label for connect to agent',
      }),
      INFO_SECTION_AVAILABILITY: intl.formatMessage({
        defaultMessage: 'Chat Availability',
        id: '2DmMb7',
        description: 'Section label for chat availability',
      }),
      CLOSE: intl.formatMessage({
        defaultMessage: 'Close',
        id: '4BH2f8',
        description: 'Close button text',
      }),
    }),
    [intl, agentChatUrl]
  );

  const onOpenChange = useCallback(
    async (open?: boolean) => {
      if (open) {
        setIsSaving(true);
        await saveWorkflow();
        setIsSaving(false);
        if (data?.authenticationEnabled && agentChatUrl) {
          window.open(agentChatUrl, '_blank');
          return;
        }
      }

      setOnDialogOpen(!!open);
    },
    [saveWorkflow, data?.authenticationEnabled, agentChatUrl]
  );

  const handleCopyAgentUrl = useCallback(async () => {
    if (data?.agentUrl) {
      await navigator.clipboard.writeText(data.agentUrl);
      setCopiedAgentUrl(true);
      if (agentUrlTimerRef.current) {
        clearTimeout(agentUrlTimerRef.current);
      }
      agentUrlTimerRef.current = setTimeout(() => setCopiedAgentUrl(false), 2000);
    }
  }, [data?.agentUrl]);

  const handleCopyApiKey = useCallback(async () => {
    if (data?.queryParams?.apiKey) {
      await navigator.clipboard.writeText(data.queryParams.apiKey);
      setCopiedApiKey(true);
      if (apiKeyTimerRef.current) {
        clearTimeout(apiKeyTimerRef.current);
      }
      apiKeyTimerRef.current = setTimeout(() => setCopiedApiKey(false), 2000);
    }
  }, [data?.queryParams?.apiKey]);

  const handleConfigureAuth = useCallback(() => {
    if (props.siteResourceId) {
      WorkflowService().openBlade?.({
        extensionName: 'WebsitesExtension',
        bladeName: 'AppServiceEasyAuthOverviewBlade',
        parameters: {
          id: props.siteResourceId,
        },
      });
    }
  }, [props.siteResourceId]);

  const handleRefreshAgentDetails = useCallback(() => {
    refetch();
  }, [refetch]);

  const tooltipText = useMemo(() => {
    if (buttonProps.disabled) {
      return clientStateTooltipText ?? IntlText.DEFAULT_TOOLTIP;
    }

    if (data?.authenticationEnabled && isDraftMode) {
      return IntlText.CHAT_IN_AUTHENTICATION_DRAFT;
    }

    if (data?.authenticationEnabled) {
      return IntlText.CHAT_IN_AUTHENTICATION_PROD;
    }

    return IntlText.DEFAULT_TOOLTIP;
  }, [
    buttonProps.disabled,
    clientStateTooltipText,
    data?.authenticationEnabled,
    isDraftMode,
    IntlText.CHAT_IN_AUTHENTICATION_DRAFT,
    IntlText.CHAT_IN_AUTHENTICATION_PROD,
    IntlText.DEFAULT_TOOLTIP,
  ]);

  const chatContent = useMemo(() => {
    if (isLoading || isSaving) {
      return <Spinner size="medium" label={IntlText.LOADING} />;
    }
    const queryParams = new URLSearchParams();

    if (data?.queryParams?.apiKey) {
      queryParams.set('apiKey', data.queryParams.apiKey);
    }

    if (data?.queryParams?.oboUserToken) {
      queryParams.set('oboUserToken', data.queryParams.oboUserToken);
    }

    if (isDarkMode) {
      queryParams.set('mode', 'dark');
    }

    const separator = agentChatUrl?.includes('?') ? '&' : '?';
    const src = queryParams.toString() ? `${agentChatUrl}${separator}${queryParams.toString()}` : agentChatUrl;

    return (
      <iframe
        src={src}
        title={IntlText.TITLE}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation-by-user-activation allow-storage-access-by-user-activation"
        referrerPolicy="strict-origin-when-cross-origin"
        loading="eager"
        style={{ width: '100%', height: '99%', border: 'none', borderRadius: tokens.borderRadiusXLarge }}
      />
    );
  }, [
    isLoading,
    isSaving,
    agentChatUrl,
    data?.queryParams?.apiKey,
    data?.queryParams?.oboUserToken,
    isDarkMode,
    IntlText.TITLE,
    IntlText.LOADING,
  ]);

  return (
    <>
      <Dialog modalType="modal" surfaceMotion={null} open={onDialogOpen} onOpenChange={(_, data) => onOpenChange(data.open)}>
        <DialogTrigger disableButtonEnhancement>
          <Tooltip content={tooltipText} relationship="label" withArrow={true}>
            <SplitButton
              appearance={buttonProps.appearance}
              shape={buttonProps.shape}
              size={buttonProps.size}
              primaryActionButton={{
                disabled: buttonProps.disabled || isSaving || isLoading,
                icon: <ChatIcon />,
                onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  setOnDialogOpen(true);
                },
              }}
              menuButton={{
                icon: <InfoIcon />,
                onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  setInfoDialogOpen(true);
                },
                ref: infoButtonRef,
                'aria-label': IntlText.INFO_TOOLTIP,
              }}
            >
              {IntlText.CHAT_TEXT}
            </SplitButton>
          </Tooltip>
        </DialogTrigger>
        <DialogSurface style={{ width: '70vw', maxWidth: '70vw' }}>
          <DialogBody>
            <DialogTitle
              action={
                <DialogTrigger action="close">
                  <Button appearance="subtle" aria-label="close" icon={<CloseIcon />} />
                </DialogTrigger>
              }
            />
            <DialogContent style={{ height: '70vh', padding: 0, margin: '0 -24px -32px' }}>{chatContent}</DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog modalType="alert" open={infoDialogOpen} onOpenChange={(_, data) => setInfoDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            {isDraftMode && <DialogTitle>{IntlText.INFO_SECTION_AVAILABILITY}</DialogTitle>}
            <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM }}>
              {!isDraftMode && (
                <SectionTabs
                  activeSection={activeSection}
                  onSectionChange={setActiveSection}
                  intlText={{
                    INFO_SECTION_CONNECT: IntlText.INFO_SECTION_CONNECT,
                    INFO_SECTION_AVAILABILITY: IntlText.INFO_SECTION_AVAILABILITY,
                  }}
                />
              )}

              {(isDraftMode || activeSection === 'availability') && (
                <ChatAvailabilitySection
                  intlText={{
                    INFO_DIALOG_DEVELOPMENT: IntlText.INFO_DIALOG_DEVELOPMENT,
                    INFO_DIALOG_DEVELOPMENT_DESC: IntlText.INFO_DIALOG_DEVELOPMENT_DESC,
                    INFO_DIALOG_PRODUCTION: IntlText.INFO_DIALOG_PRODUCTION,
                    INFO_DIALOG_PRODUCTION_DESC: IntlText.INFO_DIALOG_PRODUCTION_DESC,
                    INFO_DIALOG_SETUP: IntlText.INFO_DIALOG_SETUP,
                    INFO_DIALOG_SETUP_DESC: IntlText.INFO_DIALOG_SETUP_DESC,
                    INFO_DIALOG_LEARN_MORE: IntlText.INFO_DIALOG_LEARN_MORE,
                  }}
                />
              )}

              {!isDraftMode && activeSection === 'connect' && (
                <ConnectToAgentSection
                  intlText={{
                    INFO_DIALOG_OPTION1_TITLE: IntlText.INFO_DIALOG_OPTION1_TITLE,
                    INFO_DIALOG_OPTION1_DESC: IntlText.INFO_DIALOG_OPTION1_DESC,
                    INFO_DIALOG_AGENT_URL_LABEL: IntlText.INFO_DIALOG_AGENT_URL_LABEL,
                    INFO_DIALOG_API_KEY_LABEL: IntlText.INFO_DIALOG_API_KEY_LABEL,
                    INFO_DIALOG_COPY_BUTTON: IntlText.INFO_DIALOG_COPY_BUTTON,
                    INFO_DIALOG_COPIED_BUTTON: IntlText.INFO_DIALOG_COPIED_BUTTON,
                    INFO_DIALOG_OPTION2_TITLE: IntlText.INFO_DIALOG_OPTION2_TITLE,
                    INFO_DIALOG_OPTION2_DESC_WITH_AUTH: IntlText.INFO_DIALOG_OPTION2_DESC_WITH_AUTH,
                    INFO_DIALOG_OPTION2_DESC_NO_AUTH: IntlText.INFO_DIALOG_OPTION2_DESC_NO_AUTH,
                    INFO_DIALOG_OPEN_CHAT: IntlText.INFO_DIALOG_OPEN_CHAT,
                    INFO_DIALOG_AUTH_SETTINGS: IntlText.INFO_DIALOG_AUTH_SETTINGS,
                    INFO_DIALOG_REFRESH_BUTTON: IntlText.INFO_DIALOG_REFRESH_BUTTON,
                  }}
                  agentUrl={data?.agentUrl || ''}
                  apiKey={data?.queryParams?.apiKey || ''}
                  copiedAgentUrl={copiedAgentUrl}
                  copiedApiKey={copiedApiKey}
                  onCopyAgentUrl={handleCopyAgentUrl}
                  onCopyApiKey={handleCopyApiKey}
                  onConfigureAuth={handleConfigureAuth}
                  onRefresh={handleRefreshAgentDetails}
                  isRefreshing={isFetching}
                  authenticationEnabled={data?.authenticationEnabled}
                  chatUrl={agentChatUrl}
                  siteResourceId={props.siteResourceId}
                />
              )}
            </DialogContent>
            <DialogActions>
              <Button appearance="primary" onClick={() => setInfoDialogOpen(false)}>
                {IntlText.CLOSE}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
};
