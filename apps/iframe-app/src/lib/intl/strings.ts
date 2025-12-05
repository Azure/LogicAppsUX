import { useIntl } from 'react-intl';

/**
 * Hook that returns all localized strings for the iframe app.
 * Centralizes all UI strings in one place for easy localization.
 */
export const useIframeStrings = () => {
  const intl = useIntl();

  return {
    // Error Display
    errorDisplay: {
      url: intl.formatMessage({
        defaultMessage: 'URL',
        id: 'X6ItLm',
        description: 'Label for URL in error display',
      }),
      parameters: intl.formatMessage({
        defaultMessage: 'Parameters',
        id: 'AvbJEe',
        description: 'Label for parameters in error display',
      }),
    },

    // Loading Display
    loading: {
      waitingForConfiguration: intl.formatMessage({
        defaultMessage: 'Waiting for configuration',
        id: 'ulx07a',
        description: 'Title shown while waiting for configuration',
      }),
      waitingForAgentCard: intl.formatMessage({
        defaultMessage: 'Waiting for agent card data via postMessage...',
        id: 'ClJtET',
        description: 'Message shown while waiting for agent card',
      }),
      initializingFrameBlade: intl.formatMessage({
        defaultMessage: 'Initializing frame blade...',
        id: 'a+zxqH',
        description: 'Title shown while initializing frame blade',
      }),
      connectingToAzurePortal: intl.formatMessage({
        defaultMessage: 'Connecting to azure portal...',
        id: 'GszfUJ',
        description: 'Message shown while connecting to azure portal',
      }),
      loadingAgent: intl.formatMessage({
        defaultMessage: 'Loading agent...',
        id: 'LeKIVW',
        description: 'Message shown while loading agent',
      }),
    },

    // Session Expired Modal
    sessionExpired: {
      title: intl.formatMessage({
        defaultMessage: 'Session expired',
        id: 'SOvYNh',
        description: 'Title for session expired modal',
      }),
      description: intl.formatMessage({
        defaultMessage: 'Your session has expired. Please refresh the page to continue.',
        id: 'AqMJyK',
        description: 'Description text for session expired modal',
      }),
      refreshPage: intl.formatMessage({
        defaultMessage: 'Refresh page',
        id: 'IjS7ai',
        description: 'Button text to refresh the page',
      }),
    },

    // Login Prompt
    login: {
      signInRequired: intl.formatMessage({
        defaultMessage: 'Sign in required',
        id: 'KgOyA1',
        description: 'Title for login prompt',
      }),
      pleaseSignIn: intl.formatMessage({
        defaultMessage: 'Please sign in to continue using the chat',
        id: 'COPM8p',
        description: 'Message prompting user to sign in',
      }),
      signIn: intl.formatMessage({
        defaultMessage: 'Sign in',
        id: 'ZCZqAi',
        description: 'Sign in button text',
      }),
      signingIn: intl.formatMessage({
        defaultMessage: 'Signing in...',
        id: 'WptfsD',
        description: 'Text shown while signing in',
      }),
    },

    // Multi-Session Chat
    multiSessionChat: {
      error: intl.formatMessage({
        defaultMessage: 'Error',
        id: 'IPkiT8',
        description: 'Error label prefix',
      }),
      failedToLoadAgent: intl.formatMessage({
        defaultMessage: 'Failed to load agent',
        id: '0VEtTn',
        description: 'Error message when agent fails to load',
      }),
    },

    // Session List
    sessionList: {
      chats: intl.formatMessage({
        defaultMessage: 'Chats',
        id: 'uVbkJZ',
        description: 'Title for chats section',
      }),
      noChatsYet: intl.formatMessage({
        defaultMessage: 'No chats yet',
        id: '2Gd4g/',
        description: 'Empty state message when no chats exist',
      }),
      startNewChat: intl.formatMessage({
        defaultMessage: 'Start a new chat',
        id: 'ZFIFMQ',
        description: 'Button text to start a new chat',
      }),
      newChat: intl.formatMessage({
        defaultMessage: 'New chat',
        id: 'xY93Rm',
        description: 'Button text for new chat',
      }),
      companyLogo: intl.formatMessage({
        defaultMessage: 'Company logo',
        id: 'P1Ukfu',
        description: 'Alt text for company logo',
      }),
    },

    // Session Item
    sessionItem: {
      untitledChat: intl.formatMessage({
        defaultMessage: 'Untitled chat',
        id: 'TrKu9i',
        description: 'Default name for an untitled chat',
      }),
      renameTooltip: intl.formatMessage({
        defaultMessage: 'Click edit icon or double-click to rename',
        id: 'l16JID',
        description: 'Tooltip explaining how to rename a chat',
      }),
      renameChat: intl.formatMessage({
        defaultMessage: 'Rename chat',
        id: 'kRjmyX',
        description: 'Tooltip for rename button',
      }),
      cannotRenameFailed: intl.formatMessage({
        defaultMessage: 'Cannot rename failed chat',
        id: 'TZRYsP',
        description: 'Tooltip when rename is disabled for failed chat',
      }),
      archiveChat: intl.formatMessage({
        defaultMessage: 'Archive chat',
        id: 'C4qmAV',
        description: 'Tooltip for archive button',
      }),
      archiveFailedChat: intl.formatMessage({
        defaultMessage: 'Archive failed chat',
        id: '048wNG',
        description: 'Tooltip for archiving failed chat',
      }),
      archiveConfirm: intl.formatMessage({
        defaultMessage: 'Archive this chat? You can view archived chats later if needed.',
        id: 'xTWB3h',
        description: 'Confirmation message for archiving chat',
      }),
      archiveFailedConfirm: intl.formatMessage({
        defaultMessage: 'Archive this failed chat? You can view archived chats later if needed.',
        id: 'XM2Jn2',
        description: 'Confirmation message for archiving failed chat',
      }),
      failedChatTooltip: intl.formatMessage({
        defaultMessage: 'Chat failed - You can view history but cannot send new messages',
        id: 'uPQXhT',
        description: 'Tooltip explaining failed chat status',
      }),
      chatStatus: intl.formatMessage({
        defaultMessage: 'Chat status',
        id: 'yiyrjc',
        description: 'Prefix for chat status tooltip',
      }),
      rename: intl.formatMessage({
        defaultMessage: 'Rename',
        id: 'fB6PJN',
        description: 'Rename button title',
      }),
      archive: intl.formatMessage({
        defaultMessage: 'Archive',
        id: 'NkikVl',
        description: 'Archive button title',
      }),
    },

    // Time formatting
    time: {
      justNow: intl.formatMessage({
        defaultMessage: 'Just now',
        id: 'KY0erY',
        description: 'Text for time less than a minute ago',
      }),
      minutesAgo: (minutes: number) =>
        intl.formatMessage(
          {
            defaultMessage: '{minutes}m ago',
            id: 'nLuzK9',
            description: 'Text for time in minutes ago',
          },
          { minutes }
        ),
      hoursAgo: (hours: number) =>
        intl.formatMessage(
          {
            defaultMessage: '{hours}h ago',
            id: '/3Pdzu',
            description: 'Text for time in hours ago',
          },
          { hours }
        ),
      daysAgo: (days: number) =>
        intl.formatMessage(
          {
            defaultMessage: '{days}d ago',
            id: 'mBlq5R',
            description: 'Text for time in days ago',
          },
          { days }
        ),
    },

    // Configuration errors
    configErrors: {
      title: intl.formatMessage({
        defaultMessage: 'Configuration error',
        id: 'aG718/',
        description: 'Title for configuration error',
      }),
      none: intl.formatMessage({
        defaultMessage: 'none',
        id: 'blgjJ/',
        description: 'Text when there are no parameters',
      }),
      failedToLoadChatWidget: intl.formatMessage({
        defaultMessage: 'Failed to load chat widget',
        id: 'YvsoZa',
        description: 'Error title when chat widget fails to load',
      }),
      chatRootNotFound: intl.formatMessage({
        defaultMessage: 'Chat root element not found',
        id: 'fA2iDJ',
        description: 'Error when chat root element is not found',
      }),
    },
  };
};
