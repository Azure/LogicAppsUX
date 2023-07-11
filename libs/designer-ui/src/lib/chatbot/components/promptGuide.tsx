import type { IButtonStyles, IContextualMenuItem, IContextualMenuProps, Target } from '@fluentui/react';
import { ContextualMenu, ContextualMenuItemType, DirectionalHint, FontIcon, IconButton, getTheme } from '@fluentui/react';
import React from 'react';
import { useIntl } from 'react-intl';

export type IPromptGuideContextualMenuProps = {
  isOpen: boolean;
  onDismiss: () => void;
  target?: Target;
  onMenuItemClick?: (item: PromptGuideItem) => void;
  initialMenu?: PromptGuideMenuKey;
};

export enum PromptGuideMenuKey {
  FromBlank = 'FromBlank',
  CreateFlow = 'CreateFlow',
  FlowWithAction = 'FlowWithAction',
  DefaultFlow = 'DefaultFlow',
}

export enum PromptGuideItemKey {
  CreateFlow = 'CreateFlow',
  CreateFlowExample1 = 'CreateFlowExample1',
  CreateFlowExample2 = 'CreateFlowExample2',
  CreateFlowExample3 = 'CreateFlowExample3',
  Question = 'Question',
  AddAction = 'AddAction',
  ReplaceAction = 'ReplaceAction',
  ExplainAction = 'ExplainAction',
  EditFlow = 'EditFlow',
  ExplainFlow = 'ExplainFlow',
}

export type PromptGuideItem = {
  menuKey: PromptGuideMenuKey;
  itemKey: PromptGuideItemKey;
};

const menuItemKey = (menuKey: PromptGuideMenuKey, subMenuKey?: PromptGuideItemKey | 'header', subMenuDetails?: string) =>
  [menuKey, subMenuKey, subMenuDetails].filter(Boolean).join('-');

export const PromptGuideContextualMenu: React.FC<IPromptGuideContextualMenuProps> = ({
  isOpen,
  onDismiss,
  target,
  onMenuItemClick,
  initialMenu = PromptGuideMenuKey.FromBlank,
}) => {
  const intl = useIntl();
  const intlText = {
    promptGuideMenu: {
      createFlowSubMenuItems: {
        example1: intl.formatMessage({
          defaultMessage: 'Send me an email when...',
          description: 'Example of a sentence that the user should complete',
        }),
        example2: intl.formatMessage({
          defaultMessage: 'Every week on Monday...',
          description: 'Example of a sentence that the user should complete',
        }),
        example3: intl.formatMessage({
          defaultMessage: 'When a new item...',
          description: 'Example of a sentence that the user should complete',
        }),
      },
      createFlow: intl.formatMessage({
        defaultMessage: 'Create flow',
        description: 'Chatbot create a flow text',
      }),
      explainFlow: intl.formatMessage({
        defaultMessage: 'Explain flow',
        description: 'Chatbot prompt to explain the flow',
      }),
      addAction: intl.formatMessage({
        defaultMessage: 'Add an action',
        description: 'Chatbot prompt to add action',
      }),
      replaceAction: intl.formatMessage({
        defaultMessage: 'Replace action with',
        description: 'Chatbot prompt to replace an action',
      }),
      editFlow: intl.formatMessage({
        defaultMessage: 'Edit Flow',
        description: 'Chatbot prompt to edit the workflow',
      }),
      askQuestion: intl.formatMessage({
        defaultMessage: 'Ask a question',
        description: 'Chatbot prompt to ask a question',
      }),
      explainAction: intl.formatMessage({
        defaultMessage: 'Explain action',
        description: 'Chatbot prompt to explain an action',
      }),
      title: intl.formatMessage({
        defaultMessage: 'Get started',
        description: 'Chatbot prompt guide menu title',
      }),
    },
  };
  const { navigation, ...currentMenu } = useMenuNavigation(initialMenu);

  React.useEffect(() => {
    if (isOpen) {
      navigation.reset(initialMenu);
    } else {
      navigation.reset();
    }
  }, [isOpen, navigation, initialMenu]);

  const header = (menu: PromptGuideMenuKey, title: string): IContextualMenuItem => ({
    key: menuItemKey(menu, 'header'),
    text: title,
    itemType: ContextualMenuItemType.Header,
    onRenderIcon: currentMenu.isSubMenu ? () => <HeaderbackIconButtton onClick={navigation.goBack} /> : undefined,
    hasIcons: currentMenu.isSubMenu,
    iconProps: currentMenu.isSubMenu ? { iconName: 'ChevronLeft' } : { styles: { root: { display: 'none' } } },
  });

  const entry = (
    menuKey: PromptGuideMenuKey,
    itemKey: PromptGuideItemKey,
    ui: {
      text: string;
      iconName?: string;
    }
  ): IContextualMenuItem => ({
    key: menuItemKey(menuKey, itemKey),
    text: ui.text,
    itemType: ContextualMenuItemType.Normal,
    iconProps: ui.iconName ? { iconName: ui.iconName, styles: { root: { display: 'flex' } } } : undefined,
    onClick: () => {
      onMenuItemClick?.({ menuKey, itemKey });
    },
  });

  const navEntry = (
    menu: PromptGuideMenuKey,
    item: PromptGuideItemKey,
    destination: PromptGuideMenuKey,
    ui: {
      text: string;
      iconName?: string;
    }
  ): IContextualMenuItem => ({
    ...entry(menu, item, ui),
    onClick: (e) => {
      navigation.goTo(destination);
      e?.preventDefault();
      e?.stopPropagation();
    },
  });

  const createFlowSubMenuItems: IContextualMenuItem[] = [
    header(PromptGuideMenuKey.CreateFlow, intlText.promptGuideMenu.createFlow),
    entry(PromptGuideMenuKey.CreateFlow, PromptGuideItemKey.CreateFlowExample1, {
      text: intlText.promptGuideMenu.createFlowSubMenuItems.example1,
    }),
    entry(PromptGuideMenuKey.CreateFlow, PromptGuideItemKey.CreateFlowExample2, {
      text: intlText.promptGuideMenu.createFlowSubMenuItems.example2,
    }),
    entry(PromptGuideMenuKey.CreateFlow, PromptGuideItemKey.CreateFlowExample3, {
      text: intlText.promptGuideMenu.createFlowSubMenuItems.example3,
    }),
  ];

  const blankFlowMenuItems: IContextualMenuItem[] = [
    header(PromptGuideMenuKey.FromBlank, intlText.promptGuideMenu.title),
    navEntry(PromptGuideMenuKey.FromBlank, PromptGuideItemKey.CreateFlow, PromptGuideMenuKey.CreateFlow, {
      text: intlText.promptGuideMenu.createFlow,
      iconName: 'Add',
    }),
    entry(PromptGuideMenuKey.FromBlank, PromptGuideItemKey.Question, {
      text: intlText.promptGuideMenu.askQuestion,
      iconName: 'Unknown',
    }),
  ];

  const flowWithActionselectedMenuItems: IContextualMenuItem[] = [
    header(PromptGuideMenuKey.FlowWithAction, intlText.promptGuideMenu.title),
    entry(PromptGuideMenuKey.FlowWithAction, PromptGuideItemKey.AddAction, {
      text: intlText.promptGuideMenu.addAction,
      iconName: 'Add',
    }),
    entry(PromptGuideMenuKey.FlowWithAction, PromptGuideItemKey.ReplaceAction, {
      text: intlText.promptGuideMenu.replaceAction,
      iconName: 'Refresh',
    }),
    entry(PromptGuideMenuKey.FlowWithAction, PromptGuideItemKey.ExplainAction, {
      text: intlText.promptGuideMenu.explainAction,
      iconName: 'AlignJustify',
    }),
    entry(PromptGuideMenuKey.FlowWithAction, PromptGuideItemKey.Question, {
      text: intlText.promptGuideMenu.askQuestion,
      iconName: 'Unknown',
    }),
  ];

  const defaultFlowMenuItems: IContextualMenuItem[] = [
    header(PromptGuideMenuKey.DefaultFlow, intlText.promptGuideMenu.title),
    entry(PromptGuideMenuKey.DefaultFlow, PromptGuideItemKey.AddAction, {
      text: intlText.promptGuideMenu.addAction,
      iconName: 'Add',
    }),
    entry(PromptGuideMenuKey.DefaultFlow, PromptGuideItemKey.EditFlow, {
      text: intlText.promptGuideMenu.editFlow,
      iconName: 'Refresh',
    }),
    entry(PromptGuideMenuKey.DefaultFlow, PromptGuideItemKey.ExplainFlow, {
      text: intlText.promptGuideMenu.explainFlow,
      iconName: 'AlignJustify',
    }),
    entry(PromptGuideMenuKey.DefaultFlow, PromptGuideItemKey.Question, {
      text: intlText.promptGuideMenu.askQuestion,
      iconName: 'Unknown',
    }),
  ];

  const menus: Record<PromptGuideMenuKey, IContextualMenuItem[]> = {
    [PromptGuideMenuKey.FromBlank]: blankFlowMenuItems,
    [PromptGuideMenuKey.CreateFlow]: createFlowSubMenuItems,
    [PromptGuideMenuKey.FlowWithAction]: flowWithActionselectedMenuItems,
    [PromptGuideMenuKey.DefaultFlow]: defaultFlowMenuItems,
  };

  return (
    <ContextualMenu
      hidden={!isOpen}
      onDismiss={onDismiss}
      target={target}
      isSubMenu={currentMenu.isSubMenu}
      items={menus[currentMenu.menuKey]}
      styles={contextualMenuStyles}
      directionalHint={DirectionalHint.topLeftEdge}
    />
  );
};

function useMenuNavigation(initialMenu: PromptGuideMenuKey) {
  const [menuPath, setMenuPath] = React.useState<PromptGuideMenuKey[]>([initialMenu]);

  const navigation = React.useMemo(() => {
    const goTo = (menuKey: PromptGuideMenuKey) => setMenuPath((prev) => [...prev, menuKey]);
    const goBack = () => setMenuPath((prev) => prev.slice(0, -1));
    const reset = (menu?: PromptGuideMenuKey) => setMenuPath((prev) => [menu ?? prev[0]]);

    return { goTo, goBack, reset };
  }, []);

  const menuKey = menuPath[menuPath.length - 1];
  const isSubMenu = menuPath.length > 1;
  return { menuKey, isSubMenu, navigation };
}

const contextualMenuStyles: IContextualMenuProps['styles'] = {
  container: {
    borderRadius: 8,
    width: 288,
  },
  root: {
    borderRadius: 8,
  },
  subComponentStyles: {
    callout: {
      container: {
        borderRadius: 8,
      },
      root: {
        borderRadius: 8,
      },
      calloutMain: {
        borderRadius: 8,
      },
    },
  },
  header: {
    color: getTheme().palette.neutralSecondary,
  },
  list: {
    color: getTheme().palette.black,
    padding: 4,
    '.ms-ContextualMenu-icon': {
      color: getTheme().palette.neutralSecondary,
    },
    '.ms-ContextualMenu-link': {
      borderRadius: 4,
    },
  },
};

const HeaderbackIconButtton: React.FC<{
  onClick: () => void;
}> = ({ onClick }) => {
  return <IconButton title={'Back'} iconProps={{ iconName: 'ChevronLeft' }} onClick={onClick} styles={headerBackButtonStyles} />;
};

const headerBackButtonStyles: IButtonStyles = {
  root: { color: getTheme().palette.neutralPrimary, marginTop: 6 },
};

type PromptGuideCardProps = {
  itemKey: PromptGuideItemKey;
};

export const PromptGuideCard: React.FC<PromptGuideCardProps> = ({ itemKey }) => {
  let iconName: string | undefined;
  const intl = useIntl();
  const intlText = {
    addAction: intl.formatMessage({
      defaultMessage: 'Add an action',
      description: 'Chatbot prompt to add action',
    }),
    addActionDescription: intl.formatMessage({
      defaultMessage:
        'Describe something your flow should do. Add details where possible, including the connector to use and if any content should be included.',
      description: 'Chatbot prompt to add action description',
    }),
    replaceAction: intl.formatMessage({
      defaultMessage: 'Replace action',
      description: 'Chatbot prompt to replace an action',
    }),
    replaceActionDescription: intl.formatMessage({
      defaultMessage:
        'Describe something in your flow that should be replaced, as well as what should replace it. Add details where possible, including the connector to use and if any content should be included.',
      description: 'Chatbot prompt to replace an action description',
    }),
    editFlow: intl.formatMessage({
      defaultMessage: 'Edit Flow',
      description: 'Chatbot prompt to edit the workflow',
    }),
    editFlowDescription: intl.formatMessage({
      defaultMessage:
        'Describe how your flow should be changed. Add details where possible, including the connector to use and if any content should be included.',
      description: 'Chatbot prompt to edit the workflow description',
    }),
    question: intl.formatMessage({
      defaultMessage: 'Ask a question',
      description: 'Chatbot prompt to ask a question',
    }),
    questionDescription: intl.formatMessage({
      defaultMessage: 'Ask question related to your workflow or Logic Apps.',
      description: 'Chatbot prompt to ask a question description',
    }),
  };
  let cardResources: undefined | { title: string; description: string };

  switch (itemKey) {
    case PromptGuideItemKey.AddAction:
      iconName = 'Add';
      cardResources = { title: intlText.addAction, description: intlText.addActionDescription };
      break;
    case PromptGuideItemKey.ReplaceAction:
      iconName = 'Refresh';
      cardResources = { title: intlText.replaceAction, description: intlText.replaceActionDescription };
      break;
    case PromptGuideItemKey.EditFlow:
      iconName = 'Refresh';
      cardResources = { title: intlText.editFlow, description: intlText.editFlowDescription };
      break;
    case PromptGuideItemKey.Question:
      iconName = 'Unknown';
      cardResources = { title: intlText.question, description: intlText.questionDescription };
      break;
    // Other items don't have a card: they directly trigger a query or open a sub-menu
    default:
      break;
  }

  if (!cardResources) {
    return null;
  }

  return (
    <div className={'msla-prompt-guide-card-container'}>
      <div className={'msla-prompt-guide-card-header'}>
        {iconName && <FontIcon iconName={iconName} />}
        <div>{cardResources.title}</div>
      </div>
      <div className={'msla-prompt-guide-card-description'}>{cardResources.description}</div>
    </div>
  );
};
