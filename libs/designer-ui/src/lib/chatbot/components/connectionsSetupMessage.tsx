import { useFeedbackMessage } from '../feedbackHelper';
import { ChatBubble } from './chatBubble';
import { ConnectionsLoading, ConnectionStatusList } from './connectionStatus';
import type { ConnectionsSetupItem } from './conversationItem';
import { css } from '@fluentui/react';
import React from 'react';
import { useIntl } from 'react-intl';

export type ConnectionsSetupMessageProps = {
  item: ConnectionsSetupItem;
};

export const ConnectionsSetupMessage: React.FC<ConnectionsSetupMessageProps> = () => {
  // TODO: currently just using two filler apis, need to grab connections
  return (
    <ConnectionStatusList
      connectionStatuses={[
        {
          apiName: 'Filler API Name 1',
          isConnected: false,
        },
        {
          apiName: 'Filler API Name 2',
          isConnected: true,
        },
      ]}
    />
  );
};

type ConnectionsSetupProps = {
  item: ConnectionsSetupItem;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ConnectionsSetup: React.FC<ConnectionsSetupProps> = ({ item }) => {
  const { feedbackMessage, onMessageReactionClicked, reaction } = useFeedbackMessage(item);
  const isLoading = false;
  const [isHidden, setIsHidden] = React.useState(true);
  const intl = useIntl();
  const intlText = {
    skipText: intl.formatMessage({
      defaultMessage: 'Skip',
      id: 'dUbKuK',
      description: 'Chatbot conenction setup skip button text',
    }),
    connectionsSetupCardDescription: intl.formatMessage({
      defaultMessage: 'Set up these connections to use them in your flow.',
      id: 'EqX3Mi',
      description: 'Chatbot connections set up description text',
    }),
  };

  // Hide the designer when connections are loading or the diet designer is in transient state
  React.useEffect(() => {
    setIsHidden((wasHidden) => {
      if (wasHidden && !isLoading) {
        return false;
      }

      return wasHidden;
    });
  }, [isLoading]);

  return (
    <div>
      {isLoading && isHidden && <ConnectionsLoading />}
      <ChatBubble
        key={item.id}
        isUserMessage={false}
        isAIGenerated={true}
        date={item.date}
        additionalFooterActions={[
          {
            text: intlText.skipText,
            //TODO: onClick
            iconProps: { iconName: 'Forward' },
          },
        ]}
        selectedReaction={reaction}
        onThumbsReactionClicked={(reaction) => onMessageReactionClicked(reaction)}
        className={css('msla-connections-bubble', isHidden && HIDDEN_CLASS)}
        disabled={false} //TODO
      >
        <div className={'msla-connections-message'}>{intlText.connectionsSetupCardDescription}</div>
      </ChatBubble>
      {feedbackMessage}
    </div>
  );
};

const HIDDEN_CLASS = 'is-hidden';
