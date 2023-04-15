/* eslint-disable @typescript-eslint/no-empty-function */
import { useId } from '../useId';
import { Icon, IconButton, TooltipHost } from '@fluentui/react';
import { useIntl } from 'react-intl';

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
  folder: {
    iconName: 'FabricFolder',
    styles: {
      root: {
        fontSize: 24,
        padding: '12px 8px 0 0',
        transform: 'scale(-1, 1)',
      },
    },
  },
  navigate: {
    iconProps: {
      iconName: 'ChevronRight',
    },
  },
};

const FOLDER_TYPE = 'folder';

export interface FileItem {
  text: string;
  type: 'folder' | 'file';
  value: any;
  onSelect?: () => void;
  onNavigation?: () => void;
}

export const PickerItem = (props: FileItem) => {
  return props.type === FOLDER_TYPE ? <FolderItem {...props} /> : <FileItem {...props} />;
};

const FileItem = ({ text, onSelect }: FileItem) => {
  const { iconName, styles } = iconInfo.file;
  return (
    <button className="msla-button msla-file" onClick={onSelect} title={text}>
      <Icon iconName={iconName} styles={styles} />
      <div className="msla-text">{text}</div>
    </button>
  );
};
const FolderItem = ({ text, type, onSelect, onNavigation }: FileItem) => {
  const isFolderType = type === FOLDER_TYPE;
  const selectionSectionTabIndex = isFolderType ? 0 : -1;
  const { iconName, styles } = iconInfo.folder;
  const { iconProps: navigateIconProps } = iconInfo.navigate;
  const navId = useId();
  const intl = useIntl();
  const navMessage = intl.formatMessage(
    {
      defaultMessage: 'Navigate to {folderName} folder',
      description: 'a label that shows which folder the user will be able to dig deeper into',
    },
    {
      folderName: text,
    }
  );
  return (
    <div className="msla-folder">
      <button className="msla-button msla-selection-section" title={text} tabIndex={selectionSectionTabIndex} onClick={onSelect}>
        <Icon iconName={iconName} styles={styles} />
        <div className="msla-text">{text}</div>
      </button>
      <TooltipHost calloutProps={{ target: `#${navId}` }} content={navMessage}>
        <IconButton
          ariaLabel={navMessage}
          className="msla-navigate-button"
          id={navId}
          iconProps={navigateIconProps}
          onClick={onNavigation}
        />
      </TooltipHost>
    </div>
  );
};
