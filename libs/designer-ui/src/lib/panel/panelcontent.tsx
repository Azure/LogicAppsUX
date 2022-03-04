import type { PanelTab } from '.';
import React from 'react';

export interface PanelContentProps {
  selectedTab?: string;
  tabs: PanelTab[];
}

export const PanelContent = ({ tabs, selectedTab }: PanelContentProps): JSX.Element => {
  return (
    <div className="msla-content">
      {
        tabs.find((t) => {
          return t.name === selectedTab;
        })?.content
      }
    </div>
  );
};
