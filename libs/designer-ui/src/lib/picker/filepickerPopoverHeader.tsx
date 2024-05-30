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
  useOverflowMenu,
} from '@fluentui/react-components';
import { MoreHorizontalRegular } from '@fluentui/react-icons';
import React from 'react';

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

  const itemId = item.key;
  const groupId = index;

  return (
    <React.Fragment key={`FilePicker.breadcrumb.${itemId}`}>
      <OverflowItem groupId={`${groupId}`} id={itemId} priority={index === 0 ? 999 : index}>
        <BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbButton current={isLast} onClick={item.onSelect}>
              {item.text}
            </BreadcrumbButton>
          </BreadcrumbItem>
        </BreadcrumbItem>
      </OverflowItem>
      {isLast ? null : <OverflowGroupDivider groupId={groupId} />}
    </React.Fragment>
  );
};

const FilePickerPopoverBreadcrumbs: React.FC<FilePickerPopoverHeaderProps> = (props) => {
  const { currentPathSegments } = props;

  const { isOverflowing, overflowCount, ref } = useOverflowMenu<HTMLButtonElement>();

  const { startDisplayedItems, overflowItems, endDisplayedItems }: PartitionBreadcrumbItems<FilePickerBreadcrumb> =
    partitionBreadcrumbItems({
      items: currentPathSegments,
      maxDisplayedItems: currentPathSegments.length - (isOverflowing ? overflowCount : 0),
    });

  const endDisplayedItemsStartIndex = startDisplayedItems.length + (overflowItems?.length ?? 0);

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
              <Tooltip content={'More' /* TODO */} relationship="label" withArrow={true}>
                <Button
                  appearance="subtle"
                  aria-label={`${overflowItems?.length} more items` /* TODO */}
                  icon={<MoreHorizontalRegular />}
                  ref={ref}
                  role="button"
                />
              </Tooltip>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                {overflowItems?.map((item) => (
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
  return (
    <Overflow minimumVisible={2}>
      <Breadcrumb>
        <FilePickerPopoverBreadcrumbs {...props} />
      </Breadcrumb>
    </Overflow>
  );
};
