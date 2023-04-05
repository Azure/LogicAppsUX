import type { PickerProps } from './picker';
import { useId } from '@fluentui/react-hooks';
import { Breadcrumb } from '@fluentui/react/lib/Breadcrumb';
import type { IButtonStyles } from '@fluentui/react/lib/Button';
import { IconButton } from '@fluentui/react/lib/Button';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import { useIntl } from 'react-intl';

const closeButtonStyles: IButtonStyles = {
  rootHovered: {
    backgroundColor: 'transparent',
  },
  rootPressed: {
    backgroundColor: 'transparent',
  },
};

export const PickerHeader = ({ onCancel, currentPathSegments }: Pick<PickerProps, 'onCancel' | 'currentPathSegments'>) => {
  const closeId = useId();
  const intl = useIntl();
  const closeText = intl.formatMessage({
    defaultMessage: 'Close',
    description: 'Label for a button that closes a dialog callout',
  });
  return (
    <div className="msla-picker-header">
      <div className="msla-picker-breadcrumb">
        <Breadcrumb items={currentPathSegments} maxDisplayedItems={3} />
      </div>
      <TooltipHost content={closeText} calloutProps={{ target: `#${closeId}` }}>
        <IconButton
          id={closeId}
          ariaLabel={closeText}
          className="msla-picker-close msla-button"
          iconProps={{
            iconName: 'Cancel',
          }}
          styles={closeButtonStyles}
          onClick={onCancel}
        />
      </TooltipHost>
    </div>
  );
};
