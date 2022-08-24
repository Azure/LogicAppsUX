import { NodeType } from '../../models';
import type { SelectedNode } from '../../models';
import { ExpressionCodeTab } from './tabComponents/Expression/ExpressionCodeTab';
import { ExpressionPropertiesTab } from './tabComponents/Expression/ExpressionPropertiesTab';
import { InputSchemaNodeCodeTab } from './tabComponents/InputSchemaNode/InputSchemaNodeCodeTab';
import { InputSchemaNodePropertiesTab } from './tabComponents/InputSchemaNode/InputSchemaNodePropertiesTab';
import { OutputSchemaNodeCodeTab } from './tabComponents/OutputSchemaNode/OutputSchemaNodeCodeTab';
import { OutputSchemaNodePropertiesTab } from './tabComponents/OutputSchemaNode/OutputSchemaNodePropertiesTab';
import { OutputSchemaNodeTestTab } from './tabComponents/OutputSchemaNode/OutputSchemaNodeTestTab';
import { Stack } from '@fluentui/react';
import { Button, Divider, makeStyles, shorthands, Tab, TabList, Text, tokens } from '@fluentui/react-components';
import { ChevronDoubleUp20Regular, ChevronDoubleDown20Regular } from '@fluentui/react-icons';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

enum TABS {
  PROPERTIES = 1,
  CODE,
  TEST,
}

const useStyles = makeStyles({
  pane: {},
  topBar: {
    height: '40px',
    p: '4px',
    marginLeft: '8px',
    marginRight: '8px',
    ...shorthands.borderRadius('medium'),
  },
  chevron: {
    ...shorthands.margin('15px'),
  },
  paneContent: {
    ...shorthands.padding('8px', '24px', '24px', '24px'),
    height: '192px',
    ...shorthands.overflow('auto'),
  },
  noItemSelectedText: {
    color: tokens.colorNeutralForegroundDisabled,
    marginRight: '13px',
  },
});

export interface PropertiesPaneProps {
  currentNode?: SelectedNode;
}

export const PropertiesPane = (props: PropertiesPaneProps): JSX.Element => {
  const intl = useIntl();
  const { currentNode } = props;

  const styles = useStyles();
  const [isExpanded, setIsExpanded] = useState(!!currentNode);
  const [tabToDisplay, setTabToDisplay] = useState<TABS | undefined>(TABS.PROPERTIES);

  const inputSchemaNodeLoc = intl.formatMessage({
    defaultMessage: 'Input schema node',
    description: 'Label for input schema node',
  });

  const outputSchemaNodeLoc = intl.formatMessage({
    defaultMessage: 'Output schema node',
    description: 'Label for output schema node',
  });

  const expressionLoc = intl.formatMessage({
    defaultMessage: 'Expression',
    description: 'Label for expression node',
  });

  const propertiesLoc = intl.formatMessage({
    defaultMessage: 'Properties',
    description: 'Label for properties tab',
  });

  const codeLoc = intl.formatMessage({
    defaultMessage: 'Code',
    description: 'Label for code tab',
  });

  const testLoc = intl.formatMessage({
    defaultMessage: 'Test',
    description: 'Label for test tab',
  });

  const selectElementLoc = intl.formatMessage({
    defaultMessage: 'Select an element to start configuring',
    description: 'Label for default message when no node selected',
  });

  const getPaneItemName = (): string | undefined => {
    switch (currentNode?.type) {
      case NodeType.Input:
        return inputSchemaNodeLoc;
      case NodeType.Output:
        return outputSchemaNodeLoc;
      case NodeType.Expression:
        return expressionLoc;
      default:
        console.error("Panel item hasn't been chosen.");
        return;
    }
  };

  const getPropertiesTab = (): JSX.Element | null => {
    switch (currentNode?.type) {
      case NodeType.Input:
        return <InputSchemaNodePropertiesTab />;
      case NodeType.Output:
        return <OutputSchemaNodePropertiesTab />;
      case NodeType.Expression:
        return <ExpressionPropertiesTab />;
      default:
        console.error('Tab not fetched - currentNode likely undefined');
        return null;
    }
  };

  const getCodeTab = (): JSX.Element | null => {
    switch (currentNode?.type) {
      case NodeType.Input:
        return <InputSchemaNodeCodeTab />;
      case NodeType.Output:
        return <OutputSchemaNodeCodeTab />;
      case NodeType.Expression:
        return <ExpressionCodeTab />;
      default:
        console.error('Code tab not fetched - currentNode likely undefined');
        return null;
    }
  };

  const getTestTab = (): JSX.Element => {
    return <OutputSchemaNodeTestTab />;
  };

  const getSelectedContent = (): JSX.Element | null => {
    if (!currentNode) return null;

    switch (tabToDisplay) {
      case TABS.PROPERTIES:
        return getPropertiesTab();
      case TABS.CODE:
        return getCodeTab();
      case TABS.TEST:
        return getTestTab(); // Only retrieved if OutputSchemaNode
      default:
        console.error('tabToDisplay is undefined');
        return null;
    }
  };

  useEffect(() => {
    // Set tab to first one anytime this panel displays a new item
    if (currentNode) {
      setTabToDisplay(TABS.PROPERTIES);
    } else {
      setTabToDisplay(undefined);
    }
  }, [currentNode]);

  const TopBarContent = () => (
    <>
      <Text as="h6" weight="medium" style={{ marginRight: 13 }}>
        {getPaneItemName()}
      </Text>
      <Divider vertical style={{ maxWidth: 24 }} />
      <TabList selectedValue={tabToDisplay} onTabSelect={(_: unknown, data) => setTabToDisplay(data.value as TABS)} size="small">
        <Tab value={TABS.PROPERTIES}>{propertiesLoc}</Tab>
        <Tab value={TABS.CODE}>{codeLoc}</Tab>
        {currentNode?.type === NodeType.Output && <Tab value={TABS.TEST}>{testLoc}</Tab>}
      </TabList>
    </>
  );

  return (
    <div className={styles.pane}>
      <Stack horizontal verticalAlign="center" className={styles.topBar}>
        {currentNode ? <TopBarContent /> : <Text className={styles.noItemSelectedText}>{selectElementLoc}</Text>}

        <Button
          appearance="subtle"
          size="medium"
          icon={!isExpanded ? <ChevronDoubleUp20Regular /> : <ChevronDoubleDown20Regular />}
          onClick={() => setIsExpanded(!isExpanded)}
          className={styles.chevron}
          style={{ marginLeft: 'auto' }}
          disabled={!currentNode}
          title="Show/Hide"
          aria-label="Show/Hide"
        />
      </Stack>

      {isExpanded && <div className={styles.paneContent}>{getSelectedContent()}</div>}
    </div>
  );
};
