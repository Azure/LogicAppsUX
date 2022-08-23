import { ExpressionCodeTab } from './tabComponents/Expression/ExpressionCodeTab';
import { ExpressionPropertiesTab } from './tabComponents/Expression/ExpressionPropertiesTab';
import { InputSchemaNodeCodeTab } from './tabComponents/InputSchemaNode/InputSchemaNodeCodeTab';
import { InputSchemaNodePropertiesTab } from './tabComponents/InputSchemaNode/InputSchemaNodePropertiesTab';
import { OutputSchemaNodeCodeTab } from './tabComponents/OutputSchemaNode/OutputSchemaNodeCodeTab';
import { OutputSchemaNodePropertiesTab } from './tabComponents/OutputSchemaNode/OutputSchemaNodePropertiesTab';
import { OutputSchemaNodeTestTab } from './tabComponents/OutputSchemaNode/OutputSchemaNodeTestTab';
import { Stack } from '@fluentui/react';
import { Button, Divider, makeStyles, mergeClasses, shorthands, Text, tokens } from '@fluentui/react-components';
import { ChevronDoubleUp20Regular, ChevronDoubleDown20Regular } from '@fluentui/react-icons';
import { useEffect, useState } from 'react';

export const enum PANEL_ITEM {
  INPUT_SCHEMA_NODE = 1, // Start from 1 to avoid returning true for null/undef check when 0
  OUTPUT_SCHEMA_NODE,
  EXPRESSION,
}

enum SELECTED_TAB {
  PROPERTIES = 1,
  CODE,
  TEST,
}

const useStyles = makeStyles({
  topBar: {
    height: '40px',
    p: '4px',
    marginLeft: '8px',
    marginRight: '8px',
    ...shorthands.borderRadius('medium'),
  },
  tabBtn: {
    ...shorthands.border(0),
    ...shorthands.borderBottom(0), // You'd think border: 0 would do this...but nope
    ...shorthands.borderRadius(0),
    marginLeft: '16px',
    height: '30px',
    fontSize: '14px',
  },
  selectedTabBtn: {
    ...shorthands.borderBottom('2px', 'solid', tokens.colorBrandStroke1),
    fontWeight: 'bold',
    backgroundColor: 'initial',
    ':hover': {
      ...shorthands.borderBottom('2px', 'solid', tokens.colorBrandStroke1),
    },
  },
  chevron: {
    ...shorthands.margin('15px'),
  },
  paneContent: {
    ...shorthands.padding('8px', '24px', '24px', '24px'),
    height: '300px', // Arbitrary value for now
  },
  noItemSelectedText: {
    color: tokens.colorNeutralForegroundDisabled,
  },
});

export interface PropertiesPaneProps {
  panelItem?: PANEL_ITEM;
}

export const PropertiesPane = (props: PropertiesPaneProps): JSX.Element => {
  const { panelItem } = props;

  const styles = useStyles();
  const [isExpanded, setIsExpanded] = useState(!!panelItem);
  const [tabToDisplay, setTabToDisplay] = useState(SELECTED_TAB.PROPERTIES);

  const getPanelItemName = (): string | undefined => {
    switch (panelItem) {
      case PANEL_ITEM.INPUT_SCHEMA_NODE:
        return 'Input schema node';
      case PANEL_ITEM.OUTPUT_SCHEMA_NODE:
        return 'Output schema node';
      case PANEL_ITEM.EXPRESSION:
        return 'Expression';
      default:
        console.error("Panel item hasn't been chosen.");
        return;
    }
  };

  const getPropertiesTab = (panelItem: PANEL_ITEM): JSX.Element => {
    switch (panelItem) {
      case PANEL_ITEM.INPUT_SCHEMA_NODE:
        return <InputSchemaNodePropertiesTab />;
      case PANEL_ITEM.OUTPUT_SCHEMA_NODE:
        return <OutputSchemaNodePropertiesTab />;
      case PANEL_ITEM.EXPRESSION:
        return <ExpressionPropertiesTab />;
    }
  };

  const getCodeTab = (panelItem: PANEL_ITEM): JSX.Element => {
    switch (panelItem) {
      case PANEL_ITEM.INPUT_SCHEMA_NODE:
        return <InputSchemaNodeCodeTab />;
      case PANEL_ITEM.OUTPUT_SCHEMA_NODE:
        return <OutputSchemaNodeCodeTab />;
      case PANEL_ITEM.EXPRESSION:
        return <ExpressionCodeTab />;
    }
  };

  const getTestTab = (): JSX.Element => {
    return <OutputSchemaNodeTestTab />;
  };

  const getSelectedContent = (): JSX.Element | null => {
    if (!panelItem) {
      return null;
    }

    switch (tabToDisplay) {
      case SELECTED_TAB.PROPERTIES:
        return getPropertiesTab(panelItem);
      case SELECTED_TAB.CODE:
        return getCodeTab(panelItem);
      case SELECTED_TAB.TEST:
        return getTestTab(); // Only retrieved if OutputSchemaNode
    }
  };

  const getTabBtnStyles = (selTab: SELECTED_TAB) => {
    return tabToDisplay === selTab ? mergeClasses(styles.tabBtn, styles.selectedTabBtn) : styles.tabBtn;
  };

  useEffect(() => {
    // Set tab to first one anytime this panel displays a new item
    setTabToDisplay(SELECTED_TAB.PROPERTIES);
  }, [panelItem]);

  const TopBarContent = () => (
    <>
      <Text as="h6" weight="medium" style={{ marginRight: 13 }}>
        {getPanelItemName()}
      </Text>
      <Divider vertical style={{ maxWidth: 24 }} />
      <Button
        appearance="subtle"
        onClick={() => setTabToDisplay(SELECTED_TAB.PROPERTIES)}
        className={getTabBtnStyles(SELECTED_TAB.PROPERTIES)}
      >
        Properties
      </Button>
      <Button appearance="subtle" onClick={() => setTabToDisplay(SELECTED_TAB.CODE)} className={getTabBtnStyles(SELECTED_TAB.CODE)}>
        Code
      </Button>
      {panelItem === PANEL_ITEM.OUTPUT_SCHEMA_NODE && (
        <Button appearance="subtle" onClick={() => setTabToDisplay(SELECTED_TAB.TEST)} className={getTabBtnStyles(SELECTED_TAB.TEST)}>
          Test
        </Button>
      )}
    </>
  );

  return (
    <div>
      <Stack horizontal verticalAlign="center" className={styles.topBar}>
        {panelItem ? (
          <TopBarContent />
        ) : (
          <Text as="h6" weight="medium" style={{ marginRight: 13 }} className={styles.noItemSelectedText}>
            Select an element to start configuring
          </Text>
        )}

        <Button
          appearance="subtle"
          size="medium"
          icon={isExpanded ? <ChevronDoubleUp20Regular /> : <ChevronDoubleDown20Regular />}
          onClick={() => setIsExpanded(!isExpanded)}
          className={styles.chevron}
          style={{ marginLeft: 'auto' }}
          disabled={!panelItem}
          title="Show/Hide"
          aria-label="Show/Hide"
        />
      </Stack>

      {isExpanded && <div className={styles.paneContent}>{getSelectedContent()}</div>}
    </div>
  );
};
