import { InputSchemaCodeTab } from './tabComponents/InputSchemaCodeTab';
import { InputSchemaPropertiesTab } from './tabComponents/InputSchemaPropertiesTab';
import { OutputSchemaCodeTab } from './tabComponents/OutputSchemaCodeTab';
import { OutputSchemaPropertiesTab } from './tabComponents/OutputSchemaPropertiesTab';
import { OutputSchemaTestTab } from './tabComponents/OutputSchemaTestTab';
import { CommandBarButton, IconButton, Separator, Stack, Text } from '@fluentui/react';
import { useEffect, useState } from 'react';

enum PANEL_ITEM {
  INPUT_SCHEMA = 0,
  OUTPUT_SCHEMA = 1,
}

enum SELECTED_TAB {
  PROPERTIES = 0,
  CODE = 1,
  TEST = 2,
}

// Consider using this as base styles, then appending selected styles if its selected
const cmdBtnStyle = {
  border: 0,
  marginLeft: 16,
  height: 30,
  fontSize: 14,
};

const selectedCmdBtnStyle = {
  border: 0,
  marginLeft: 16,
  height: 30,
  borderBottom: '2px solid #0F6CBD',
  fontWeight: 'bold',
  fontSize: 14,
  backgroundColor: 'initial',
};

export const PropertiesPane = (): JSX.Element => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [panelItem, setPanelItem] = useState(PANEL_ITEM.INPUT_SCHEMA);
  const [tabToDisplay, setTabToDisplay] = useState(SELECTED_TAB.PROPERTIES);

  const getPanelItemName = (): string | undefined => {
    switch (panelItem) {
      case PANEL_ITEM.INPUT_SCHEMA:
        return 'Input schema';
      case PANEL_ITEM.OUTPUT_SCHEMA:
        return 'Output schema';
      default:
        console.log('Panel item hasnt been chosen.');
        return;
    }
  };

  const getSelectedContent = (): JSX.Element | undefined => {
    switch (tabToDisplay) {
      case SELECTED_TAB.PROPERTIES:
        return panelItem === PANEL_ITEM.INPUT_SCHEMA ? <InputSchemaPropertiesTab /> : <OutputSchemaPropertiesTab />;
      case SELECTED_TAB.CODE:
        return panelItem === PANEL_ITEM.INPUT_SCHEMA ? <InputSchemaCodeTab /> : <OutputSchemaCodeTab />;
      case SELECTED_TAB.TEST:
        return <OutputSchemaTestTab />;
      default:
        console.log('Content tab hasnt been chosen.');
        return;
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
        onClick={() => setPanelItem(panelItem === PANEL_ITEM.INPUT_SCHEMA ? PANEL_ITEM.OUTPUT_SCHEMA : PANEL_ITEM.INPUT_SCHEMA)}
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
        <CommandBarButton
          text="Properties"
          onClick={() => setTabToDisplay(SELECTED_TAB.PROPERTIES)}
          style={tabToDisplay === SELECTED_TAB.PROPERTIES ? selectedCmdBtnStyle : cmdBtnStyle}
        />
        <CommandBarButton
          text="Code"
          onClick={() => setTabToDisplay(SELECTED_TAB.CODE)}
          style={tabToDisplay === SELECTED_TAB.CODE ? selectedCmdBtnStyle : cmdBtnStyle}
        />
        {panelItem === PANEL_ITEM.OUTPUT_SCHEMA && (
          <CommandBarButton
            text="Test"
            onClick={() => setTabToDisplay(SELECTED_TAB.TEST)}
            style={tabToDisplay === SELECTED_TAB.TEST ? selectedCmdBtnStyle : cmdBtnStyle}
          />
        )}

        {/*<ActionButton iconProps={{ iconName: 'Delete' }} />
                <ActionButton iconProps={{ iconName: '' }} />*/}
      </Stack>

      {isExpanded && getSelectedContent()}
    </div>
  );
};
