import type { RootState } from '../../core/state/Store';
import { MapCheckerTab } from './tabs/mapCheckerTab/MapCheckerTab';
import { TargetSchemaTab } from './tabs/targetSchemaTab/TargetSchemaTab';
import { Stack, StackItem } from '@fluentui/react';
import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components';
import { Button, makeStyles, shorthands, Tab, TabList, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { ChevronDoubleLeft20Regular, ChevronDoubleRight20Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

export const enum SidePanelTabValue {
  OutputTree = 'outputTree',
  MapChecker = 'mapChecker',
}

const useStyles = makeStyles({
  outputPane: {
    backgroundColor: tokens.colorNeutralBackground4,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    height: '100%',
  },
  title: {
    ...typographyStyles.body1Strong,
    color: tokens.colorNeutralForeground1,
  },
  subtitle: {
    ...typographyStyles.body1,
    color: tokens.colorNeutralForeground2,
  },
});

export type SidePaneProps = {
  isExpanded: boolean;
  setIsExpanded: (isExpanded: boolean) => void;
  sidePaneTab: SidePanelTabValue;
  setSidePaneTab: (tabValue: SidePanelTabValue) => void;
};

export const SidePane = ({ isExpanded, setIsExpanded, sidePaneTab, setSidePaneTab }: SidePaneProps) => {
  const intl = useIntl();
  const styles = useStyles();

  const targetSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.targetSchema);

  const targetSchemaLoc = intl.formatMessage({
    defaultMessage: 'Target schema',
    description: 'Target schema',
  });

  const mapCheckerLoc = intl.formatMessage({
    defaultMessage: 'Map checker',
    description: 'Map checker',
  });

  const expandLoc = intl.formatMessage({
    defaultMessage: 'Expand',
    description: 'Button to expand a pane',
  });

  const collapseLoc = intl.formatMessage({
    defaultMessage: 'Collapse',
    description: 'Button to collapse a pane',
  });

  const expandAndChangeTab = (toExpanded: boolean, destinationTab: SidePanelTabValue) => {
    setSidePaneTab(destinationTab);
    setIsExpanded(toExpanded);
  };

  const onTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    if (sidePaneTab === data.value && isExpanded) {
      setIsExpanded(false);
    }
    setSidePaneTab(data.value as SidePanelTabValue);
  };

  const collapsedStackItemStyle = {
    height: '100px',
  };

  const expandedStackItemStyle = {
    display: 'none',
  };

  const collapsedButtonStyle = {
    height: 'inherit',
  };

  const collapsedButtonTextStyle = {
    color: !targetSchema ? tokens.colorNeutralForegroundDisabled : undefined,
    transform: 'rotate(90deg)',
  };

  return (
    <div className={styles.outputPane}>
      <Stack
        horizontal={false}
        verticalAlign={isExpanded ? 'center' : undefined}
        horizontalAlign={!isExpanded ? 'center' : undefined}
        style={!isExpanded ? { width: 40, margin: '4px 4px 4px 4px' } : { padding: '4px 4px 0 4px' }}
        verticalFill={true}
      >
        <Stack horizontal={isExpanded} style={{ alignItems: 'center' }}>
          <StackItem>
            <Button
              icon={isExpanded ? <ChevronDoubleRight20Regular /> : <ChevronDoubleLeft20Regular />}
              size="medium"
              appearance="transparent"
              style={{ color: !targetSchema ? tokens.colorNeutralForegroundDisabled : tokens.colorNeutralForeground2 }}
              onClick={() => expandAndChangeTab(!isExpanded, sidePaneTab)}
              disabled={!targetSchema}
              aria-label={!isExpanded ? expandLoc : collapseLoc}
            />
          </StackItem>
          <StackItem style={!isExpanded ? collapsedStackItemStyle : expandedStackItemStyle}>
            <Button
              size="medium"
              appearance="transparent"
              style={collapsedButtonStyle}
              onClick={() => expandAndChangeTab(true, SidePanelTabValue.OutputTree)}
              disabled={!targetSchema}
            >
              <Text wrap={false} className={styles.title} style={collapsedButtonTextStyle}>
                {targetSchemaLoc}
              </Text>
            </Button>
          </StackItem>
          <StackItem style={!isExpanded ? collapsedButtonStyle : expandedStackItemStyle}>
            <Button
              size="medium"
              appearance="transparent"
              style={collapsedStackItemStyle}
              onClick={() => expandAndChangeTab(true, SidePanelTabValue.MapChecker)}
              disabled={!targetSchema}
            >
              <Text className={styles.title} wrap={false} style={collapsedButtonTextStyle}>
                {mapCheckerLoc}
              </Text>
            </Button>
          </StackItem>
          <StackItem style={isExpanded ? collapsedButtonStyle : expandedStackItemStyle}>
            <TabList selectedValue={sidePaneTab} onTabSelect={onTabSelect}>
              <Tab id={SidePanelTabValue.OutputTree} value={SidePanelTabValue.OutputTree}>
                {targetSchemaLoc}
              </Tab>
              <Tab id={SidePanelTabValue.MapChecker} value={SidePanelTabValue.MapChecker}>
                {mapCheckerLoc}
              </Tab>
            </TabList>
          </StackItem>
        </Stack>
        <Stack
          style={
            !isExpanded
              ? { display: 'none' }
              : { display: 'flex', flexDirection: 'column', marginLeft: '40px', width: '290px', height: '100%' }
          }
          horizontal={false}
          verticalFill={true}
        >
          {sidePaneTab === SidePanelTabValue.OutputTree && <TargetSchemaTab />}
          {sidePaneTab === SidePanelTabValue.MapChecker && <MapCheckerTab />}
        </Stack>
      </Stack>
    </div>
  );
};
