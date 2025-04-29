import type { AppDispatch, RootState } from '../../../../core';
import { addEdgeToTransitions, removeEdgeFromTransitions } from '../../../../core/actions/bjsworkflow/transitions';
import { useOperationVisuals } from '../../../../core/state/operation/operationSelector';
import { useOperationPanelSelectedNodeId } from '../../../../core/state/panel/panelSelectors';
import { useNodeDisplayName, useRootTriggerId } from '../../../../core/state/workflow/workflowSelectors';
import { Button, Input, Menu, MenuButton, MenuItemCheckbox, MenuList, MenuPopover, MenuTrigger, Text } from '@fluentui/react-components';
import { Add20Filled, Add20Regular, DismissRegular, Search24Regular, bundleIcon } from '@fluentui/react-icons';
import { LogEntryLevel, LoggerService, getRecordEntry, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import Fuse from 'fuse.js';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

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

export const TransitionsActionSelector = ({ readOnly }: { readOnly: boolean }) => {
  const intl = useIntl();
  const [searchText, setSearchText] = useState<string>('');
  const currentNodeId = useOperationPanelSelectedNodeId();
  const rootTriggerId = useRootTriggerId();
  const allActions = useSelector((state: RootState) =>
    Object.entries(state.workflow.operations)
      .filter(([key, _]) => key !== currentNodeId)
      .map(([key, value]) => ({ ...value, id: key }))
  );
  const RUN_AFTER_CONFIGURATION_FILTER_ACTIONS = intl.formatMessage({
    defaultMessage: 'Filter actions',
    id: 'U2juKb',
    description: 'Filter Actions',
  });
  const RUN_AFTER_CONFIGURATION_SELECT_ACTIONS_TITLE = intl.formatMessage({
    defaultMessage: 'Select actions',
    id: '3a3eHg',
    description: 'Select Actions',
  });

  const selectedValues = useSelector((state: RootState) => {
    const actions = Object.keys(
      (getRecordEntry(state.workflow.operations, currentNodeId) as LogicAppsV2.ActionDefinition)?.transitions ?? {}
    );

    // If running after the trigger, add the trigger id as dummy data
    if (actions.length === 0) {
      actions.push(rootTriggerId);
    }

    return { actions };
  });

  const dispatch = useDispatch<AppDispatch>();

  const searchResults = useMemo(() => {
    if (!searchText) {
      return [];
    }
    const options = {
      keys: ['id'],
      useExtendedSearch: true,
    };
    const fuse = new Fuse(allActions, options);
    return fuse.search(searchText).map(({ item }) => item);
  }, [allActions, searchText]);

  return (
    <Menu
      hasIcons
      hasCheckmarks
      checkedValues={selectedValues}
      onOpenChange={(_e, data) => {
        setSearchText('');
        LoggerService().log({
          area: `TranstactionActionSelector:onOpenChange:${data.open}`,
          level: LogEntryLevel.Verbose,
          message: `Run after action selector ${data.open ? 'opened' : 'closed'}.`,
        });
      }}
      onCheckedValueChange={(_e, data) => {
        const newItems = data.checkedItems.filter((x) => !selectedValues.actions.includes(x));
        const removedItems = selectedValues.actions.filter((x) => !data.checkedItems.includes(x));
        removedItems.forEach((targetId) => {
          dispatch(
            removeEdgeFromTransitions({
              sourceId: currentNodeId,
              targetId,
            })
          );
        });
        newItems.forEach((targetId) => {
          dispatch(
            addEdgeToTransitions({
              sourceId: currentNodeId,
              targetId,
            })
          );
        });
        LoggerService().log({
          area: 'TransitionsActionSelector:onCheckedValueChange',
          level: LogEntryLevel.Verbose,
          message: `Run after action selector set to ${data.checkedItems.length} items.`,
        });
      }}
    >
      <MenuTrigger>
        <MenuButton icon={<AddIcon />} appearance="subtle" style={{ padding: '8px', marginTop: '-8px' }}>
          {RUN_AFTER_CONFIGURATION_SELECT_ACTIONS_TITLE}
        </MenuButton>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          <Input
            className="msla-run-after-action-search-input"
            contentBefore={<Search24Regular />}
            contentAfter={
              <Button
                icon={<DismissRegular />}
                appearance="transparent"
                onClick={() => {
                  setSearchText('');
                }}
              />
            }
            autoFocus={true}
            placeholder={RUN_AFTER_CONFIGURATION_FILTER_ACTIONS}
            value={searchText}
            onChange={(_, data) => {
              setSearchText(data.value);
            }}
          />

          <div className="msla-run-after-action-menu-list">
            {(searchResults.length > 0 ? searchResults : allActions).map((obj) => {
              return <ActionMenuItem id={obj.id} key={obj.id} readOnly={readOnly} />;
            })}
          </div>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
};
