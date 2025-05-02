/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useContext, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { PanelRoot } from '../../ui/panel/panelRoot';
import { initializeServices, ProviderWrappedContext, type AppDispatch } from '../../core';
import { openPanel, setIsCreatingConnection, setSelectedNodeId } from '../../core/state/panel/panelSlice';
import { useAreServicesInitialized } from '../../core/state/designerOptions/designerOptionsSelectors';
import { CreateConnectionWrapperSeparate } from '../../ui/panel/connectionsPanel/createConnection/createConnectionWrapperSeparate';
import { ConnectionsPanel } from '../../ui/panel/templatePanel/createWorkflowPanel/tabs/connectionsTab';
import { ConnectionPanelSeparate } from '../../ui';
import { type ConnectionReferences } from '@microsoft/logic-apps-shared';
import { initializeConnectionReferences } from '../../core/state/connection/connectionSlice';

export interface ConnectionsProps {
  connectorId: string;
  saveConnection: (connectionReferences: ConnectionReferences) => void;
  connectionReferences: ConnectionReferences;
}

export const Connections = (props: ConnectionsProps) => {
  const dispatch = useDispatch<AppDispatch>();

  const designerContainerRef = useRef<HTMLDivElement>(null);

  dispatch(setIsCreatingConnection(true));
  dispatch(openPanel({ panelMode: 'Connection' }));
  dispatch(setSelectedNodeId('123'));
  dispatch(initializeConnectionReferences(props.connectionReferences ?? {}));

  return (
    <div
      style={{
        height: 'inherit',
      }}
    >
      <div>Connections</div>
      <div className="msla-designer-canvas msla-panel-mode" ref={designerContainerRef}>
      <PanelRoot 
        panelContainerRef={designerContainerRef} 
        panelLocation="RIGHT" 
      />
      <ConnectionPanelSeparate saveConnection={props.saveConnection} connectorId={props.connectorId} isCollapsed={false} toggleCollapse={() => null} panelLocation='RIGHT' />
      </div>
    </div>
  );
};

interface ProviderProps {
  children: JSX.Element;
}

export const ConnectionsProvider: React.FC<ProviderProps> = (props) => {
  const wrapped = useContext(ProviderWrappedContext);
  const dispatch = useDispatch<AppDispatch>();
  const servicesInitialized = useAreServicesInitialized();
  //const designerOptionsInitialized = useAreDesignerOptionsInitialized();

  if (!wrapped) {
    throw new Error('BJSWorkflowProvider must be used inside of a DesignerProvider');
  }

  useEffect(() => {
    if (!servicesInitialized) {
      dispatch(initializeServices(wrapped));
    }
  }, [dispatch, servicesInitialized, wrapped]);

  if (!servicesInitialized) {
    return null;
  }

  return <>{props.children}</>;
};
