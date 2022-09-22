import { NodeType } from '../../models/SelectedNode';
import type { SelectedNode } from '../../models/SelectedNode';
import { CodeTab } from './tabComponents/CodeTab';
import { FunctionNodePropertiesTab } from './tabComponents/FunctionNodePropertiesTab';
import { SchemaNodePropertiesTab } from './tabComponents/SchemaNodePropertiesTab';
import { TestTab } from './tabComponents/TestTab';
import { Stack } from '@fluentui/react';
import { Button, Divider, makeStyles, shorthands, Tab, TabList, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { ChevronDoubleDown20Regular, ChevronDoubleUp20Regular, Delete20Regular } from '@fluentui/react-icons';
import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

enum TABS {
  PROPERTIES = 1,
  CODE,
  TEST,
}

export const propPaneTopBarHeight = 40;
export const basePropPaneContentHeight = 192;

const useStyles = makeStyles({
  pane: {
    width: '100%',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium, tokens.borderRadiusMedium, 0, 0),
  },
  topBar: {
    height: `${propPaneTopBarHeight}px`,
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
    ...shorthands.overflow('hidden', 'auto'),
  },
  noItemSelectedText: {
    color: tokens.colorNeutralForegroundDisabled,
    ...typographyStyles.body1Strong,
  },
});

export interface PropertiesPaneProps {
  currentNode?: SelectedNode;
  isExpanded: boolean;
  setIsExpanded: (isExpanded: boolean) => void;
  centerViewHeight: number;
  contentHeight: number;
  setContentHeight: (newHeight: number) => void;
}

export const PropertiesPane = (props: PropertiesPaneProps): JSX.Element => {
  const intl = useIntl();
  const { currentNode, isExpanded, setIsExpanded, centerViewHeight, contentHeight, setContentHeight } = props;

  const styles = useStyles();
  const [tabToDisplay, setTabToDisplay] = useState<TABS | undefined>(TABS.PROPERTIES);
  const [initialDragYPos, setInitialDragYPos] = useState<number | undefined>(undefined);
  const [initialDragHeight, setInitialDragHeight] = useState<number | undefined>(undefined);

  const sourceSchemaNodeLoc = intl.formatMessage({
    defaultMessage: 'Source schema node',
    description: 'Label for source schema node',
  });

  const targetSchemaNodeLoc = intl.formatMessage({
    defaultMessage: 'Target schema node',
    description: 'Label for target schema node',
  });

  const functionLoc = intl.formatMessage({
    defaultMessage: 'Function',
    description: 'Label for function node',
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

  const onSelectTab = (tab: TABS) => {
    setTabToDisplay(tab);
    setIsExpanded(true);
  };

  const onStartDrag = (e: React.DragEvent) => {
    setInitialDragYPos(e.clientY);
    setInitialDragHeight(contentHeight);

    // Show empty image in place of dragging ghost preview
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const onDrag = (e: React.DragEvent) => {
    // Have to check for clientY being 0 as it messes everything up when drag ends for some unknown reason
    if (!initialDragHeight || !initialDragYPos || e.clientY === 0) {
      return;
    }

    const deltaY = e.clientY - initialDragYPos; // Going up == negative

    // Clamp height percent between 0 and the full centerViewHeight
    const newPaneContentHeight = Math.min(centerViewHeight, Math.max(0, initialDragHeight - deltaY));

    // Snap properties pane to full height if expanded >=80%
    if (newPaneContentHeight >= 0.8 * centerViewHeight) {
      setContentHeight(centerViewHeight);
      return;
    }

    // Automatically collapse pane if resized below a certain amount, and reset expanded height
    if (newPaneContentHeight <= 25) {
      setIsExpanded(false);
      setContentHeight(basePropPaneContentHeight);
      return;
    }

    setContentHeight(newPaneContentHeight);
  };

  const onDragEnd = () => {
    setInitialDragHeight(undefined);
    setInitialDragYPos(undefined);
  };

  const getPaneTitle = (): string | undefined => {
    switch (currentNode?.nodeType) {
      case NodeType.Source:
        return sourceSchemaNodeLoc;
      case NodeType.Target:
        return targetSchemaNodeLoc;
      case NodeType.Function:
        return functionLoc;
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
        if (currentNode.nodeType === NodeType.Function) {
          return <FunctionNodePropertiesTab currentNode={currentNode} />;
        } else {
          return <SchemaNodePropertiesTab currentNode={currentNode} />;
        }
      case TABS.CODE:
        return <CodeTab />;
      case TABS.TEST:
        if (currentNode.nodeType === NodeType.Target) {
          return <TestTab currentNode={currentNode} />;
        } else {
          return null;
        }
      default:
        console.error('tabToDisplay is undefined');
        return null;
    }
  };

  const TopBarContent = () => (
    <>
      <Text className={styles.title}>{getPaneTitle()}</Text>
      <Divider vertical style={{ maxWidth: 24 }} />
      <TabList selectedValue={tabToDisplay} onTabSelect={(_: unknown, data) => onSelectTab(data.value as TABS)} size="small">
        <Tab value={TABS.PROPERTIES}>{propertiesLoc}</Tab>
        <Tab value={TABS.CODE}>{codeLoc}</Tab>
        {currentNode?.nodeType === NodeType.Target && <Tab value={TABS.TEST}>{testLoc}</Tab>}
      </TabList>
    </>
  );

  useEffect(() => {
    // Set tab to first one anytime this panel displays a new item
    if (currentNode) {
      setTabToDisplay(TABS.PROPERTIES);
      setIsExpanded(true);
    } else {
      setTabToDisplay(undefined);
      setIsExpanded(false);
    }
  }, [currentNode, setIsExpanded]);

  return (
    <div className={styles.pane} style={{ flex: '0 1 auto' }}>
      <Stack
        horizontal
        verticalAlign="center"
        className={styles.topBar}
        style={{ cursor: isExpanded ? 'row-resize' : 'auto' }}
        draggable={isExpanded ? 'true' : 'false'}
        onDragStart={onStartDrag}
        onDrag={onDrag}
        onDragEnd={onDragEnd}
      >
        {currentNode ? <TopBarContent /> : <Text className={styles.noItemSelectedText}>{selectElementLoc}</Text>}

        <div style={{ marginLeft: 'auto' }}>
          {(currentNode?.nodeType === NodeType.Source || currentNode?.nodeType === NodeType.Function) && (
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

      {currentNode && isExpanded && (
        <div className={styles.paneContent} style={{ height: contentHeight }}>
          {getSelectedTab()}
        </div>
      )}
    </div>
  );
};
