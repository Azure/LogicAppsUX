import { Icon } from '@fluentui/react/lib/Icon';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import * as React from 'react';
import { useIntl } from 'react-intl';

export interface ExpandConnectorsButtonProps {
  ariaLabel?: string;
  disabled?: boolean;
  visible: boolean;
  onExpandConnectorsClick?(): void;
}

export const ExpandConnectorsButton: React.FC<ExpandConnectorsButtonProps> = (props) => {
  const { visible } = props;
  const intl = useIntl();
  if (!visible) {
    return null;
  }

  const ariaLabelDefaultText = intl.formatMessage({
    defaultMessage: 'Expand list of connectors',
    id: 'b0Ar6Y',
    description: 'Accessability label on  a button to expand a list of connectors.',
  });
  const { ariaLabel = ariaLabelDefaultText, disabled = false, onExpandConnectorsClick } = props;
  return (
    <TooltipHost content={ariaLabel}>
      <button aria-label={ariaLabel} className="msla-expand-button" disabled={disabled} onClick={onExpandConnectorsClick}>
        <Icon iconName="ChevronDown" />
      </button>
    </TooltipHost>
  );
};
