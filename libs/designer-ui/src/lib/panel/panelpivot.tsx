import { Pivot, PivotItem } from '@fluentui/react';
import { useIntl } from 'react-intl';
import { Tab } from '.';
import { PageActionTelemetryData } from '../telemetry/models';

export interface CategoryPivotProps {
  isCollapsed: boolean;
  tabs: Tab[];
  selectedTab?: string;
  onTabChange(tabName?: string): void;
  onCategoryClick?(item: PivotItem): void;
  trackEvent(data: PageActionTelemetryData): void;
}
export const PanelPivot = ({ isCollapsed, tabs, selectedTab, onTabChange, trackEvent }: CategoryPivotProps): JSX.Element => {
  const intl = useIntl();
  const onTabSelected = (item?: PivotItem): void => {
    if (item) {
      const { itemKey } = item.props;
      trackEventHandler(isCollapsed, itemKey);
      onTabChange(itemKey);
    }
  };

  const trackEventHandler = (isCollapsed: boolean, itemKey?: string): void => {
    // TODO: 12799013 Panel root
    // trackEvent({
    //   action: UserAction.click,
    //   actionContext: {
    //     isCollapsed,
    //     itemKey,
    //   },
    //   controlId: Constants.TELEMETRY_IDENTIFIERS.PANEL_CONTAINER_TAB,
    // });
  };
  const overflowLabel = intl.formatMessage({
    defaultMessage: 'more panels',
    description: 'This is a label to access the overflowed panels',
  });
  return (
    <div className="msla-pivot" style={{ overflow: 'hidden' }}>
      <Pivot
        selectedKey={selectedTab}
        className="msla-panel-select-card-container"
        onLinkClick={onTabSelected}
        overflowBehavior="menu"
        overflowAriaLabel={overflowLabel}
      >
        {tabs.map(({ itemKey, itemText }: Tab) => (
          <PivotItem key={itemKey} itemKey={itemKey} headerText={itemText} />
        ))}
      </Pivot>
    </div>
  );
};
