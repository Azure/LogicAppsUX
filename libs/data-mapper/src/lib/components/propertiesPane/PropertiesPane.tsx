import { deleteCurrentlySelectedItem } from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import type { UnknownNode } from '../../utils/DataMap.Utils';
import { isFunctionData } from '../../utils/Function.Utils';
import { CodeTab } from './tabs/CodeTab';
import { FunctionNodePropertiesTab } from './tabs/FunctionNodePropertiesTab';
import { SchemaNodePropertiesTab } from './tabs/SchemaNodePropertiesTab';
import { TestTab } from './tabs/TestTab';
import { Stack } from '@fluentui/react';
import { Button, Divider, Tab, TabList, Text, makeStyles, shorthands, tokens, typographyStyles } from '@fluentui/react-components';
import { ChevronDoubleDown20Regular, ChevronDoubleUp20Regular, Delete20Regular } from '@fluentui/react-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

enum PropertiesPaneTabs {
  Properties = 1,
  Code,
  Test,
}

export const canvasAreaAndPropPaneMargin = 8;
export const propPaneTopBarHeight = 48;
export const basePropPaneContentHeight = 224;

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
    color: tokens.colorNeutralForeground1,
  },
  titleDivider: {
    maxWidth: '24px',
    color: tokens.colorNeutralStroke2,
  },
  paneContent: {
    ...shorthands.padding('8px', '24px', '24px', '24px'),
    ...shorthands.overflow('hidden', 'auto'),
    boxSizing: 'border-box',
  },
  noItemSelectedText: {
    color: tokens.colorNeutralForegroundDisabled,
    ...typographyStyles.body1Strong,
  },
});

export interface PropertiesPaneProps {
  selectedItemKey: string;
  isExpanded: boolean;
  setIsExpanded: (isExpanded: boolean) => void;
  centerViewHeight: number;
  contentHeight: number;
  setContentHeight: (newHeight: number) => void;
}

export const PropertiesPane = (props: PropertiesPaneProps) => {
  const { selectedItemKey, isExpanded, setIsExpanded, centerViewHeight, contentHeight, setContentHeight } = props;
  const styles = useStyles();
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const sourceSchemaDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.flattenedSourceSchema);
  const functionNodesDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.functionNodes);
  const targetSchemaDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.flattenedTargetSchema);

  const [currentNode, setCurrentNode] = useState<UnknownNode>(undefined);
  const [tabToDisplay, setTabToDisplay] = useState<PropertiesPaneTabs>(PropertiesPaneTabs.Properties);
  const [initialDragYPos, setInitialDragYPos] = useState<number | undefined>(undefined);
  const [initialDragHeight, setInitialDragHeight] = useState<number | undefined>(undefined);

  const sourceSchemaNodeLoc = intl.formatMessage({
    defaultMessage: 'Source schema element',
    description: 'Label for source schema node',
  });

  const targetSchemaNodeLoc = intl.formatMessage({
    defaultMessage: 'Target schema element',
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

  /*const testLoc = intl.formatMessage({
    defaultMessage: 'Test',
    description: 'Label for test tab',
  });*/

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
    // NOTE: UX only shows delete button for this to happen when source
    // or function node is selected (not connections even though below method supports it)
    dispatch(deleteCurrentlySelectedItem());
  };

  const onSelectTab = useCallback(
    (tab: PropertiesPaneTabs) => {
      setTabToDisplay(tab);
      setIsExpanded(true);
    },
    [setIsExpanded]
  );

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

    const fullCenterViewHeight = centerViewHeight - propPaneTopBarHeight;

    // Clamp height percent between 0 and the full centerViewHeight
    const newPaneContentHeight = Math.min(fullCenterViewHeight, Math.max(0, initialDragHeight - deltaY));

    // Snap properties pane to full height if expanded >=80%
    if (newPaneContentHeight >= 0.8 * fullCenterViewHeight) {
      setContentHeight(fullCenterViewHeight);
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

  const isTargetSchemaNode = useMemo(
    () => (selectedItemKey ? !!targetSchemaDictionary[selectedItemKey] : false),
    [selectedItemKey, targetSchemaDictionary]
  );

  const paneTitle = useMemo<string | undefined>(() => {
    return !currentNode || isFunctionData(currentNode) ? functionLoc : isTargetSchemaNode ? targetSchemaNodeLoc : sourceSchemaNodeLoc;
  }, [currentNode, functionLoc, isTargetSchemaNode, sourceSchemaNodeLoc, targetSchemaNodeLoc]);

  useEffect(() => {
    // Spread operator to get new reference for each node so PropPane stuff re-renders properly
    const sourceSchemaNode = sourceSchemaDictionary[selectedItemKey] ? { ...sourceSchemaDictionary[selectedItemKey] } : undefined;
    const targetSchemaNode = targetSchemaDictionary[selectedItemKey] ? { ...targetSchemaDictionary[selectedItemKey] } : undefined;
    const functionNode = functionNodesDictionary[selectedItemKey] ? { ...functionNodesDictionary[selectedItemKey] } : undefined;

    setCurrentNode(sourceSchemaNode ?? targetSchemaNode ?? functionNode?.functionData ?? undefined);
  }, [selectedItemKey, sourceSchemaDictionary, functionNodesDictionary, targetSchemaDictionary]);

  useEffect(() => {
    setTabToDisplay(PropertiesPaneTabs.Properties);
    setIsExpanded(!!currentNode);
  }, [currentNode, setIsExpanded]);

  return (
    <div className={styles.pane}>
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
        {!currentNode ? (
          <Text className={styles.noItemSelectedText}>{selectElementLoc}</Text>
        ) : (
          <>
            <Text className={styles.title}>{paneTitle}</Text>
            <Divider className={styles.titleDivider} vertical />
            <TabList
              selectedValue={tabToDisplay}
              onTabSelect={(_: unknown, data) => onSelectTab(data.value as PropertiesPaneTabs)}
              size="small"
            >
              <Tab value={PropertiesPaneTabs.Properties}>{propertiesLoc}</Tab>
              <Tab value={PropertiesPaneTabs.Code}>{codeLoc}</Tab>
              {/*isTargetSchemaNode && <Tab value={PropertiesPaneTabs.Test}>{testLoc}</Tab>*/}
            </TabList>
          </>
        )}

        <div style={{ marginLeft: 'auto' }}>
          {currentNode && (isFunctionData(currentNode) || !isTargetSchemaNode) && (
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
            disabled={!currentNode}
            title={!isExpanded ? expandLoc : collapseLoc}
            aria-label={!isExpanded ? expandLoc : collapseLoc}
          />
        </div>
      </Stack>

      {isExpanded && currentNode && tabToDisplay && (
        <div className={styles.paneContent} style={{ height: contentHeight }}>
          {tabToDisplay === PropertiesPaneTabs.Properties && (
            <>
              {isFunctionData(currentNode) ? (
                <FunctionNodePropertiesTab key={currentNode.key} functionData={currentNode} />
              ) : (
                <SchemaNodePropertiesTab key={currentNode.key} currentNode={currentNode} />
              )}
            </>
          )}

          {tabToDisplay === PropertiesPaneTabs.Code && (
            <CodeTab key={currentNode.key} currentNode={currentNode} contentHeight={contentHeight} />
          )}

          {tabToDisplay === PropertiesPaneTabs.Test && <TestTab currentTargetSchemaNodeKey={currentNode.key} />}
        </div>
      )}
    </div>
  );
};
