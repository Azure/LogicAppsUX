import type { RootState } from '../../core/state/Store';
import { MapCheckerTab } from './tabs/mapCheckerTab/MapCheckerTab';
import { TargetSchemaTab } from './tabs/targetSchemaTab/TargetSchemaTab';
import { Stack } from '@fluentui/react';
import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components';
import { Button, Tab, TabList, Text, makeStyles, shorthands, tokens, typographyStyles } from '@fluentui/react-components';
import { ChevronDoubleLeft20Regular, ChevronDoubleRight20Regular } from '@fluentui/react-icons';
import type { CSSProperties } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

export const SidePanelTabValue = {
  OutputTree: 'outputTree',
  MapChecker: 'mapChecker',
} as const;
export type SidePanelTabValue = (typeof SidePanelTabValue)[keyof typeof SidePanelTabValue];

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

  const targetSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetSchema);

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

  const collapsedButtonTextStyle: CSSProperties = {
    color: !targetSchema ? tokens.colorNeutralForegroundDisabled : undefined,
    writingMode: 'vertical-rl',
  };

  return (
    <div className={styles.outputPane}>
      <Stack horizontal={isExpanded} verticalAlign="center" horizontalAlign={isExpanded ? 'start' : 'center'}>
        <Button
          icon={isExpanded ? <ChevronDoubleRight20Regular /> : <ChevronDoubleLeft20Regular />}
          size="medium"
          appearance="transparent"
          style={{ color: !targetSchema ? tokens.colorNeutralForegroundDisabled : tokens.colorNeutralForeground2 }}
          onClick={() => expandAndChangeTab(!isExpanded, sidePaneTab)}
          disabled={!targetSchema}
          aria-label={!isExpanded ? expandLoc : collapseLoc}
        />
        {!isExpanded ? (
          <Button
            size="medium"
            appearance="transparent"
            onClick={() => expandAndChangeTab(true, SidePanelTabValue.OutputTree)}
            disabled={!targetSchema}
            style={{ minWidth: '0px' }}
          >
            <Text wrap={false} className={styles.title} style={collapsedButtonTextStyle}>
              {targetSchemaLoc}
            </Text>
          </Button>
        ) : undefined}
        {!isExpanded ? (
          <Button
            size="medium"
            appearance="transparent"
            onClick={() => expandAndChangeTab(true, SidePanelTabValue.MapChecker)}
            disabled={!targetSchema}
            style={{ minWidth: '0px' }}
          >
            <Text className={styles.title} wrap={false} style={collapsedButtonTextStyle}>
              {mapCheckerLoc}
            </Text>
          </Button>
        ) : undefined}
        {isExpanded ? (
          <TabList selectedValue={sidePaneTab} onTabSelect={onTabSelect}>
            <Tab id={SidePanelTabValue.OutputTree} value={SidePanelTabValue.OutputTree}>
              {targetSchemaLoc}
            </Tab>
            <Tab id={SidePanelTabValue.MapChecker} value={SidePanelTabValue.MapChecker}>
              {mapCheckerLoc}
            </Tab>
          </TabList>
        ) : undefined}
      </Stack>
      <Stack
        style={
          !isExpanded
            ? { display: 'none' }
            : { display: 'flex', flexDirection: 'column', marginLeft: '40px', marginTop: '8px', width: '290px', height: '100%' }
        }
        horizontal={false}
        verticalFill={true}
      >
        {sidePaneTab === SidePanelTabValue.OutputTree && <TargetSchemaTab />}
        {sidePaneTab === SidePanelTabValue.MapChecker && <MapCheckerTab />}
      </Stack>
    </div>
  );
};
