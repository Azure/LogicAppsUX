import type { PageActionTelemetryData } from '../telemetry/models';
import type { PanelTab } from './panelUtil';
import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components';
import {
  TabList,
  Tab,
  Overflow,
  OverflowItem,
  Badge,
  Button,
  Menu,
  MenuList,
  MenuPopover,
  MenuTrigger,
  useOverflowMenu,
  useIsOverflowItemVisible,
  MenuItem,
} from '@fluentui/react-components';
import { bundleIcon, MoreHorizontalFilled, MoreHorizontalRegular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';

const MoreHorizontal = bundleIcon(MoreHorizontalFilled, MoreHorizontalRegular);

export interface PanelContentProps {
  nodeId: string;
  tabs: PanelTab[];
  selectedTab?: string;
  selectTab: (tabId: string) => void;
  trackEvent(data: PageActionTelemetryData): void;
}
export const PanelContent = ({ nodeId, tabs = [], selectedTab, selectTab }: PanelContentProps): JSX.Element => {
  const intl = useIntl();

  const selectedTabId = selectedTab ?? tabs[0]?.id;

  const onTabSelected = (e?: SelectTabEvent, data?: SelectTabData): void => {
    if (data) {
      const itemKey = data.value as string;
      trackEventHandler(itemKey);
      selectTab(itemKey);
    }
  };

  const trackEventHandler = (_itemKey?: string): void => {
    // TODO: 12798935 Analytics (event logging)
  };

  const overflowLabel = intl.formatMessage({
    defaultMessage: 'more panels',
    description: 'This is a label to access the overflowed panels',
  });

  return (
    <div id={`msla-node-details-panel-${nodeId}`}>
      <Overflow aria-label={overflowLabel}>
        <TabList selectedValue={selectedTabId} onTabSelect={onTabSelected} style={{ margin: '0px -12px' }}>
          {tabs.map(({ id, visible, hasErrors, title }) =>
            visible ? (
              <OverflowItem key={id} id={id} priority={id === selectedTabId ? 2 : 1}>
                <Tab value={id} role={'tab'}>
                  {title}
                  {hasErrors && <Badge size="extra-small" color="danger" style={{ marginLeft: '8px' }} />}
                </Tab>
              </OverflowItem>
            ) : null
          )}
          <OverflowMenu tabs={tabs} onTabSelect={selectTab} />
        </TabList>
      </Overflow>
      <div className="msla-panel-content-container">{tabs.find((tab) => tab.id === selectedTabId)?.content}</div>
    </div>
  );
};

type OverflowMenuProps = {
  tabs: PanelTab[];
  onTabSelect?: (tabId: string) => void;
};

const OverflowMenu = (props: OverflowMenuProps) => {
  const { tabs, onTabSelect } = props;
  const { ref, isOverflowing, overflowCount } = useOverflowMenu<HTMLButtonElement>();

  const onItemClick = (tabId: string) => onTabSelect?.(tabId);

  if (!isOverflowing) return null;

  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <Button appearance="transparent" ref={ref} icon={<MoreHorizontal />} aria-label={`${overflowCount} more tabs`} role="tab" />
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          {tabs.map((tab) => (
            <OverflowMenuItem key={tab.id} tab={tab} onClick={() => onItemClick(tab.id)} />
          ))}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
};

type OverflowMenuItemProps = {
  tab: PanelTab;
  onClick: React.MouseEventHandler;
};

const OverflowMenuItem = (props: OverflowMenuItemProps) => {
  const { tab, onClick } = props;
  const isVisible = useIsOverflowItemVisible(tab.id);

  if (isVisible) {
    return null;
  }

  return (
    <MenuItem key={tab.id} onClick={onClick}>
      {tab.title}
    </MenuItem>
  );
};
