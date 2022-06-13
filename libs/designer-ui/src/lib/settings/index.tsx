import constants from '../constants';
import { isHighContrastBlack } from '../utils/theme';
import {
  MultiSelectSetting,
  MultiAddExpressionEditor,
  ExpressionsEditor,
  Expressions,
  Expression,
  ReactiveToggle,
  CustomValueSlider,
  SettingTextField,
  SettingToggle,
  SettingDictionary,
  SettingTokenTextField,
} from './settingsection';
import type {
  MultiSelectSettingProps,
  MultiAddExpressionEditorProps,
  ExpressionsEditorProps,
  ExpressionsProps,
  ExpressionProps,
  ReactiveToggleProps,
  CustomValueSliderProps,
  SettingTextFieldProps,
  SettingTokenTextFieldProps,
  SettingToggleProps,
  SettingDictionaryProps,
} from './settingsection';
import { Separator, useTheme, Icon, IconButton, TooltipHost } from '@fluentui/react';
import type { IIconStyles, IIconProps } from '@fluentui/react';
import type { FC } from 'react';
import { useCallback, useState } from 'react';
import { useIntl } from 'react-intl';

// Using discriminated union to create a dependency of SettingType and SettingProp
export type Settings =
  | {
      settingType: 'MultiSelectSetting';
      settingProp: MultiSelectSettingProps;
    }
  | {
      settingType: 'MultiAddExpressionEditor';
      settingProp: MultiAddExpressionEditorProps;
    }
  | {
      settingType: 'ExpressionsEditor';
      settingProp: ExpressionsEditorProps;
    }
  | {
      settingType: 'Expressions';
      settingProp: ExpressionsProps;
    }
  | {
      settingType: 'Expression';
      settingProp: ExpressionProps;
    }
  | {
      settingType: 'ReactiveToggle';
      settingProp: ReactiveToggleProps;
    }
  | {
      settingType: 'CustomValueSlider';
      settingProp: CustomValueSliderProps;
    }
  | {
      settingType: 'SettingTextField';
      settingProp: SettingTextFieldProps;
    }
  | {
      settingType: 'SettingToggle';
      settingProp: SettingToggleProps;
    }
  | {
      settingType: 'SettingDictionary';
      settingProp: SettingDictionaryProps;
    }
  | {
      settingType: 'SettingTokenTextField';
      settingProp: SettingTokenTextFieldProps;
    };

export interface SettingSectionProps {
  id?: string;
  title?: string;
  showHeading?: boolean;
  expanded?: boolean;
  settings: Settings[];
  isReadOnly?: boolean;
}

// TODO (andrewfowose #13363298): create component with dynamic addition of setting keys and values, (dictionary)

export const SettingsSection: FC<SettingSectionProps> = ({ title = 'Settings', showHeading = true, expanded, isReadOnly, settings }) => {
  const [expandedState, setExpanded] = useState(!!expanded);
  const theme = useTheme();
  const isInverted = isHighContrastBlack() || theme.isInverted;

  const handleClick = useCallback(() => {
    setExpanded(!expandedState);
  }, [expandedState]);

  const separatorStyles = {
    root: { color: isInverted ? constants.SETTING_SEPARATOR_COLOR_DARK : constants.SETTING_SEPARATOR_COLOR_LIGHT },
  };
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

  const internalSettings = (
    <>
      {expandedState || !showHeading ? renderSettings(settings, isReadOnly) : null}
      <Separator className="msla-setting-section-separator" styles={separatorStyles} />
    </>
  );
  if (!showHeading) {
    return internalSettings;
  }
  return (
    <div className="msla-setting-section">
      <div className="msla-setting-section-content">
        <button className="msla-setting-section-header" onClick={handleClick}>
          <Icon
            className="msla-setting-section-header-icon"
            ariaLabel={expandedState ? `${collapseAriaLabel} ${title}` : `${expandAriaLabel} ${title}`}
            iconName={expandedState ? 'ChevronDownMed' : 'ChevronRightMed'}
            styles={{ root: { fontSize: 14, color: isInverted ? 'white' : constants.CHEVRON_ROOT_COLOR_LIGHT } }}
          />
          <div className={headerTextClassName}>{title}</div>
        </button>
        {internalSettings}
      </div>
    </div>
  );
};

const renderSettings = (settings: Settings[], isReadOnly?: boolean): JSX.Element => {
  return (
    <div className="msla-setting-section-settings">
      {settings?.map((setting, i) => {
        const { settingType, settingProp } = setting;
        const { visible } = settingProp;
        if (!settingProp.readOnly) {
          settingProp.readOnly = isReadOnly;
        }
        if (!visible) {
          // eslint-disable-next-line array-callback-return
          return;
        }
        const renderSetting = (): JSX.Element | null => {
          switch (settingType) {
            case 'MultiSelectSetting':
              return settingProp.visible ? <MultiSelectSetting {...settingProp} /> : null;
            case 'MultiAddExpressionEditor':
              return settingProp.visible ? <MultiAddExpressionEditor {...settingProp} /> : null;
            case 'ExpressionsEditor':
              return settingProp.visible ? <ExpressionsEditor {...settingProp} /> : null;
            case 'Expressions':
              return settingProp.visible ? <Expressions {...settingProp} /> : null;
            case 'Expression':
              return settingProp.visible ? <Expression {...settingProp} /> : null;
            case 'ReactiveToggle':
              return settingProp.visible ? <ReactiveToggle {...settingProp} /> : null;
            case 'CustomValueSlider':
              return settingProp.visible ? <CustomValueSlider {...settingProp} /> : null;
            case 'SettingTextField':
              return settingProp.visible ? <SettingTextField {...settingProp} /> : null;
            case 'SettingToggle':
              return settingProp.visible ? <SettingToggle {...settingProp} /> : null;
            case 'SettingDictionary':
              return settingProp.visible ? <SettingDictionary {...settingProp} /> : null;
            case 'SettingTokenTextField':
              return <SettingTokenTextField {...settingProp} />;
            default:
              return null;
          }
        };
        return (
          <div key={i} className="msla-setting-section-setting">
            {renderSetting()}
          </div>
        );
      })}
    </div>
  );
};

export interface SettingLabelProps {
  labelText: string;
  infoTooltipText?: string;
  isChild: boolean;
}

const infoIconProps: IIconProps = {
  iconName: 'Info',
};

const infoIconStyles: IIconStyles = {
  root: {
    color: '#8d8686',
  },
};

export function SettingLabel({ labelText, infoTooltipText, isChild }: SettingLabelProps): JSX.Element {
  const className = isChild ? 'msla-setting-section-row-child-label' : 'msla-setting-section-row-label';
  if (infoTooltipText) {
    return (
      <div className={className}>
        <div className="msla-setting-section-row-text">{labelText}</div>
        <TooltipHost hostClassName="msla-setting-section-row-info" content={infoTooltipText}>
          <IconButton iconProps={infoIconProps} styles={infoIconStyles} className="msla-setting-section-row-info-icon" />
        </TooltipHost>
      </div>
    );
  }
  return <div className={className}>{labelText}</div>;
}
