import type { CallbackHandler } from '..';
import { PickerHeader } from './pickerHeader';
import type { FileItem } from './pickerItem';
import { PickerItem } from './pickerItem';
import { Spinner } from '@fluentui/react';
import type { IBreadcrumbItem } from '@fluentui/react/lib/Breadcrumb';
import type { ICalloutContentStyles } from '@fluentui/react/lib/Callout';
import { FocusTrapCallout } from '@fluentui/react/lib/Callout';
import { useIntl } from 'react-intl';

const calloutStyles: Partial<ICalloutContentStyles> = {
  container: {
    zIndex: 1,
  },
  calloutMain: {
    maxHeight: 430,
    width: 400,
    overflow: 'hidden',
  },
};

export interface PickerProps {
  visible: boolean;
  anchorId: string;
  currentPathSegments: IBreadcrumbItem[];
  files: FileItem[];
  loadingFiles?: boolean;
  onCancel?: CallbackHandler;
  handleFolderNavigation?: CallbackHandler;
  handleTitleSelected?: CallbackHandler;
  fetchPickerItems?: (isRoot?: boolean) => void;
}

export const Picker = ({ visible, onCancel, anchorId, currentPathSegments, files, loadingFiles }: PickerProps) => {
  const intl = useIntl();
  const loadingMessage = intl.formatMessage({
    defaultMessage: 'Loading Files...',
    description: 'Loading indicator message showing that the UX is getting the next list of files',
  });
  const handleDismiss = (e?: Event | React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>): void => {
    e?.preventDefault();
    if (onCancel) {
      onCancel();
    }
  };
  return (
    <FocusTrapCallout
      alignTargetEdge={true}
      className="msla-picker"
      target={`#${anchorId}`}
      hidden={!visible}
      styles={calloutStyles}
      setInitialFocus={true}
      onDismiss={handleDismiss}
      focusTrapProps={{
        isClickableOutsideFocusTrap: true,
      }}
    >
      <PickerHeader onCancel={handleDismiss} currentPathSegments={currentPathSegments} />
      {loadingFiles ? (
        <div style={{ margin: '20px' }}>
          <Spinner label={loadingMessage} />
        </div>
      ) : (
        <ul className="msla-picker-items">
          {files.map((file) => (
            <li key={file.text} className="msla-item">
              <PickerItem text={file.text} type={file.type} onNavigation={file.onNavigation} onSelect={file.onSelect} />
            </li>
          ))}
        </ul>
      )}
    </FocusTrapCallout>
  );
};
