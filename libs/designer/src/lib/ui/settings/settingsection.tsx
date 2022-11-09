import type { HeaderClickHandler } from '.';
import constants from '../../common/constants';
import { updateParameterConditionalVisibility } from '../../core/state/operation/operationMetadataSlice';
import { useSelectedNodeId } from '../../core/state/panel/panelSelectors';
import { type ValidationError, ValidationWarningKeys } from '../../core/state/settingSlice';
import type { RunAfterProps } from './sections/runafterconfiguration';
import { RunAfter } from './sections/runafterconfiguration';
import { CustomizableMessageBar } from './validation/errorbar';
import { Separator, useTheme, Icon, IconButton, TooltipHost, Dropdown } from '@fluentui/react';
import { MessageBarType } from '@fluentui/react/lib/MessageBar';
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
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

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

type WarningDismissHandler = (key?: string, message?: string) => void;
export interface SettingsSectionProps {
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
  onWarningDismiss?: WarningDismissHandler;
}

export const SettingsSection: FC<SettingsSectionProps> = ({
  id,
  title = 'Settings',
  sectionName,
  showHeading = true,
  showSeparator = true,
  expanded,
  isReadOnly,
  settings,
  onHeaderClick,
  validationErrors,
  onWarningDismiss,
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

  const internalSettings = (
    <>
      {expanded || !showHeading ? <Setting id={id} isReadOnly={isReadOnly} settings={settings} /> : null}
      {expanded
        ? (validationErrors ?? []).map(({ key: errorKey, message }) => {
            if (
              errorKey === ValidationWarningKeys.CANNOT_DELETE_LAST_ACTION ||
              errorKey === ValidationWarningKeys.CANNOT_DELETE_LAST_STATUS
            ) {
              return (
                <CustomizableMessageBar
                  key={guid()}
                  type={MessageBarType.warning}
                  message={message}
                  onWarningDismiss={() => onWarningDismiss?.(errorKey)}
                />
              );
            }
            return <CustomizableMessageBar key={guid()} type={MessageBarType.error} message={message} />;
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
          <div className="msla-setting-section-header-text">{title}</div>
        </button>
        {internalSettings}
      </div>
    </div>
  );
};

const Setting = ({
  id,
  settings,
  isReadOnly,
}: {
  id?: string;
  settings: Settings[];
  isReadOnly?: boolean;
  validationErrors?: ValidationError[];
}): JSX.Element => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const nodeId = useSelectedNodeId();

  const conditionalVisibilityHiddenSettings = useMemo(
    () => settings.filter((setting) => (setting.settingProp as any).conditionalVisibility === false),
    [settings]
  );

  const [conditionalVisibilityTempArray, setConditionalVisibilityTempArray] = useState<string[]>([]);

  return (
    <div className="msla-setting-section-settings">
      {settings?.map((setting, i) => {
        const { settingType, settingProp, visible = true } = setting;
        const parameterId = (settingProp as any).id;
        const conditionalVisibility = (settingProp as any).conditionalVisibility;
        if (!settingProp.readOnly) {
          settingProp.readOnly = isReadOnly;
        }
        const getClassName = (): string =>
          settingType === 'RunAfter'
            ? 'msla-setting-section-run-after-setting'
            : settingType === 'MultiAddExpressionEditor'
            ? 'msla-setting-section-expression-field'
            : 'msla-setting-section-setting';
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

        const removeParamCallback = () => {
          // Remove parameter value from state
          dispatch(updateParameterConditionalVisibility({ nodeId, groupId: id ?? '', parameterId, value: false }));
        };

        const removeParamTooltip = intl.formatMessage(
          {
            defaultMessage: 'Remove parameter "{parameterName}" and its value',
            description: 'Tooltip for remove parameter button',
          },
          { parameterName: (settingProp as any).label }
        );

        const RemoveConditionalParameter = () => {
          return conditionalVisibility === true ? (
            <div style={{ marginTop: '30px' }}>
              <TooltipHost content={removeParamTooltip}>
                <IconButton iconProps={{ iconName: 'Cancel' }} onClick={removeParamCallback} />
              </TooltipHost>
            </div>
          ) : null;
        };

        return visible && conditionalVisibility !== false ? (
          <div key={i} style={{ display: 'flex', gap: '4px' }}>
            <div className={getClassName()} style={{ flex: '1 1 auto' }}>
              {renderSetting()}
            </div>
            <RemoveConditionalParameter />
          </div>
        ) : null;
      })}

      {conditionalVisibilityHiddenSettings.length > 0 ? (
        <Dropdown
          placeholder="Add new parameters"
          multiSelect
          options={conditionalVisibilityHiddenSettings.map((setting) => ({
            key: (setting.settingProp as any).id,
            text: (setting.settingProp as any).label,
          }))}
          style={{ marginTop: '24px' }}
          selectedKeys={conditionalVisibilityTempArray}
          onChange={(_e: any, item: any) => {
            if (item?.key) setConditionalVisibilityTempArray([...conditionalVisibilityTempArray, item.key]);
          }}
          onDismiss={() => {
            conditionalVisibilityTempArray.forEach((parameterId) => {
              dispatch(updateParameterConditionalVisibility({ nodeId, groupId: id ?? '', parameterId, value: true }));
            });
            setConditionalVisibilityTempArray([]);
          }}
        />
      ) : null}
    </div>
  );
};

export interface SettingLabelProps {
  labelText: string;
  infoTooltipText?: string;
  isChild: boolean;
}

export function SettingLabel({ labelText, infoTooltipText, isChild }: SettingLabelProps): JSX.Element {
  const className = isChild ? 'msla-setting-section-row-child-label' : 'msla-setting-section-row-label';
  if (infoTooltipText) {
    return (
      <div className={className}>
        <div className="msla-setting-section-row-text">{labelText}</div>
        <TooltipHost hostClassName="msla-setting-section-row-info" content={infoTooltipText}>
          <IconButton
            className="msla-setting-section-row-info-icon"
            iconProps={{ iconName: 'Info' }}
            styles={{ root: { color: '#8d8686' } }}
          />
        </TooltipHost>
      </div>
    );
  }
  return <div className={className}>{labelText}</div>;
}
