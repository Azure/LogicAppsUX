import type { FilePickerBreadcrumb } from './types';
import type { PartitionBreadcrumbItems } from '@fluentui/react-components';
import {
  Breadcrumb,
  BreadcrumbButton,
  BreadcrumbDivider,
  BreadcrumbItem,
  Button,
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
import React from 'react';
import { useIntl } from 'react-intl';

const MAX_PRIORITY = 999;

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

const FilePickerPopoverHeaderItem: React.FC<{ index: number; item: FilePickerBreadcrumb; isLast: boolean }> = (props) => {
  const { index, item, isLast } = props;

  const firstButtonFocusAttributes = useRestoreFocusTarget();
  const focusAttributes = index === 0 ? firstButtonFocusAttributes : {};

  const itemId = item.key;
  const groupId = index;

  return (
    <React.Fragment key={`FilePicker.breadcrumb.${itemId}`}>
      <OverflowItem groupId={`${groupId}`} id={itemId} priority={index === 0 ? MAX_PRIORITY : index}>
        <BreadcrumbItem>
          <BreadcrumbButton current={isLast} onClick={item.onSelect} {...focusAttributes}>
            {item.text}
          </BreadcrumbButton>
        </BreadcrumbItem>
      </OverflowItem>
      {isLast ? null : <OverflowGroupDivider groupId={groupId} />}
    </React.Fragment>
  );
};

const FilePickerPopoverBreadcrumbs: React.FC<FilePickerPopoverHeaderProps> = (props) => {
  const { currentPathSegments } = props;

  const intl = useIntl();

  const { ref } = useOverflowMenu<HTMLButtonElement>();

  const { startDisplayedItems, overflowItems, endDisplayedItems }: PartitionBreadcrumbItems<FilePickerBreadcrumb> =
    partitionBreadcrumbItems({
      items: currentPathSegments,
      maxDisplayedItems: 2,
    });

  const overflowItemsLength = overflowItems?.length ?? 0;
  const endDisplayedItemsStartIndex = startDisplayedItems.length + overflowItemsLength;

  const moreTooltipMessage = intl.formatMessage({
    defaultMessage: 'More…',
    id: 'TDfQzn',
    description: 'Tooltip text for the "..." menu that the user can click to reveal more items',
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
      {startDisplayedItems.map((segment, index) => (
        <FilePickerPopoverHeaderItem
          key={`FilePicker.breadcrumb.${segment.key}`}
          index={index}
          item={segment}
          isLast={index === currentPathSegments.length - 1}
        />
      ))}
      {overflowItems ? (
        <>
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
          <BreadcrumbDivider />
        </>
      ) : null}
      {endDisplayedItems?.map((segment, index) => (
        <FilePickerPopoverHeaderItem
          key={`FilePicker.breadcrumb.${segment.key}`}
          index={endDisplayedItemsStartIndex + index}
          item={segment}
          isLast={endDisplayedItemsStartIndex + index === currentPathSegments.length - 1}
        />
      ))}
    </>
  );
};

export const FilePickerPopoverHeader: React.FC<FilePickerPopoverHeaderProps> = (props) => {
  const focusAttributes = useArrowNavigationGroup({ axis: 'horizontal' });

  return (
    <Overflow minimumVisible={2}>
      <Breadcrumb {...focusAttributes}>
        <FilePickerPopoverBreadcrumbs {...props} />
      </Breadcrumb>
    </Overflow>
  );
};
