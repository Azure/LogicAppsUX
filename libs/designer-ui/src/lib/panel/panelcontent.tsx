import { Tab } from '.';
import React from 'react';

export interface PanelContentProps {
  tabs: Tab[];
  selectedTab?: string;
}
export const PanelContent = ({ tabs, selectedTab }: PanelContentProps): JSX.Element => {
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
