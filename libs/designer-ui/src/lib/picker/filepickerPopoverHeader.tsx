import type { FilePickerBreadcrumb } from './types';
import type { PartitionBreadcrumbItems } from '@fluentui/react-components';
import {
  Breadcrumb,
  BreadcrumbButton,
  BreadcrumbDivider,
  BreadcrumbItem,
  Button,
  makeStyles,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Overflow,
  OverflowDivider,
  OverflowItem,
  partitionBreadcrumbItems,
  Tooltip,
  useArrowNavigationGroup,
  useOverflowMenu,
  useRestoreFocusTarget,
} from '@fluentui/react-components';
import { MoreHorizontalRegular } from '@fluentui/react-icons';
import React, { useMemo } from 'react';
import { useIntl } from 'react-intl';

const MAX_PRIORITY = 999;
const MIN_ITEMS_TO_SHOW = 2;
const NO_OVERFLOW_LIMIT = 999;
const OVERFLOW_START_INDEX = 1;

interface FilePickerPopoverHeaderProps {
  currentPathSegments: FilePickerBreadcrumb[];
}

const OverflowGroupDivider: React.FC<{
  groupId: number;
}> = (props) => {
  const { groupId } = props;

  return (
    <OverflowDivider groupId={`${groupId}`}>
      <BreadcrumbDivider data-group={groupId} />
    </OverflowDivider>
  );
};

const useStyles = makeStyles({
  breadcrumb: {
    overflowX: 'hidden',
  },
  breadcrumbButton: {
    justifyContent: 'flex-start',
  },
});

const FilePickerPopoverHeaderItem: React.FC<{ index: number; item: FilePickerBreadcrumb; isLast: boolean }> = (props) => {
  const { index, item, isLast } = props;

  const classNames = useStyles();

  const firstButtonFocusAttributes = useRestoreFocusTarget();
  const focusAttributes = index === 0 ? firstButtonFocusAttributes : {};

  const itemId = item.key;
  const groupId = index;
  const groupIdString = `${groupId}`;

  return (
    <React.Fragment key={`FilePicker.breadcrumb.${itemId}`}>
      <OverflowItem groupId={groupIdString} id={itemId} priority={index === 0 ? MAX_PRIORITY : index}>
        <BreadcrumbItem>
          <BreadcrumbButton className={classNames.breadcrumbButton} current={isLast} onClick={item.onSelect} {...focusAttributes}>
            <span>{item.text}</span>
          </BreadcrumbButton>
        </BreadcrumbItem>
      </OverflowItem>
      {isLast ? null : <OverflowGroupDivider groupId={groupId} />}
    </React.Fragment>
  );
};

const FilePickerPopoverOverflowMenu: React.FC<{ items: FilePickerBreadcrumb[] }> = (props) => {
  const intl = useIntl();

  const { items } = props;
  const { isOverflowing, overflowCount, ref } = useOverflowMenu<HTMLButtonElement>();

  if (!isOverflowing) {
    return null;
  }

  const overflowItems = items.slice(OVERFLOW_START_INDEX, OVERFLOW_START_INDEX + overflowCount);
  const overflowItemsLength = overflowItems.length;

  if (overflowItemsLength === 0) {
    return null;
  }

  const moreTooltipMessage = intl.formatMessage({
    defaultMessage: 'More…',
    id: 'dIYzFU',
    description: 'Tooltip text for the "..." menu that you select to show more items',
  });

  const moreItemsSingularMessage = intl.formatMessage(
    {
      defaultMessage: '{overflowItemsLength} more item',
      id: 'IlyNs0',
      description: 'Message to show when exactly 1 item is present in the overflow menu',
    },
    {
      overflowItemsLength,
    }
  );

  const moreItemsPluralMessage = intl.formatMessage(
    {
      defaultMessage: '{overflowItemsLength} more items',
      id: 'gaHI0k',
      description: 'Message to show when 0 or more than 2 items are present in the overflow menu',
    },
    {
      overflowItemsLength,
    }
  );

  return (
    <>
      <BreadcrumbItem>
        <Menu>
          <MenuTrigger disableButtonEnhancement={true}>
            <Tooltip content={moreTooltipMessage} relationship="label" withArrow={true}>
              <Button
                appearance="subtle"
                aria-label={overflowItemsLength === 1 ? moreItemsSingularMessage : moreItemsPluralMessage}
                icon={<MoreHorizontalRegular />}
                ref={ref}
                role="button"
              />
            </Tooltip>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              {overflowItems.map((item) => (
                <MenuItem id={item.key} key={item.key} onClick={item.onSelect} persistOnClick={true}>
                  {item.text}
                </MenuItem>
              ))}
            </MenuList>
          </MenuPopover>
        </Menu>
      </BreadcrumbItem>
      <BreadcrumbDivider />
    </>
  );
};

const FilePickerPopoverBreadcrumbs: React.FC<FilePickerPopoverHeaderProps> = (props) => {
  const { currentPathSegments } = props;

  const partitionedBreadcrumbItems: PartitionBreadcrumbItems<FilePickerBreadcrumb> = useMemo(
    () =>
      partitionBreadcrumbItems({
        items: currentPathSegments,
        maxDisplayedItems: NO_OVERFLOW_LIMIT,
        overflowIndex: OVERFLOW_START_INDEX,
      }),
    [currentPathSegments]
  );

  const { startDisplayedItems, endDisplayedItems = [] } = partitionedBreadcrumbItems;

  const startBasePriority = 200;
  const endBasePriority = 100;

  const mergedDisplayedItems = [...startDisplayedItems, ...endDisplayedItems];
  const lastItemKey = mergedDisplayedItems[mergedDisplayedItems.length - 1]?.key;

  return (
    <>
      {startDisplayedItems.map((segment, index) => (
        <FilePickerPopoverHeaderItem
          key={`FilePicker.breadcrumb.${segment.key}`}
          index={startBasePriority + index}
          item={segment}
          isLast={segment.key === lastItemKey}
        />
      ))}
      <FilePickerPopoverOverflowMenu items={mergedDisplayedItems} />
      {endDisplayedItems.map((segment, index) => (
        <FilePickerPopoverHeaderItem
          key={`FilePicker.breadcrumb.${segment.key}`}
          index={endBasePriority + index}
          item={segment}
          isLast={segment.key === lastItemKey}
        />
      ))}
    </>
  );
};

export const FilePickerPopoverHeader: React.FC<FilePickerPopoverHeaderProps> = (props) => {
  const classNames = useStyles();
  const focusAttributes = useArrowNavigationGroup({ axis: 'horizontal' });

  return (
    <Overflow minimumVisible={MIN_ITEMS_TO_SHOW}>
      <Breadcrumb {...focusAttributes} className={classNames.breadcrumb}>
        <FilePickerPopoverBreadcrumbs {...props} />
      </Breadcrumb>
    </Overflow>
  );
};
