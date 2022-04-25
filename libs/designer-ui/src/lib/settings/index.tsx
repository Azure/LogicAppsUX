import constants from '../constants';
import { isHighContrastBlack } from '../utils/theme';
import { Separator, useTheme, IconButton } from '@fluentui/react';
import type { IIconProps } from '@fluentui/react';
import type { FormEvent } from 'react';
import { useCallback, useState } from 'react';
import { useIntl } from 'react-intl';

export type TextInputChangeHandler = (event: FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string | undefined) => void;

export interface SettingTextFieldProps {
  id: string;
  value: string;
  label: string;
  isReadOnly: boolean;
  onValueChange?: TextInputChangeHandler;
}

export interface SettingSectionComponentProps extends Record<string, any> {
  id: string;
  title: string;
  expanded: boolean;
  renderContent: React.FC<any>;
  isInverted: boolean;
  isReadOnly: boolean;
}

// TODO (andrewfowose #13363298): create component with dynamic addition of setting keys and values, (dictionary)

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
        color: isInverted ? 'white' : constants.CHEVRON_ROOT_COLOR_LIGHT,
      },
    },
  };
  const chevronStyles = { icon: { color: constants.CHEVRON_COLOR, fontSize: 12 } };
  const separatorStyles = {
    root: { color: isInverted ? constants.SETTING_SEPARATOR_COLOR_DARK : constants.SETTING_SEPARATOR_COLOR_LIGHT },
  };
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
  const headerTextClassName = isInverted ? 'msla-setting-section-header-text-dark' : 'msla-setting-section-header-text';

  return (
    <div className="msla-setting-section">
      <div className="msla-setting-section-content">
        <div className="msla-setting-section-header" onClick={handleClick}>
          <IconButton
            className="msla-setting-section-header-icon"
            ariaLabel={expandedState ? `${collapseAriaLabel} ${title}` : `${expandAriaLabel} ${title}`}
            iconProps={iconProps}
            styles={chevronStyles}
          />
          <button className={headerTextClassName}>{title}</button>
        </div>
        {children}
        <Separator className="msla-setting-section-separator" styles={separatorStyles} />
      </div>
    </div>
  );
}
