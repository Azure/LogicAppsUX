import { useId } from '../useId';
import { Icon, IconButton, TooltipHost } from '@fluentui/react';
import type { IIconStyles } from '@fluentui/react';
import type { TreeDynamicValue } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';

export const PickerItemType = {
  FOLDER: 'folder',
  FILE: 'file',
} as const;
export type PickerItemType = (typeof PickerItemType)[keyof typeof PickerItemType];

const iconInfo = {
  file: {
    iconName: 'TextDocument',
    styles: {
      root: {
        fontSize: 24,
        padding: '12px 0 0 8px',
      },
    },
  },

  navigate: {
    iconProps: {
      iconName: 'ChevronRight',
    },
  },
};

const folderIconStyles: IIconStyles = {
  root: {
    fontSize: 24,
    position: 'relative',
    bottom: '5px',
    padding: '0px 8px 0px 0px',
    transform: 'scale(-1, 1)',
  },
};

export interface FileItemProps extends TreeDynamicValue {
  onSelect: (item: TreeDynamicValue) => void;
  onNavigation: (item: TreeDynamicValue) => void;
}

export const PickerItem = (props: FileItemProps) => {
  return props.isParent ? <FolderItem {...props} /> : <FileItem {...props} />;
};

const FileItem = ({ displayName, value, mediaType, isParent, onSelect }: FileItemProps) => {
  const { iconName, styles } = iconInfo.file;
  return (
    <button className="msla-button msla-file" onClick={() => onSelect({ value, displayName, isParent, mediaType })} title={displayName}>
      <Icon iconName={iconName} styles={styles} />
      <div className="msla-text">{displayName}</div>
    </button>
  );
};
const FolderItem = ({ displayName, isParent, value, mediaType, onSelect, onNavigation }: FileItemProps) => {
  const selectionSectionTabIndex = isParent ? 0 : -1;
  const { iconProps: navigateIconProps } = iconInfo.navigate;
  const navId = useId();
  const intl = useIntl();
  const navMessage = intl.formatMessage(
    {
      defaultMessage: 'Navigate to {folderName} folder',
      description: 'a label that shows which folder the user will be able to dig deeper into',
    },
    {
      folderName: displayName,
    }
  );
  return (
    <div className="msla-folder">
      <button
        className="msla-button msla-selection-section"
        title={displayName}
        tabIndex={selectionSectionTabIndex}
        onClick={() => onSelect({ value, displayName, isParent, mediaType })}
      >
        <Icon iconName={'FabricFolder'} styles={folderIconStyles} />
        <div className="msla-text">{displayName}</div>
      </button>
      <TooltipHost calloutProps={{ target: `#${navId}` }} content={navMessage}>
        <IconButton
          ariaLabel={navMessage}
          className="msla-navigate-button"
          id={navId}
          iconProps={navigateIconProps}
          onClick={() => onNavigation({ value, displayName, isParent, mediaType })}
        />
      </TooltipHost>
    </div>
  );
};
