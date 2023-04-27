import { useId } from '../useId';
import { Icon, IconButton, TooltipHost } from '@fluentui/react';
import type { IIconStyles } from '@fluentui/react';
import { useIntl } from 'react-intl';

export enum PickerItemType {
  FOLDER = 'folder',
  FILE = 'file',
}

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

export interface FileItem {
  displayName: string;
  mediaType: PickerItemType;
  isParent?: boolean;
  value: any;
  onSelect: (selectedObject: any) => void;
  onNavigation: (selectedObject: any) => void;
}

export const PickerItem = (props: FileItem) => {
  return props.mediaType === PickerItemType.FOLDER || props.isParent ? <FolderItem {...props} /> : <FileItem {...props} />;
};

const FileItem = ({ displayName, onSelect }: FileItem) => {
  const { iconName, styles } = iconInfo.file;
  return (
    <button className="msla-button msla-file" onClick={onSelect} title={displayName}>
      <Icon iconName={iconName} styles={styles} />
      <div className="msla-text">{displayName}</div>
    </button>
  );
};
const FolderItem = ({ displayName, mediaType, value, onSelect, onNavigation }: FileItem) => {
  const isFolderType = mediaType === PickerItemType.FOLDER;
  const selectionSectionTabIndex = isFolderType ? 0 : -1;
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
        onClick={() => onSelect(value)}
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
          onClick={() => onNavigation(value)}
        />
      </TooltipHost>
    </div>
  );
};
