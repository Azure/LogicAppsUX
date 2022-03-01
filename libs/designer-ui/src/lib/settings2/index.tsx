import { Separator, useTheme } from '@fluentui/azure-themes/node_modules/@fluentui/react';
import { IconButton, IIconProps } from '@fluentui/react';
import { FormEvent, useCallback, useState } from 'react';

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

// create component with dynamic addition of setting heys and values, (dictionary)

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
  const Resources = {
    EXPAND_OR_COLLAPSE: "Expand or collapse '{0}'",
    SETTING_CATEGORY_GENERAL_TITLE: 'General',
    SETTING_CATEGORY_RUN_AFTER_TITLE: 'Run After',
    SETTING_CATEGORY_NETWORKING_TITLE: 'Networking',
    SETTING_CATEGORY_DATA_HANDLING_TITLE: 'Data Handling',
    SETTING_CATEGORY_SECURITY_TITLE: 'Security',
    SETTING_CATEGORY_TRACKING_TITLE: 'Tracking',
  };
  const RenderContent = ({ value }: Partial<SettingTextFieldProps>): JSX.Element => {
    value = value ? value : '';
    return <>{renderContent(value)}</>;
  };
  const children =
    expandedState && textFieldValue ? <RenderContent value={textFieldValue} /> : expandedState ? <RenderContent value="" /> : null;

  return (
    <div className="msla-setting-section">
      <div className="msla-setting-section-content">
        <div className="msla-setting-section-header" role="button" tabIndex={0} onClick={handleClick}>
          <IconButton
            className="msla-setting-section-header-icon"
            ariaLabel={`Expand or collapse ${title}`}
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
