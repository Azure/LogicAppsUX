import type { HeaderClickHandler } from '.';
import constants from '../../common/constants';
import { type ValidationError, ValidationErrorKeys } from '../../core/state/settingSlice';
import type { RunAfterProps } from './sections/runafterconfiguration';
import { RunAfter } from './sections/runafterconfiguration';
import { ErrorBar, WarningBar } from './validation/errorbar';
import { Separator, useTheme, Icon, IconButton, TooltipHost } from '@fluentui/react';
import type { IIconStyles, IIconProps } from '@fluentui/react';
import { guid } from '@microsoft-logic-apps/utils';
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
  SettingTokenField,
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
        settingType: 'SettingTokenField';
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

type ErrorDismissHandler = (key?: string, message?: string) => void;
export interface SettingSectionProps {
  id?: string;
  title?: string;
  sectionName?: string;
  showHeading?: boolean;
  showSeparator?: boolean;
  expanded?: boolean;
  settings: Settings[];
  isReadOnly?: boolean;
  onHeaderClick?: HeaderClickHandler;
  validationErrors?: ValidationError[];
  onErrorDismiss?: ErrorDismissHandler;
}

export const SettingsSection: FC<SettingSectionProps> = ({
  title = 'Settings',
  sectionName,
  showHeading = true,
  showSeparator = true,
  expanded,
  isReadOnly,
  settings,
  onHeaderClick,
  validationErrors,
  onErrorDismiss,
}) => {
  const theme = useTheme();
  const isInverted = isHighContrastBlack() || theme.isInverted;

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
      {expanded || !showHeading ? <Setting isReadOnly={isReadOnly} settings={settings} /> : null}
      {expanded
        ? (validationErrors ?? []).map((error) => {
            if (error.key === ValidationErrorKeys.CANNOT_DELETE_LAST_ACTION) {
              return <WarningBar key={guid()} message={error.message} onErrorDismiss={() => onErrorDismiss?.(error.key)} />;
            }
            return <ErrorBar key={guid()} message={error.message} />;
          })
        : null}
      {showSeparator ? <Separator className="msla-setting-section-separator" styles={separatorStyles} /> : null}
    </>
  );
  if (!showHeading) {
    return internalSettings;
  }
  const handleSectionClick = (sectionName: string | undefined): void => {
    if (onHeaderClick && sectionName) {
      onHeaderClick(sectionName);
    }
  };

  return (
    <div className="msla-setting-section">
      <div className="msla-setting-section-content">
        <button className="msla-setting-section-header" onClick={() => handleSectionClick(sectionName)}>
          <Icon
            className="msla-setting-section-header-icon"
            ariaLabel={expanded ? `${collapseAriaLabel} ${title}` : `${expandAriaLabel} ${title}`}
            iconName={expanded ? 'ChevronDownMed' : 'ChevronRightMed'}
            styles={{ root: { fontSize: 14, color: isInverted ? 'white' : constants.Settings.CHEVRON_ROOT_COLOR_LIGHT } }}
          />
          <div className={headerTextClassName}>{title}</div>
        </button>
        {internalSettings}
      </div>
    </div>
  );
};

const Setting = ({
  settings,
  isReadOnly,
}: {
  settings: Settings[];
  isReadOnly?: boolean;
  validationErrors?: ValidationError[];
}): JSX.Element => {
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
            case 'SettingTokenField':
              return <SettingTokenField {...settingProp} />;
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
