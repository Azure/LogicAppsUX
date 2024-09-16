import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Popover, PopoverSurface, MenuList, MenuItem, MenuDivider } from '@fluentui/react-components';
import {
  LogEntryLevel,
  LoggerService,
  UiInteractionsService,
  guid,
  isUiInteractionsServiceEnabled,
  normalizeAutomationId,
  removeIdTag,
  replaceWhiteSpaceWithUnderscore,
} from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { useOnViewportChange } from '@xyflow/react';

import { useEdgeContextMenuData } from '../../../core/state/designerView/designerViewSelectors';
import { useNodeDisplayName, type AppDispatch } from '../../../core';
import { expandDiscoveryPanel } from '../../../core/state/panel/panelSlice';
import { retrieveClipboardData } from '../../../core/utils/clipboard';
import { CustomMenu } from './customMenu';

import {
  ArrowBetweenDown24Filled,
  ArrowBetweenDown24Regular,
  ArrowSplit24Filled,
  ArrowSplit24Regular,
  ClipboardPasteFilled,
  ClipboardPasteRegular,
  bundleIcon,
} from '@fluentui/react-icons';
import { PasteOperation } from '../OperationsCopyPaste/pasteOperation';

const AddIcon = bundleIcon(ArrowBetweenDown24Filled, ArrowBetweenDown24Regular);
const ParallelIcon = bundleIcon(ArrowSplit24Filled, ArrowSplit24Regular);
const ClipboardIcon = bundleIcon(ClipboardPasteFilled, ClipboardPasteRegular);

export const EdgeContextualMenu = () => {
  const intl = useIntl();

  const menuData = useEdgeContextMenuData();
  const graphId = useMemo(() => menuData?.graphId, [menuData]);
  const parentId = useMemo(() => menuData?.parentId, [menuData]);
  const childId = useMemo(() => menuData?.childId, [menuData]);
  const isLeaf = useMemo(() => menuData?.isLeaf, [menuData]);
  const location = useMemo(() => menuData?.location, [menuData]);

  const [open, setOpen] = useState<boolean>(false);
  useEffect(() => setOpen(!!menuData), [menuData]);

  useOnViewportChange({
    onStart: useCallback(() => open && setOpen?.(false), [open, setOpen]),
  });

  const dispatch = useDispatch<AppDispatch>();

  const addParallelBranch = useCallback(() => {
    const newId = guid();
    if (!graphId) {
      return;
    }
    const relationshipIds = { graphId, childId: undefined, parentId };
    dispatch(
      expandDiscoveryPanel({
        nodeId: newId,
        relationshipIds,
        isParallelBranch: true,
      })
    );
    LoggerService().log({
      area: 'DropZone:addParallelBranch',
      level: LogEntryLevel.Verbose,
      message: 'Side-panel opened to add a new parallel branch node.',
    });
  }, [dispatch, graphId, parentId]);

  const newActionText = intl.formatMessage({
    defaultMessage: 'Add an action',
    id: 'mCzkXX',
    description: 'Text for button to add a new action',
  });

  const newBranchText = intl.formatMessage({
    defaultMessage: 'Add a parallel branch',
    id: 'LZm3ze',
    description: 'Text for button to add a parallel branch',
  });

  const pasteFromClipboard = intl.formatMessage({
    defaultMessage: 'Paste an action',
    id: 'ZUCTVP',
    description: 'Text for button to paste an action from clipboard',
  });

  const openAddNodePanel = useCallback(() => {
    const newId = guid();
    if (!graphId) {
      return;
    }
    const relationshipIds = { graphId, childId, parentId };
    dispatch(expandDiscoveryPanel({ nodeId: newId, relationshipIds }));
    LoggerService().log({
      area: 'DropZone:openAddNodePanel',
      level: LogEntryLevel.Verbose,
      message: 'Side-panel opened to add a new node.',
    });
  }, [dispatch, graphId, childId, parentId]);

  const showParallelBranchButton = !isLeaf && parentId;

  const [isPasteEnabled, setIsPasteEnabled] = useState<boolean>(false);
  useEffect(() => {
    (async () => {
      if (!open) {
        return;
      }
      const copiedNode = await retrieveClipboardData();
      setIsPasteEnabled(!!copiedNode);
    })();
  }, [open]);

  const parentName = useNodeDisplayName(removeIdTag(parentId ?? ''));
  const childName = useNodeDisplayName(childId);

  const automationId = useCallback(
    (buttonName: string) =>
      normalizeAutomationId(
        `msla-${buttonName}-button-${replaceWhiteSpaceWithUnderscore(parentName)}-${
          replaceWhiteSpaceWithUnderscore(childName) || 'undefined'
        }`
      ),
    [parentName, childName]
  );

  const ref = useRef<HTMLDivElement>(null);

  return (
    <>
      <div ref={ref} style={{ position: 'fixed', top: location?.y, left: location?.x }} />
      <Popover
        onOpenChange={(_, data) => setOpen(data.open)}
        trapFocus
        open={open}
        withArrow={true}
        positioning={{ target: ref.current, position: 'after' }}
      >
        <PopoverSurface style={{ padding: '4px' }}>
          <MenuList onClick={() => setOpen(false)}>
            <MenuItem icon={<AddIcon />} onClick={openAddNodePanel} data-automation-id={automationId('add')}>
              {newActionText}
            </MenuItem>
            {showParallelBranchButton && (
              <MenuItem icon={<ParallelIcon />} onClick={addParallelBranch} data-automation-id={automationId('add-parallel')}>
                {newBranchText}
              </MenuItem>
            )}
            {isPasteEnabled && (
              <>
                <MenuDivider />
                <PasteOperation location="EdgeContextualMenu">
                  <MenuItem icon={<ClipboardIcon />} data-automation-id={automationId('paste')}>
                    {pasteFromClipboard}
                  </MenuItem>
                </PasteOperation>
              </>
            )}
            {isUiInteractionsServiceEnabled()
              ? UiInteractionsService()
                  .getAddButtonMenuItems?.({ graphId, parentId, childId })
                  ?.map((item) => <CustomMenu key={item.text} item={item} data-automation-id={automationId(`custom-menu-${item.text}`)} />)
              : null}
          </MenuList>
        </PopoverSurface>
      </Popover>
    </>
  );
};
