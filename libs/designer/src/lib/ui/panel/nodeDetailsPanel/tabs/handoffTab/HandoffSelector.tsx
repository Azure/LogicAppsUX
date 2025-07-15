import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import Fuse from 'fuse.js';
import { Button, Input, Menu, MenuButton, MenuItemCheckbox, MenuList, MenuPopover, MenuTrigger, Text } from '@fluentui/react-components';
import { Add20Filled, Add20Regular, DismissRegular, Search24Regular, bundleIcon } from '@fluentui/react-icons';
import type { OperationManifest } from '@microsoft/logic-apps-shared';
import { LogEntryLevel, LoggerService, handoffOperation } from '@microsoft/logic-apps-shared';

import {
  getWorkflowNodeFromGraphState,
  useAllAgentIds,
  useHandoffActionsForAgent,
  useNodeDisplayName,
} from '../../../../../core/state/workflow/workflowSelectors';
import type { RootState, AppDispatch } from '../../../../../core';
import { useOperationInfo, useOperationPanelSelectedNodeId } from '../../../../../core';
import { useOperationVisuals } from '../../../../../core/state/operation/operationSelector';
import { initializeOperationDetails, initializeSubgraphFromManifest } from '../../../../../core/actions/bjsworkflow/add';
import { deleteGraphNode } from '../../../../../core/actions/bjsworkflow/delete';
import { initializeOperationInfo } from '../../../../../core/state/operation/operationMetadataSlice';
import { addAgentTool, addNode, deleteAgentTool } from '../../../../../core/state/workflow/workflowSlice';
import { useOperationManifest } from '../../../../../core/state/selectors/actionMetadataSelector';

const AddIcon = bundleIcon(Add20Filled, Add20Regular);

const ActionMenuItem = ({ id, readOnly }: { id: string; readOnly: boolean }) => {
  const iconUri = useOperationVisuals(id)?.iconUri;
  const actionName = useNodeDisplayName(id);
  return (
    <MenuItemCheckbox
      name="actions"
      value={id}
      icon={<img style={{ height: '24px', width: '24px' }} src={iconUri} alt="" />}
      tabIndex={1}
      disabled={readOnly}
    >
      <Text style={{ overflow: 'hidden' }}>{actionName}</Text>
    </MenuItemCheckbox>
  );
};

export const HandoffSelector = ({ agentId, readOnly }: { agentId: string; readOnly: boolean }) => {
  const intl = useIntl();
  const [searchText, setSearchText] = useState<string>('');
  const currentNodeId = useOperationPanelSelectedNodeId();
  const allAgentActions = useAllAgentIds();
  const agentActions = allAgentActions.filter((action) => action !== currentNodeId);

  const handoffActions = useHandoffActionsForAgent(agentId);
  const selectedIds = useMemo(() => handoffActions.map((action) => action.targetId), [handoffActions]);

  const intlText = {
    filterAgents: intl.formatMessage({
      defaultMessage: 'Filter agents',
      id: '5BX2sU',
      description: 'Filter Agents',
    }),
    selectAgents: intl.formatMessage({
      defaultMessage: 'Select agents',
      id: 'UksFS1',
      description: 'Select Agents',
    }),
  };

  const dispatch = useDispatch<AppDispatch>();

  const searchResults = useMemo((): string[] => {
    if (!searchText) {
      return [];
    }
    const options = {
      keys: ['id'],
      useExtendedSearch: true,
    };
    const fuse = new Fuse(agentActions, options);
    return fuse.search(searchText).map(({ item }) => item);
  }, [agentActions, searchText]);

  const { data: agentManifest } = useOperationManifest(useOperationInfo(agentId));

  const rootState = useSelector((state: RootState) => state);

  const addHandoff = useCallback(
    (targetId: string) => {
      const newHandoffId = `handoff_from_${agentId}_to_${targetId}`;
      const newToolId = `${newHandoffId}_tool`;

      // Initialize subgraph manifest
      const caseManifestData = Object.values(agentManifest?.properties?.subGraphDetails ?? {}).find((data) => data.isAdditive);
      const subgraphManifest: OperationManifest = {
        properties: {
          ...caseManifestData,
          iconUri: agentManifest?.properties.iconUri ?? '',
          brandColor: '',
        },
      };
      initializeSubgraphFromManifest(newToolId, subgraphManifest, dispatch);
      // Create a new tool for the handoff
      dispatch(
        addAgentTool({
          toolId: newToolId,
          graphId: agentId,
        })
      );

      // Create the handoff action
      dispatch(
        addNode({
          operation: handoffOperation,
          nodeId: newHandoffId,
          relationshipIds: {
            graphId: agentId,
            subgraphId: newToolId,
            parentId: `${newToolId}-#subgraph`,
          },
        })
      );

      const nodeOperationInfo = {
        connectorId: handoffOperation.properties.api.id,
        operationId: handoffOperation.name,
        type: handoffOperation.type,
      };

      dispatch(initializeOperationInfo({ id: newHandoffId, ...nodeOperationInfo }));
      const presetParameterValues = {
        name: targetId,
      };
      initializeOperationDetails(newHandoffId, nodeOperationInfo, () => rootState, dispatch, presetParameterValues, undefined, false);
    },
    [agentId, agentManifest?.properties.iconUri, agentManifest?.properties?.subGraphDetails, dispatch, rootState]
  );

  const removeHandoff = useCallback(
    (targetId: string) => {
      const toolId = handoffActions.find((action) => action.targetId === targetId)?.toolId;
      const toolWorkflowNode = getWorkflowNodeFromGraphState(rootState.workflow, toolId);
      if (!handoffOperation || !toolWorkflowNode) {
        return;
      }
      dispatch(
        deleteGraphNode({
          graphId: toolId,
          graphNode: toolWorkflowNode,
          clearFocus: false,
        })
      );
      dispatch(
        deleteAgentTool({
          toolId,
          agentId,
        })
      );
    },
    [agentId, dispatch, handoffActions, rootState.workflow]
  );

  return (
    <div>
      <Menu
        hasIcons
        hasCheckmarks
        checkedValues={{ actions: selectedIds }}
        onOpenChange={(_e, data) => {
          setSearchText('');
          LoggerService().log({
            area: `HandoffActionSelector:onOpenChange:${data.open}`,
            level: LogEntryLevel.Verbose,
            message: `Handoff action selector ${data.open ? 'opened' : 'closed'}.`,
          });
        }}
        onCheckedValueChange={(_e, data) => {
          if (data.checkedItems.length === 0) {
            return;
          }
          const newItems = data.checkedItems.filter((x) => !selectedIds.includes(x));
          const removedItems = selectedIds.filter((x) => !data.checkedItems.includes(x));
          removedItems.forEach(removeHandoff);
          newItems.forEach(addHandoff);
          LoggerService().log({
            area: 'HandoffActionSelector:onCheckedValueChange',
            level: LogEntryLevel.Verbose,
            message: `Handoff action selector set to ${data.checkedItems.length} items.`,
          });
        }}
      >
        <MenuTrigger>
          <MenuButton icon={<AddIcon />} appearance="subtle" style={{ padding: '8px 12px' }}>
            {intlText.selectAgents}
          </MenuButton>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <Input
              contentBefore={<Search24Regular />}
              contentAfter={<Button icon={<DismissRegular />} appearance="transparent" onClick={() => setSearchText('')} />}
              autoFocus={true}
              placeholder={intlText.filterAgents}
              value={searchText}
              onChange={(_, data) => setSearchText(data.value)}
            />

            <div className="msla-run-after-action-menu-list">
              {(searchResults.length > 0 ? searchResults : agentActions).map((id: string) => {
                return <ActionMenuItem id={id} key={id} readOnly={readOnly} />;
              })}
            </div>
          </MenuList>
        </MenuPopover>
      </Menu>
    </div>
  );
};
