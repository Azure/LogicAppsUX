import './styles.less';
import { IconButton, Panel, PanelType, css, getId, getTheme } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import type { ConversationItem } from '@microsoft/designer-ui';
import { PanelLocation, ChatInput, ConversationItemType, ConversationMessage } from '@microsoft/designer-ui';
import { useCallback, useEffect, useState } from 'react';
import React from 'react';
import { useIntl } from 'react-intl';

interface ChatbotProps {
  panelLocation?: PanelLocation;
}

const getInputIconButtonStyles = () => {
  const theme = getTheme();
  return {
    root: { color: theme.palette.neutralPrimary, backgroundColor: 'transparent' },
    rootDisabled: { backgroundColor: 'transparent' },
  };
};

const QUERY_MAX_LENGTH = 2000;

export const Chatbot = ({ panelLocation = PanelLocation.Left }: ChatbotProps) => {
  const intl = useIntl();
  const [inputQuery, setInputQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const inputIconButtonStyles = getInputIconButtonStyles();
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [isPromptGuideOpen, { toggle: togglePromptGuide }] = useBoolean(false);

  const intlText = {
    headerTitle: intl.formatMessage({
      defaultMessage: 'Copilot',
      description: 'Chatbot header title',
    }),
    pill: intl.formatMessage({
      defaultMessage: 'In-Development',
      description: 'Label in the chatbot header stating the chatbot feature is still in-development',
    }),
    chatInputPlaceholder: intl.formatMessage({
      defaultMessage: 'Ask a question or describe how you want to change this flow',
      description: 'Chabot input placeholder text',
    }),
    submitButtonTitle: intl.formatMessage({
      defaultMessage: 'Submit',
      description: 'Submit button',
    }),
    actionsButtonTitle: intl.formatMessage({
      defaultMessage: 'Actions',
      description: 'Actions button',
    }),
  };

  const onSubmitInputQuery = useCallback(() => {
    const query = inputQuery.trim();
    if (query !== '') {
      setConversation((current) => [
        {
          type: ConversationItemType.Query,
          id: getId(), // using this for now to give it a unique id, but will change later
          date: new Date(),
          text: query,
        },
        ...current,
      ]);
    }
  }, [inputQuery, setConversation]);

  useEffect(() => {
    setInputQuery('');
  }, [conversation]);

  return (
    <Panel
      type={panelLocation === PanelLocation.Right ? PanelType.custom : PanelType.customNear}
      isOpen={!collapsed}
      customWidth={'340px'}
      hasCloseButton={false}
      isBlocking={false}
      layerProps={{ styles: { root: { zIndex: 0, display: 'flex' } } }}
    >
      <div className={'chatbot-container'}>
        <div className={'chatbot-header'}>
          {/*TODO: Add icon for header*/}
          <div className={'chatbot-header-title'}>{intlText.headerTitle}</div>
          <div className={'chatbot-header-mode-pill'}>{intlText.pill}</div>
          <IconButton
            title={'Close'}
            iconProps={{ iconName: 'Clear' }}
            onClick={() => {
              setCollapsed(true);
            }}
            className={'chatbot-close-button'}
          />
        </div>
        <div className={css('chatbot-content')}>
          {conversation.map((item) => (
            <ConversationMessage key={item.id} item={item} />
          ))}
        </div>
        <div className={'chatbot-footer'}>
          <ChatInput
            query={inputQuery}
            placeholder={intlText.chatInputPlaceholder}
            isMultiline={true}
            showCharCount={true}
            maxQueryLength={QUERY_MAX_LENGTH}
            submitButtonProps={{
              title: intlText.submitButtonTitle,
              disabled: false, // TODO: add var to set isChatInputSubmitDisabled,
              iconProps: {
                iconName: 'Send',
                styles: inputIconButtonStyles,
              },
              onClick: onSubmitInputQuery,
            }}
            footerActionsProps={[
              {
                title: intlText.actionsButtonTitle,
                onClick: togglePromptGuide, // TODO: Should open up list of options
                toggle: true,
                checked: isPromptGuideOpen,
              },
            ]}
            onQueryChange={(ev, newValue) => {
              setInputQuery(newValue ?? '');
            }}
          />
        </div>
      </div>
    </Panel>
  );
};
