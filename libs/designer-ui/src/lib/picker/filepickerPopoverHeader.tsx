import type React from 'react';
import type { FilePickerBreadcrumb } from './types';
import type { PartitionBreadcrumbItems } from '@fluentui/react-components';
import {
  Breadcrumb,
  BreadcrumbButton,
  BreadcrumbDivider,
  BreadcrumbItem,
  OverflowDivider,
  partitionBreadcrumbItems,
} from '@fluentui/react-components';

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
      {overflowItems?.length ? '... >' : null}
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
