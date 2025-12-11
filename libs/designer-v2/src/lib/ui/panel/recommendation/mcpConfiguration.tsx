import type { AppDispatch } from '../../../core';
import { addOperation } from '../../../core/actions/bjsworkflow/add';
import {
  useDiscoveryPanelIsAddingTrigger,
  useDiscoveryPanelIsParallelBranch,
  useDiscoveryPanelRelationshipIds,
} from '../../../core/state/panel/panelSelectors';
import { ConnectionParameterRow } from '../connectionsPanel/createConnection/connectionParameterRow';
import { Body1Strong, Button, Divider } from '@fluentui/react-components';
import { TextField } from '@fluentui/react';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/logic-apps-shared';
import { useCallback, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { getNodeId } from './helpers';

interface McpConfigurationProps {
  operation: DiscoveryOperation<DiscoveryResultTypes>;
}

interface AddMcpOperationParameters {
  name: string;
  presetParameterValues?: Record<string, any>;
  actionMetadata?: Record<string, any>;
}

export const McpConfiguration = (props: McpConfigurationProps) => {
  const { operation } = props;
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();

  const isTrigger = useDiscoveryPanelIsAddingTrigger();
  const relationshipIds = useDiscoveryPanelRelationshipIds();
  const isParallelBranch = useDiscoveryPanelIsParallelBranch();

  // State for MCP configuration
  const [mcpServerUrl, setMcpServerUrl] = useState('');
  const [selectedTool, setSelectedTool] = useState('');
  const [connectionName, setConnectionName] = useState('');

  const titleText = intl.formatMessage({
    defaultMessage: 'Configure MCP Server Connection',
    id: 'MCP003',
    description: 'Configure MCP Server Connection',
  });

  const addMcpOperation = useCallback(
    (params: AddMcpOperationParameters) => {
      const { name, presetParameterValues, actionMetadata } = params;
      const newNodeId = getNodeId(operation);
      
      dispatch(
        addOperation({
          operation,
          relationshipIds,
          nodeId: newNodeId,
          isParallelBranch,
          isTrigger,
          presetParameterValues,
          actionMetadata,
        })
      );
    },
    [dispatch, operation, relationshipIds, isParallelBranch, isTrigger]
  );

  const handleSubmit = useCallback(() => {
    addMcpOperation({
      name: selectedTool || 'MCP_Operation',
      presetParameterValues: {
        'host.mcpServerUrl': mcpServerUrl,
        'host.toolName': selectedTool,
      },
      actionMetadata: {
        connectionName,
      },
    });
  }, [addMcpOperation, mcpServerUrl, selectedTool, connectionName]);

  const mcpServerUrlLabel = intl.formatMessage({
    defaultMessage: 'MCP Server URL',
    id: 'MCP004',
    description: 'Label for MCP server URL input',
  });

  const toolNameLabel = intl.formatMessage({
    defaultMessage: 'Tool Name',
    id: 'MCP005',
    description: 'Label for tool name input',
  });

  const connectionNameLabel = intl.formatMessage({
    defaultMessage: 'Connection Name',
    id: 'MCP006',
    description: 'Label for connection name input',
  });

  const addButtonText = intl.formatMessage({
    defaultMessage: 'Add Operation',
    id: 'MCP007',
    description: 'Button text to add MCP operation',
  });

  const canSubmit = mcpServerUrl && selectedTool && connectionName;

  return (
    <div className="msla-edit-connection-container">
      <Divider />

      <Body1Strong>{titleText}</Body1Strong>

      <div className="msla-create-connection-container">
        <div className="connection-params-container">
          <ConnectionParameterRow
            parameterKey="mcpServerUrl"
            displayName={mcpServerUrlLabel}
            required={true}
            disabled={false}
          >
            <TextField
              id="mcpServerUrl"
              className="connection-parameter-input"
              autoComplete="off"
              type="text"
              placeholder="https://your-mcp-server.com"
              value={mcpServerUrl}
              onChange={(e: any, newVal?: string) => setMcpServerUrl(newVal ?? '')}
            />
          </ConnectionParameterRow>

          <ConnectionParameterRow
            parameterKey="toolName"
            displayName={toolNameLabel}
            required={true}
            disabled={false}
          >
            <TextField
              id="toolName"
              className="connection-parameter-input"
              autoComplete="off"
              type="text"
              placeholder="tool_name"
              value={selectedTool}
              onChange={(e: any, newVal?: string) => setSelectedTool(newVal ?? '')}
            />
          </ConnectionParameterRow>

          <ConnectionParameterRow
            parameterKey="connectionName"
            displayName={connectionNameLabel}
            required={true}
            disabled={false}
          >
            <TextField
              id="connectionName"
              className="connection-parameter-input"
              autoComplete="off"
              type="text"
              placeholder="my-mcp-connection"
              value={connectionName}
              onChange={(e: any, newVal?: string) => setConnectionName(newVal ?? '')}
            />
          </ConnectionParameterRow>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="msla-edit-connection-actions-container">
        <Button
          appearance="primary"
          disabled={!canSubmit}
          onClick={handleSubmit}
          data-automation-id="create-mcp-connection-button"
        >
          {addButtonText}
        </Button>
      </div>
    </div>
  );
};
