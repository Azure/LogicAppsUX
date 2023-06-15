import './styles.less';
import { FontSizes, IconButton, Panel, PanelType, css, getId, getTheme } from '@fluentui/react';
import { makeStyles, shorthands } from '@fluentui/react-components';
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
    root: { color: theme.palette.neutralPrimary, backgroundColor: 'transparent !important' },
    rootDisabled: { backgroundColor: 'transparent !important' },
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

  const styles = useStyles();
  return (
    <Panel
      type={panelLocation === PanelLocation.Right ? PanelType.custom : PanelType.customNear}
      isOpen={!collapsed}
      customWidth={'340px'}
      hasCloseButton={false}
      isBlocking={false}
      layerProps={{ styles: { root: { zIndex: 0, display: 'flex' } } }}
    >
      <div className={styles.container}>
        <div className={styles.header}>
          {/*TODO: Add icon for header*/}
          <div className={styles.headerTitle}>{intlText.headerTitle}</div>
          <div className={styles.headerModePill}>{intlText.pill}</div>
          <IconButton
            title={'Close'}
            iconProps={{ iconName: 'Clear' }}
            onClick={() => {
              setCollapsed(true);
            }}
            className={styles.closeButton}
          />
        </div>
        <div className={css(styles.content)}>
          {conversation.map((item) => (
            <ConversationMessage key={item.id} item={item} />
          ))}
        </div>
        <div className={styles.footer}>
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
          ></ChatInput>
        </div>
      </div>
    </Panel>
  );
};

const useStyles = makeStyles({
  container: {
    top: 0,
    left: 0,
    position: 'absolute',
    height: '100%',
    width: '100%',
    minWidth: '100%',
    ...shorthands.overflow('hidden'),
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: getTheme().palette.neutralLighterAlt,
  },
  header: {
    height: '50px',
    display: 'flex',
    flexDirection: 'row',
    ...shorthands.padding('16px'),
    alignItems: 'center',
    fontSize: 'large',
    fontWeight: 'bold',
    boxShadow: getTheme().effects.elevation4,
    zIndex: 1,
  },
  headerIcon: {
    color: getTheme().palette.themePrimary,
  },
  headerTitle: {
    display: 'flex',
    flexGrow: 2,
    ...shorthands.padding('0px', '0px', '0px', '8px'),
  },
  headerModePill: {
    ...shorthands.margin('0px', '4px', '0px', '4px'),
    width: 'fit-content',
    fontSize: FontSizes.small,
    fontWeight: 600,
    textTransform: 'uppercase',
    color: getTheme().palette.neutralSecondary,
    backgroundColor: getTheme().palette.neutralLight,
    ...shorthands.borderRadius('20px'),
    ...shorthands.padding('2px 8px'),
    lineHeight: '15px',
  },
  closeButton: {
    color: 'unset',
  },
  content: {
    flexGrow: 2,
    display: 'flex',
    flexDirection: 'column-reverse',
    rowGap: '12px',
    overflowY: 'auto',
    ...shorthands.padding('15px'),
    '::-webkit-scrollbar': {
      width: '6px',
      height: '10px',
      backgroundColor: getTheme().palette.neutralPrimary,
      ...shorthands.borderRadius('3px'),
    },
    '::-webkit-scrollbar-thumb': {
      ...shorthands.borderRadius('5px'),
      backgroundColor: getTheme().palette.neutralLight,
    },
    '::-webkit-scrollbar-track': {
      backgroundColor: getTheme().palette.neutralLighter,
    },
  },
  footer: {
    ...shorthands.padding('15px'),
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  aINotice: {
    fontSize: FontSizes.xSmall,
    ...shorthands.margin('8px', '0px', '0px', '0px'),
    lineHeight: 14,
  },
});
