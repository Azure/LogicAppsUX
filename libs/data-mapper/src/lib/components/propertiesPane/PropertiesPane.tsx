import { NodeType } from '../../models';
import type { SelectedNode } from '../../models';
import { CodeTab } from './tabComponents/CodeTab';
import { ExpressionNodePropertiesTab } from './tabComponents/ExpressionNodePropertiesTab';
import { SchemaNodePropertiesTab } from './tabComponents/SchemaNodePropertiesTab';
import { TestTab } from './tabComponents/TestTab';
import { Stack } from '@fluentui/react';
import { Button, Divider, makeStyles, shorthands, Tab, TabList, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { ChevronDoubleUp20Regular, ChevronDoubleDown20Regular, Delete20Regular } from '@fluentui/react-icons';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

enum TABS {
  PROPERTIES = 1,
  CODE,
  TEST,
}

const useStyles = makeStyles({
  pane: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: tokens.colorNeutralBackground1,
    zIndex: 1000,
    ...shorthands.borderRadius('medium', 'medium', 0, 0),
  },
  topBar: {
    height: '40px',
    p: '4px',
    marginLeft: '8px',
    marginRight: '8px',
  },
  title: {
    ...typographyStyles.body1Strong,
  },
  chevron: {
    ...shorthands.margin('15px'),
  },
  paneContent: {
    ...shorthands.padding('8px', '24px', '24px', '24px'),
    height: '192px',
    maxHeight: '192px',
    ...shorthands.overflow('hidden', 'auto'),
  },
  noItemSelectedText: {
    color: tokens.colorNeutralForegroundDisabled,
    ...typographyStyles.body1Strong,
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

  const expandLoc = intl.formatMessage({
    defaultMessage: 'Expand',
    description: 'Label to expand',
  });

  const collapseLoc = intl.formatMessage({
    defaultMessage: 'Collapse',
    description: 'Label to collapse',
  });

  const removeLoc = intl.formatMessage({
    defaultMessage: 'Remove',
    description: 'Label to remove',
  });

  const removeCurrentNode = () => {
    // TODO: Hook this up once Reid gets to handling removing nodes
  };

  const getPaneTitle = (): string | undefined => {
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

  const getSelectedTab = (): JSX.Element | null => {
    if (!currentNode) {
      console.error('currentNode is undefined');
      return null;
    }

    switch (tabToDisplay) {
      case TABS.PROPERTIES:
        if (currentNode.type === NodeType.Expression) {
          return <ExpressionNodePropertiesTab currentNode={currentNode} />;
        } else {
          return <SchemaNodePropertiesTab currentNode={currentNode} />;
        }
      case TABS.CODE:
        return <CodeTab />;
      case TABS.TEST:
        return <TestTab />;
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
      <Text className={styles.title}>{getPaneTitle()}</Text>
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

        <div style={{ marginLeft: 'auto' }}>
          {(currentNode?.type === NodeType.Input || currentNode?.type === NodeType.Expression) && (
            <Button
              appearance="subtle"
              size="medium"
              icon={<Delete20Regular />}
              onClick={removeCurrentNode}
              title={removeLoc}
              aria-label={removeLoc}
            />
          )}
          <Button
            appearance="subtle"
            size="medium"
            icon={!isExpanded ? <ChevronDoubleUp20Regular /> : <ChevronDoubleDown20Regular />}
            onClick={() => setIsExpanded(!isExpanded)}
            className={styles.chevron}
            disabled={!currentNode}
            title={!isExpanded ? expandLoc : collapseLoc}
            aria-label={!isExpanded ? expandLoc : collapseLoc}
          />
        </div>
      </Stack>

      {isExpanded && <div className={styles.paneContent}>{getSelectedTab()}</div>}
    </div>
  );
};
