import constants from '../../common/constants';
import type { RunAfterProps } from './sections/runafterconfiguration';
import { RunAfter } from './sections/runafterconfiguration';
import { Separator, useTheme, Icon, IconButton, TooltipHost } from '@fluentui/react';
import type { IIconStyles, IIconProps } from '@fluentui/react';
import {
  isHighContrastBlack,
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
  SettingDropdown,
} from '@microsoft/designer-ui';
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
  SettingDropdownProps,
} from '@microsoft/designer-ui';
import type { FC } from 'react';
import { useCallback, useState } from 'react';
import { useIntl } from 'react-intl';

type SettingBase = {
  visible?: boolean;
};

export type Settings = SettingBase &
  (
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
      }
    | {
        settingType: 'RunAfter';
        settingProp: RunAfterProps;
      }
    | {
        settingType: 'SettingDropdown';
        settingProp: SettingDropdownProps;
      }
  );

export interface SettingSectionProps {
  id?: string;
  title?: string;
  showHeading?: boolean;
  showSeparator?: boolean;
  expanded?: boolean;
  settings: Settings[];
  isReadOnly?: boolean;
}

export const SettingsSection: FC<SettingSectionProps> = ({
  title = 'Settings',
  showHeading = true,
  showSeparator = true,
  expanded,
  isReadOnly,
  settings,
}) => {
  const [expandedState, setExpanded] = useState(!!expanded);
  const theme = useTheme();
  const isInverted = isHighContrastBlack() || theme.isInverted;

  const handleClick = useCallback(() => {
    setExpanded(!expandedState);
  }, [expandedState]);

  const separatorStyles = {
    root: { color: isInverted ? constants.Settings.SETTING_SEPARATOR_COLOR_DARK : constants.Settings.SETTING_SEPARATOR_COLOR_LIGHT },
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
      {showSeparator ? <Separator className="msla-setting-section-separator" styles={separatorStyles} /> : null}
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
            styles={{ root: { fontSize: 14, color: isInverted ? 'white' : constants.Settings.CHEVRON_ROOT_COLOR_LIGHT } }}
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
        const { settingType, settingProp, visible = true } = setting;
        if (!settingProp.readOnly) {
          settingProp.readOnly = isReadOnly;
        }
        const getClassName = (): string => {
          let className = 'msla-setting-section-setting';
          if (settingType === 'RunAfter') {
            className = 'msla-setting-section-run-after-setting';
            return className;
          } else if (settingType === 'MultiAddExpressionEditor') {
            className = 'msla-setting-section-expression-field';
            return className;
          }
          return className;
        };
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
            case 'SettingDictionary':
              return <SettingDictionary {...settingProp} />;
            case 'SettingTokenTextField':
              return <SettingTokenTextField {...settingProp} />;
            case 'RunAfter':
              return <RunAfter {...settingProp} />;
            case 'SettingDropdown':
              return <SettingDropdown {...settingProp} />;
            default:
              return null;
          }
        };
        return visible ? (
          <div key={i} className={getClassName()}>
            {renderSetting()}
          </div>
        ) : null;
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
