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
  SettingToggleProps,
} from './settingsection';
import { Separator, useTheme, Icon } from '@fluentui/react';
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
    };

export interface SettingSectionProps {
  id?: string;
  title?: string;
  expanded?: boolean;
  settings: Settings[];
  isReadOnly?: boolean;
}

// TODO (andrewfowose #13363298): create component with dynamic addition of setting keys and values, (dictionary)

export function SettingsSection({ title = 'Settings', expanded, isReadOnly, settings }: SettingSectionProps): JSX.Element {
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
        {expandedState ? renderSettings(settings, isReadOnly) : null}
        <Separator className="msla-setting-section-separator" styles={separatorStyles} />
      </div>
    </div>
  );
}

const renderSettings = (settings: Settings[], isReadOnly?: boolean): JSX.Element => {
  return (
    <div className="msla-settings-container">
      {settings?.map((setting, i) => {
        const { settingType, settingProp } = setting;
        if (!settingProp.readOnly) {
          settingProp.readOnly = isReadOnly;
        }
        const renderSetting = (): JSX.Element | null => {
          switch (settingType) {
            case 'MultiSelectSetting':
              return <MultiSelectSetting {...settingProp} />;
            case 'MultiAddExpressionEditor':
              return <MultiAddExpressionEditor {...settingProp} />;
            case 'ExpressionsEditor':
              return <ExpressionsEditor {...settingProp} />;
            case 'Expressions':
              return <Expressions {...settingProp} />;
            case 'Expression':
              return <Expression {...settingProp} />;
            case 'ReactiveToggle':
              return <ReactiveToggle {...settingProp} />;
            case 'CustomValueSlider':
              return <CustomValueSlider {...settingProp} />;
            case 'SettingTextField':
              return <SettingTextField {...settingProp} />;
            case 'SettingToggle':
              return <SettingToggle {...settingProp} />;
            default:
              return null;
          }
        };
        return (
          <div key={i} className="msla-setting-content">
            {renderSetting()}
          </div>
        );
      })}
    </div>
  );
};
