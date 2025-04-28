/* eslint-disable @typescript-eslint/no-unused-vars */

import React from 'react';
import { useDispatch } from 'react-redux';
import { PanelRoot } from '../../ui/panel/panelRoot';
import type { AppDispatch } from '../../core';
import { openPanel, setIsCreatingConnection } from '../../core/state/panel/panelSlice';


export const Connections = () => {
  const dispatch = useDispatch<AppDispatch>();

  dispatch(setIsCreatingConnection(true));
  dispatch(openPanel({ panelMode: 'Connection' }));
  console.log('Connections');

  return (
    <div
      style={{
        height: 'inherit',
        backgroundColor: 'blue',
      }}
    >
      <div>Connections</div>
      <PanelRoot 
        panelContainerRef={React.createRef()} 
        panelLocation="RIGHT" 
      />
    </div>
  );
};
