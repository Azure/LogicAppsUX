import type { AppDispatch, RootState } from '../../../../core';
import { addEdgeFromRunAfterOperation, removeEdgeFromRunAfterOperation } from '../../../../core/actions/bjsworkflow/runafter';
import { useOperationVisuals } from '../../../../core/state/operation/operationSelector';
import { useSelectedNodeId } from '../../../../core/state/panel/panelSelectors';
import { useNodeDisplayName } from '../../../../core/state/workflow/workflowSelectors';
import { Button, Input, Label, Menu, MenuButton, MenuItemCheckbox, MenuList, MenuPopover, MenuTrigger } from '@fluentui/react-components';
import { Add20Filled, Add20Regular, DismissRegular, Search24Regular, bundleIcon } from '@fluentui/react-icons';
import { LogEntryLevel, LoggerService, getRecordEntry, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import Fuse from 'fuse.js';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

const AddIcon = bundleIcon(Add20Filled, Add20Regular);
const getSuccessorNodes = (state: RootState, nodeId: string) => {
  const wfs = state.workflow;
  let successors: string[] = [];
  let nodes = [nodeId];

  while (nodes.length) {
    const node = nodes.shift();
    const newNodes = Object.entries(wfs.operations)
      // eslint-disable-next-line no-loop-func
      .filter(([, op]: [string, LogicAppsV2.ActionDefinition]) => !!getRecordEntry(op.runAfter, node))
      .map(([key]) => key);
    successors = [...successors, ...newNodes];
    nodes = [...nodes, ...newNodes];
  }
  return [...new Set(successors)];
};

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
      <Label style={{ overflow: 'hidden' }}>{actionName}</Label>
    </MenuItemCheckbox>
  );
};

export const RunAfterActionSelector = ({ readOnly }: { readOnly: boolean }) => {
  const intl = useIntl();
  const [searchText, setSearchText] = useState<string>('');
  const currentNodeId = useSelectedNodeId();
  const currentNodeRunAfter = useSelector((state: RootState) => getRecordEntry(state.workflow.operations, currentNodeId));
  const actions = useSelector((state: RootState) => {
    if (!currentNodeRunAfter) return [];
    const subNodes = getSuccessorNodes(state, currentNodeId);
    return (Object.entries(state.workflow.operations) as [string, LogicAppsV2.ActionDefinition][])
      .filter(
        ([key]) =>
          getRecordEntry(state.workflow.nodesMetadata, currentNodeId)?.graphId ===
          getRecordEntry(state.workflow.nodesMetadata, key)?.graphId
      )
      .filter(([key]) => !subNodes.includes(key) && key !== currentNodeId)
      .map(([key, value]) => ({ ...value, id: key }));
  });
  const RUN_AFTER_CONFIGURATION_FILTER_ACTIONS = intl.formatMessage({
    defaultMessage: 'Filter Actions',
    id: 'AHB418',
    description: 'Filter Actions',
  });
  const RUN_AFTER_CONFIGURATION_SELECT_ACTIONS_TITLE = intl.formatMessage({
    defaultMessage: 'Select Actions',
    id: 'zTKAc9',
    description: 'Select Actions',
  });

  const selectedValues = useSelector((state: RootState) => {
    return {
      actions: Object.keys((getRecordEntry(state.workflow.operations, currentNodeId) as LogicAppsV2.ActionDefinition)?.runAfter ?? {}),
    };
  });

  const dispatch = useDispatch<AppDispatch>();

  const searchResults = useMemo(() => {
    if (!searchText) return [];
    const options = {
      keys: ['id'],
      useExtendedSearch: true,
    };
    const fuse = new Fuse(actions, options);
    return fuse.search(searchText).map(({ item }) => item);
  }, [actions, searchText]);

  return (
    <Menu
      hasIcons
      hasCheckmarks
      checkedValues={selectedValues}
      onOpenChange={(_e, data) => {
        setSearchText('');
        LoggerService().log({
          area: `RunAfterActionSelector:onOpenChange:${data.open}`,
          level: LogEntryLevel.Verbose,
          message: `Run after action selector ${data.open ? 'opened' : 'closed'}.`,
        });
      }}
      onCheckedValueChange={(e, data) => {
        if (data.checkedItems.length === 0) return;
        const newItems = data.checkedItems.filter((x) => !selectedValues.actions.includes(x));
        const removedItems = selectedValues.actions.filter((x) => !data.checkedItems.includes(x));
        removedItems.forEach((item) => {
          dispatch(
            removeEdgeFromRunAfterOperation({
              parentOperationId: item,
              childOperationId: currentNodeId,
            })
          );
        });
        newItems.forEach((item) => {
          dispatch(
            addEdgeFromRunAfterOperation({
              parentOperationId: item,
              childOperationId: currentNodeId,
            })
          );
        });
        LoggerService().log({
          area: `RunAfterActionSelector:onCheckedValueChange`,
          level: LogEntryLevel.Verbose,
          message: `Run after action selector set to ${data.checkedItems.length} items.`,
        });
      }}
    >
      <MenuTrigger>
        <MenuButton icon={<AddIcon />} size="large" appearance="subtle">
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
            {(searchResults.length > 0 ? searchResults : actions).map((obj) => {
              return <ActionMenuItem id={obj.id} key={obj.id} readOnly={readOnly} />;
            })}
          </div>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
};
