import type { PanelTab } from './panelUtil';
import React from 'react';

export interface PanelContentProps {
  selectedTab?: string;
  tabs: Record<string, PanelTab>;
}

export const PanelContent = ({ tabs, selectedTab }: PanelContentProps): JSX.Element => {
  return (
    <div className="msla-content">
      {
        Object.entries(tabs).find((tab) => {
          return tab[0] === selectedTab;
        })?.[1].content
      }
    </div>
  );
};
