import type { PanelTab } from './panelUtil';
import React, { useMemo } from 'react';

export interface PanelContentProps {
  selectedTab?: string;
  tabs: Record<string, PanelTab>;
}

export const PanelContent = ({ tabs, selectedTab }: PanelContentProps): JSX.Element => {
  const tabContent = useMemo(() => {
    const tab = Object.entries(tabs).find(([tabId]) => {
      return tabId === selectedTab;
    });
    return tab ? tab[1].content : null;
  }, [selectedTab, tabs]);
  return <div className="msla-content">{tabContent}</div>;
};
