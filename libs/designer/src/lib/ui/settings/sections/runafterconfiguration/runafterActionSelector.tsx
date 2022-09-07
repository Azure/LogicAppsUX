import type { RootState } from '../../../../core';
import { useSelectedNodeId } from '../../../../core/state/panel/panelSelectors';
import { useIconUri, useOperationInfo } from '../../../../core/state/selectors/actionMetadataSelector';
import { useNodeDisplayName } from '../../../../core/state/workflow/workflowSelectors';
import { addEdgeFromRunAfter, removeEdgeFromRunAfter } from '../../../../core/state/workflow/workflowSlice';
import { Menu, MenuTrigger, MenuList, MenuPopover, MenuButton, Label, MenuItemCheckbox, Input, Button } from '@fluentui/react-components';
import { bundleIcon, Add20Regular, Add20Filled, Search24Regular, Dismiss24Regular } from '@fluentui/react-icons';
import Fuse from 'fuse.js';
import { useState, useMemo } from 'react';
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
      .filter(([, op]: [string, LogicAppsV2.ActionDefinition]) => !!op.runAfter?.[node ?? ''])
      .map(([key]) => key);
    successors = [...successors, ...newNodes];
    nodes = [...nodes, ...newNodes];
  }
  return [...new Set(successors)];
};

const ActionMenuItem = ({ id }: { id: string; value: LogicAppsV2.ActionDefinition }) => {
  const operationInfo = useOperationInfo(id);
  const iconUri = useIconUri(operationInfo);
  const actionName = useNodeDisplayName(id);
  return (
    <MenuItemCheckbox name="actions" value={id} icon={<img style={{ height: '24px', width: '24px' }} src={iconUri.result} alt="" />}>
      <Label style={{ overflow: 'hidden' }}>{actionName}</Label>
    </MenuItemCheckbox>
  );
};

export const RunAfterActionSelector = () => {
  const intl = useIntl();
  const [searchText, setSearchText] = useState<string>('');
  const currentNodeId = useSelectedNodeId();
  const currentNodeRunAfter = useSelector((state: RootState) => {
    return state.workflow.operations[currentNodeId];
  });
  const actions = useSelector((state: RootState) => {
    if (!currentNodeRunAfter) {
      return [];
    }
    const subNodes = getSuccessorNodes(state, currentNodeId);
    return (Object.entries(state.workflow.operations) as [string, LogicAppsV2.ActionDefinition][])
      .filter(([key]) => {
        return state.workflow.nodesMetadata[currentNodeId].graphId === state.workflow.nodesMetadata[key].graphId;
      })
      .filter(([key]) => !subNodes.includes(key) && key !== currentNodeId)
      .map(([key, value]) => {
        return {
          ...value,
          id: key,
        };
      });
  });
  const RUN_AFTER_CONFIGURATION_FILTER_ACTIONS = intl.formatMessage({ defaultMessage: 'Filter Actions', description: 'Filter Actions' });
  const RUN_AFTER_CONFIGURATION_SELECT_ACTIONS_TITLE = intl.formatMessage({
    defaultMessage: 'Select Actions',
    description: 'Select Actions',
  });

  const selectedValues = useSelector((state: RootState) => {
    return { actions: Object.keys((state.workflow.operations[currentNodeId] as LogicAppsV2.ActionDefinition).runAfter ?? {}) };
  });

  const dispatch = useDispatch();

  const searchResults = useMemo(() => {
    if (!searchText) {
      return [];
    }
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
      onOpenChange={() => setSearchText('')}
      onCheckedValueChange={(e, data) => {
        const newItems = data.checkedItems.filter((x) => !selectedValues.actions.includes(x));
        const removedItems = selectedValues.actions.filter((x) => !data.checkedItems.includes(x));
        removedItems.forEach((item) => {
          dispatch(
            removeEdgeFromRunAfter({
              parentOperationId: item,
              childOperationId: currentNodeId,
            })
          );
        });
        newItems.forEach((item) => {
          dispatch(
            addEdgeFromRunAfter({
              parentOperationId: item,
              childOperationId: currentNodeId,
            })
          );
        });
      }}
    >
      <MenuTrigger>
        <MenuButton icon={<AddIcon />} size="large" appearance="transparent">
          {RUN_AFTER_CONFIGURATION_SELECT_ACTIONS_TITLE}
        </MenuButton>
      </MenuTrigger>

      <MenuPopover>
        <Input
          className="msla-run-after-action-search-input"
          contentBefore={<Search24Regular />}
          contentAfter={
            <Button
              icon={<Dismiss24Regular />}
              appearance="transparent"
              onClick={() => {
                setSearchText('');
              }}
            />
          }
          placeholder={RUN_AFTER_CONFIGURATION_FILTER_ACTIONS}
          value={searchText}
          onChange={(_, data) => {
            setSearchText(data.value);
          }}
        />
        <MenuList>
          <div className="msla-run-after-action-menu-list">
            {(searchResults.length > 0 ? searchResults : actions).map((obj) => {
              return <ActionMenuItem id={obj.id} key={obj.id} value={obj} />;
            })}
          </div>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
};
