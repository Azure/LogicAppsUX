import Constants from '../../constants';
import type { IButtonStyles, IContextualMenuItem, IContextualMenuProps, Target } from '@fluentui/react';
import { ContextualMenu, ContextualMenuItemType, DirectionalHint, IconButton } from '@fluentui/react';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

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

export type IPromptGuideContextualMenuProps = {
  target?: Target;
  onDismiss: () => void;
  onMenuItemClick?: (item: PromptGuideItem) => void;
  initialMenu?: PromptGuideMenuKey;
};

export enum PromptGuideMenuKey {
  FromBlank = 'FromBlank',
  CreateFlow = 'CreateFlow',
  FlowWithAction = 'FlowWithAction',
  DefaultFlow = 'DefaultFlow',
}

export type PromptGuideItem = {
  menuKey: PromptGuideMenuKey;
  itemKey: PromptGuideItemKey;
};

const menuItemKey = (menuKey: PromptGuideMenuKey, subMenuKey?: PromptGuideItemKey | 'header', subMenuDetails?: string) =>
  [menuKey, subMenuKey, subMenuDetails].filter(Boolean).join('-');

export const PromptGuideContextualMenu = ({
  onDismiss,
  target,
  onMenuItemClick,
  initialMenu = PromptGuideMenuKey.FromBlank,
}: IPromptGuideContextualMenuProps) => {
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
        defaultMessage: 'Edit flow',
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

  useEffect(() => {
    navigation.reset(initialMenu);
  }, [navigation, initialMenu]);

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
    // entry(PromptGuideMenuKey.DefaultFlow, PromptGuideItemKey.AddAction, {
    //   text: intlText.promptGuideMenu.addAction,
    //   iconName: 'Add',
    // }),
    // entry(PromptGuideMenuKey.DefaultFlow, PromptGuideItemKey.EditFlow, {
    //   text: intlText.promptGuideMenu.editFlow,
    //   iconName: 'Refresh',
    // }),
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
  const [menuPath, setMenuPath] = useState<PromptGuideMenuKey[]>([initialMenu]);

  const navigation = useMemo(() => {
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
    color: Constants.NEUTRAL_SECONDARY,
  },
  list: {
    color: Constants.BLACK,
    padding: 4,
    '.ms-ContextualMenu-icon': {
      color: Constants.NEUTRAL_SECONDARY,
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
  root: { color: Constants.NEUTRAL_PRIMARY, marginTop: 6 },
};
