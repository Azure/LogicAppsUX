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
        let tab = Object.entries(tabs).find(([tabId]) => {
          return tabId === selectedTab;
        });
        
        if(!tab){
             return null;
        }
        return tab[1].content;
          return tab[0] === selectedTab;
        })?.[1].content
      }
    </div>
  );
};
