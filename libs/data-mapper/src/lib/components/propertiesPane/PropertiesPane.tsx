import { ExpressionCodeTab } from './tabComponents/Expression/ExpressionCodeTab';
import { ExpressionPropertiesTab } from './tabComponents/Expression/ExpressionPropertiesTab';
import { InputSchemaNodeCodeTab } from './tabComponents/InputSchemaNode/InputSchemaNodeCodeTab';
import { InputSchemaNodePropertiesTab } from './tabComponents/InputSchemaNode/InputSchemaNodePropertiesTab';
import { OutputSchemaNodeCodeTab } from './tabComponents/OutputSchemaNode/OutputSchemaNodeCodeTab';
import { OutputSchemaNodePropertiesTab } from './tabComponents/OutputSchemaNode/OutputSchemaNodePropertiesTab';
import { OutputSchemaNodeTestTab } from './tabComponents/OutputSchemaNode/OutputSchemaNodeTestTab';
import { ActionButton, CommandBarButton, IconButton, Separator, Stack, Text } from '@fluentui/react';
import { useEffect, useState } from 'react';

enum PANEL_ITEM {
  INPUT_SCHEMA_NODE = 0,
  OUTPUT_SCHEMA_NODE = 1,
  EXPRESSION = 2,
}

enum SELECTED_TAB {
  PROPERTIES = 0,
  CODE = 1,
  TEST = 2,
}

const cmdBtnStyle = {
  border: 0,
  marginLeft: 16,
  height: 30,
  fontSize: 14,
  borderBottom: 0, // You'd think border: 0 would do this...but nope
};

const selectedCmdBtnStyle = {
  ...cmdBtnStyle,
  borderBottom: '2px solid #0F6CBD',
  fontWeight: 'bold',
  backgroundColor: 'initial',
};

// TODO: waiting for more design/UX details before I dig myself into a deeper hole

export const PropertiesPane = (): JSX.Element => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [panelItem, setPanelItem] = useState(PANEL_ITEM.INPUT_SCHEMA_NODE);
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

  const getSelectedContent = (): JSX.Element => {
    switch (tabToDisplay) {
      case SELECTED_TAB.PROPERTIES:
        return getPropertiesTab(panelItem);
      case SELECTED_TAB.CODE:
        return getCodeTab(panelItem);
      case SELECTED_TAB.TEST:
        return getTestTab(); // Only retrieved if OutputSchemaNode
    }
  };

  useEffect(() => {
    // Set tab to first one anytime this panel displays a new item
    setTabToDisplay(0);
  }, [panelItem]);

  return (
    <div>
      <CommandBarButton
        text="TEST: Change panel item"
        onClick={() => setPanelItem(panelItem === PANEL_ITEM.EXPRESSION ? PANEL_ITEM.INPUT_SCHEMA_NODE : panelItem + 1)}
      />
      <Stack horizontal verticalAlign="center">
        <IconButton
          title="Show/Hide"
          iconProps={{ iconName: `DoubleChevron${isExpanded ? 'Down' : 'Up'}` }}
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            margin: '15px',
          }}
        />
        <Text variant="large" style={{ marginRight: 13, fontWeight: 'bold' }}>
          {getPanelItemName()}
        </Text>
        <Separator vertical style={{ marginLeft: 13, marginRight: 20 }} />
        <ActionButton
          text="Properties"
          onClick={() => setTabToDisplay(SELECTED_TAB.PROPERTIES)}
          style={tabToDisplay === SELECTED_TAB.PROPERTIES ? selectedCmdBtnStyle : cmdBtnStyle}
        />
        <ActionButton
          text="Code"
          onClick={() => setTabToDisplay(SELECTED_TAB.CODE)}
          style={tabToDisplay === SELECTED_TAB.CODE ? selectedCmdBtnStyle : cmdBtnStyle}
        />
        {panelItem === PANEL_ITEM.OUTPUT_SCHEMA_NODE && (
          <ActionButton
            text="Test"
            onClick={() => setTabToDisplay(SELECTED_TAB.TEST)}
            style={tabToDisplay === SELECTED_TAB.TEST ? selectedCmdBtnStyle : cmdBtnStyle}
          />
        )}
      </Stack>

      {isExpanded && getSelectedContent()}
    </div>
  );
};
