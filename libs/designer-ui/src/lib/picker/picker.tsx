import { PickerHeader } from './pickerHeader';
import { PickerItem } from './pickerItem';
import { Spinner } from '@fluentui/react';
import type { IBreadcrumbItem } from '@fluentui/react/lib/Breadcrumb';
import type { ICalloutContentStyles } from '@fluentui/react/lib/Callout';
import { FocusTrapCallout } from '@fluentui/react/lib/Callout';
import type { TreeDynamicValue } from '@microsoft/logic-apps-shared';
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
  files: TreeDynamicValue[];
  loadingFiles?: boolean;
  errorDetails?: { message: string };
  onCancel?: () => void;
  handleFolderNavigation: (item: TreeDynamicValue) => void;
  handleItemSelected: (item: TreeDynamicValue) => void;
}

export const Picker = ({
  visible,
  anchorId,
  currentPathSegments,
  files,
  loadingFiles,
  errorDetails,
  onCancel,
  handleItemSelected,
  handleFolderNavigation,
}: PickerProps) => {
  const intl = useIntl();
  const loadingMessage = intl.formatMessage({
    defaultMessage: 'Loading Files...',
    description: 'Loading indicator message showing that the UX is getting the next list of files',
  });
  const noItemsMessage = intl.formatMessage({
    defaultMessage: 'No items',
    description: 'Message to show when there are no items to show',
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
      ) : files.length > 0 ? (
        <ul className="msla-picker-items">
          {files.map((file, i) => (
            <li key={i} className="msla-item">
              <PickerItem
                displayName={file.displayName}
                mediaType={file.mediaType}
                onNavigation={handleFolderNavigation}
                onSelect={handleItemSelected}
                value={file.value}
                isParent={file.isParent}
              />
            </li>
          ))}
        </ul>
      ) : errorDetails?.message ? (
        <div className="msla-picker-items-error">{errorDetails.message}</div>
      ) : (
        <div className="msla-picker-no-items">{noItemsMessage}</div>
      )}
    </FocusTrapCallout>
  );
};
