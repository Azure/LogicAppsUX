import { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';
import Fuse from 'fuse.js';
import { Button, Input, Menu, MenuButton, MenuItemCheckbox, MenuList, MenuPopover, MenuTrigger, Text } from '@fluentui/react-components';
import { Add20Filled, Add20Regular, DismissRegular, Search24Regular, bundleIcon } from '@fluentui/react-icons';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';

import { useAllAgentIds, useHandoffActionsForAgent, useNodeDisplayName } from '../../../../../core/state/workflow/workflowSelectors';
import type { AppDispatch } from '../../../../../core';
import { useOperationPanelSelectedNodeId } from '../../../../../core';
import { useOperationVisuals } from '../../../../../core/state/operation/operationSelector';
import { addAgentHandoff, removeAgentHandoff } from '../../../../../core/actions/bjsworkflow/handoff';

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

  const addHandoff = useCallback(
    (targetId: string) => {
      dispatch(addAgentHandoff({ sourceId: agentId, targetId }));
    },
    [agentId, dispatch]
  );

  const removeHandoff = useCallback(
    (targetId: string) => {
      const toolId = handoffActions.find((action) => action.targetId === targetId)?.toolId;
      dispatch(removeAgentHandoff({ agentId, toolId }));
    },
    [agentId, dispatch, handoffActions]
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

            <div className="msla-action-selection-menu-list">
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
