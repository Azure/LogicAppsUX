import { Separator, useTheme } from '@fluentui/azure-themes/node_modules/@fluentui/react';
import { IconButton, IIconProps } from '@fluentui/react';
import { FormEvent, useCallback, useState } from 'react';
import { useIntl } from 'react-intl';

import { SettingSectionComponentProps } from './settingsection';
import { isHighContrastBlack } from '../utils/theme';

export type TextInputChangeHandler = (event: FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string | undefined) => void;

export interface SettingTextFieldProps {
  id: string;
  value: string;
  label: string;
  isReadOnly: boolean;
  onValueChange?: TextInputChangeHandler;
}

// TODO (andrewfowose): create component with dynamic addition of setting keys and values, (dictionary)

export function SettingsSection({ title, expanded, renderContent, textFieldValue }: SettingSectionComponentProps): JSX.Element {
  const [expandedState, setExpanded] = useState(!!expanded);
  const theme = useTheme();
  const isInverted = isHighContrastBlack() || theme.isInverted;
  const handleClick = useCallback(() => {
    setExpanded(!expandedState);
  }, [expandedState]);

  const iconProps: IIconProps = {
    iconName: expandedState ? 'ChevronDownMed' : 'ChevronRightMed',
    styles: {
      root: {
        fontSize: 14,
        color: isInverted ? 'white' : '#514f4e',
      },
    },
  };
  const chevronStyles = { icon: { color: '#8a8886', fontSize: 12 } };
  const separatorStyles = { root: { color: isInverted ? '#323130' : '#eaeaea' } };
  const RenderContent = ({ value }: Partial<SettingTextFieldProps>): JSX.Element => {
    return <>{renderContent(value)}</>;
  };
  const children = expandedState && <RenderContent value={textFieldValue ?? ''} />;

  const intl = useIntl();
  const expandAriaLabel = intl.formatMessage({
    defaultMessage: 'Expand',
    description: 'An accessible label for expand toggle icon',
  });
  const collapseAriaLabel = intl.formatMessage({
    defaultMessage: 'Collapse',
    description: 'An accessible label for collapse toggle icon',
  });

  return (
    <div className="msla-setting-section">
      <div className="msla-setting-section-content">
        <div className="msla-setting-section-header" role="button" tabIndex={0} onClick={handleClick}>
          <IconButton
            className="msla-setting-section-header-icon"
            ariaLabel={expandedState ? `${collapseAriaLabel} ${title}` : `${expandAriaLabel} ${title}`}
            iconProps={iconProps}
            styles={chevronStyles}
          />
          <div className="msla-setting-section-header-text">{title}</div>
        </div>
        {children}
        <Separator className="msla-setting-section-separator" styles={separatorStyles} />
      </div>
    </div>
  );
}
