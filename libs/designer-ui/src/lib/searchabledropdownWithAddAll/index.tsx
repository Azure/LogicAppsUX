import { SearchableDropdown } from '../searchabledropdown';
import type { SearchableDropdownProps } from '../searchabledropdown';
import { TooltipHost, Link, Stack, Label } from '@fluentui/react';
import type { FC } from 'react';

export interface SearchableDropdownWithAddAllProps extends SearchableDropdownProps {
  addAllButtonText?: string;
  addAllButtonTooltip?: string;
  addAllButtonEnabled?: boolean;
  removeAllButtonText?: string;
  removeAllButtonTooltip?: string;
  removeAllButtonEnabled?: boolean;
  label?: string;
  onShowAllClick?: () => void;
  onHideAllClick?: () => void;
}

export const SearchableDropdownWithAddAll: FC<SearchableDropdownWithAddAllProps> = ({
  addAllButtonTooltip,
  addAllButtonText,
  addAllButtonEnabled,
  removeAllButtonTooltip,
  removeAllButtonText,
  removeAllButtonEnabled,
  label,
  onShowAllClick,
  onHideAllClick,
  ...searchableDropdownProps
}): JSX.Element => {
  const handleShowAll = () => onShowAllClick?.();
  const handleRemoveAll = () => onHideAllClick?.();

  const renderButton = (handler: () => void, text?: string, tooltip?: string, enabled?: boolean, dataAutomationId?: string) => {
    return text ? (
      <TooltipHost content={tooltip}>
        <Link onClick={handler} underline disabled={enabled} className="msla-dropdown-control-button" data-automation-id={dataAutomationId}>
          {text}
        </Link>
      </TooltipHost>
    ) : null;
  };

  return (
    <>
      {label && <Label className="msla-searchable-dropdown-label">{label}</Label>}
      <Stack horizontal>
        <SearchableDropdown {...searchableDropdownProps} className="msla-searchable-dropdown-with-buttons" />
        {renderButton(handleShowAll, addAllButtonText, addAllButtonTooltip, !(addAllButtonEnabled ?? true), 'msla-add-all-button')}
        {renderButton(
          handleRemoveAll,
          removeAllButtonText,
          removeAllButtonTooltip,
          !(removeAllButtonEnabled ?? true),
          'msla-remove-all-button'
        )}
      </Stack>
    </>
  );
};
