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
  OverflowDivider,
  partitionBreadcrumbItems,
  Tooltip,
} from '@fluentui/react-components';
import { MoreHorizontalRegular } from '@fluentui/react-icons';
import type React from 'react';

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

const OverflowMenu: React.FC<{
  overflowItems: readonly FilePickerBreadcrumb[] | undefined;
}> = (props) => {
  const { overflowItems } = props;

  if (!overflowItems?.length) {
    return null;
  }

  return (
    <>
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <Tooltip content={'More'} relationship="label" withArrow={true}>
            <Button appearance="subtle" aria-label={`${overflowItems.length} more items`} icon={<MoreHorizontalRegular />} role="button" />
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
  );
};

const FilePickerPopoverHeaderItem: React.FC<{ index: number; item: FilePickerBreadcrumb; isLast: boolean }> = (props) => {
  const { index, item, isLast } = props;

  return (
    <BreadcrumbItem>
      <BreadcrumbItem key={`FilePicker.breadcrumb.${item.key}`}>
        <BreadcrumbButton current={isLast} onClick={item.onSelect}>
          {item.text}
        </BreadcrumbButton>
      </BreadcrumbItem>
      {isLast ? null : <OverflowGroupDivider groupId={index} />}
    </BreadcrumbItem>
  );
};

export const FilePickerPopoverHeader: React.FC<FilePickerPopoverHeaderProps> = (props) => {
  const { currentPathSegments } = props;

  const { startDisplayedItems, overflowItems, endDisplayedItems }: PartitionBreadcrumbItems<FilePickerBreadcrumb> =
    partitionBreadcrumbItems({
      items: currentPathSegments,
      maxDisplayedItems: 3,
    });

  const endDisplayedItemsStartIndex = startDisplayedItems.length + (overflowItems?.length ?? 0);

  return (
    <Breadcrumb>
      {startDisplayedItems.map((segment, index) => (
        <FilePickerPopoverHeaderItem
          key={`FilePicker.breadcrumb.${segment.key}`}
          index={index}
          item={segment}
          isLast={index === currentPathSegments.length - 1}
        />
      ))}
      <OverflowMenu overflowItems={overflowItems} />
      {endDisplayedItems?.map((segment, index) => (
        <FilePickerPopoverHeaderItem
          key={`FilePicker.breadcrumb.${segment.key}`}
          index={endDisplayedItemsStartIndex + index}
          item={segment}
          isLast={endDisplayedItemsStartIndex + index === currentPathSegments.length - 1}
        />
      ))}
    </Breadcrumb>
  );
};
