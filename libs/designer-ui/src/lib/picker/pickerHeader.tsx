import type { PickerProps } from './picker';
import { useId } from '@fluentui/react-hooks';
import type { IBreadcrumbStyles } from '@fluentui/react/lib/Breadcrumb';
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

const bedcrumbStyles: Partial<IBreadcrumbStyles> = {
  item: {
    fontSize: '14px',
    fontWeight: 400,
    '&:last-child': {
      fontSize: '14px',
    },
  },
  itemLink: {
    ':hover, :focus, :active, :hover:focus': {
      backgroundColor: 'transparent',
    },
  },
  overflowButton: {
    ':hover, :focus, :active, :hover:focus, &.is-expanded': {
      backgroundColor: 'transparent',
    },
  },
  root: {
    margin: 0,
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
        <Breadcrumb
          items={currentPathSegments}
          maxDisplayedItems={3}
          styles={bedcrumbStyles}
          overflowIndex={currentPathSegments.length > 3 ? 1 : undefined}
        />
      </div>
      <TooltipHost content={closeText} calloutProps={{ target: `#${closeId}` }}>
        <IconButton
          id={closeId}
          ariaLabel={closeText}
          className="msla-picker-close msla-button"
          iconProps={{
            iconName: 'Cancel',
          }}
          onClick={onCancel}
          styles={closeButtonStyles}
        />
      </TooltipHost>
    </div>
  );
};
