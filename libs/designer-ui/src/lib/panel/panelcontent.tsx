import { Tab } from '.';
import { EmptyContent } from '../card/cardv2/emptycontent';
import React from 'react';

export interface PanelContentProps {
  tabs: Tab[];
  selectedTab?: string;
}
export const PanelContent = ({ tabs, selectedTab }: PanelContentProps): JSX.Element => {
  if (!selectedTab && tabs.length === 0) {
    return <EmptyContent />;
  }
  return (
    <div className="msla-content">
      {
        tabs.find((t) => {
          return t.itemKey === selectedTab;
        })?.content
      }
    </div>
  );
};
