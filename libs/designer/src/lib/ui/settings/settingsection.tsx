import type { HeaderClickHandler, SettingSectionName } from '.';
import constants from '../../common/constants';
import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { updateParameterConditionalVisibility } from '../../core/state/operation/operationMetadataSlice';
import { useSelectedNodeId } from '../../core/state/panel/panelSelectors';
import type { RunAfterProps } from './sections/runafterconfiguration';
import { RunAfter } from './sections/runafterconfiguration';
import { CustomizableMessageBar } from './validation/errorbar';
import type { ValidationError } from './validation/validation';
import { ValidationErrorType } from './validation/validation';
import type { IDropdownOption } from '@fluentui/react';
import { Separator, useTheme, Icon } from '@fluentui/react';
import { Button, Divider, Tooltip } from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { MessageBarType } from '@fluentui/react/lib/MessageBar';
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
  SearchableDropdownWithAddAll,
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
  ChangeState,
} from '@microsoft/designer-ui';
import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

const ClearIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

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
  onDismiss?: WarningDismissHandler;
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
  onDismiss,
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
        ? (validationErrors ?? []).map(({ key: errorKey, errorType, message }, i) => {
            return (
              <CustomizableMessageBar
                key={i}
                type={matchErrorTypeToMessageBar(errorType)}
                message={message}
                onWarningDismiss={onDismiss ? () => onDismiss?.(errorKey) : undefined}
              />
            );
          })
        : null}
      {showSeparator ? <Separator className="msla-setting-section-separator" styles={separatorStyles} /> : null}
    </>
  );
  if (!showHeading) {
    return internalSettings;
  }
  const handleSectionClick = (sectionName?: SettingSectionName): void => {
    if (onHeaderClick && sectionName) {
      onHeaderClick(sectionName);
    }
  };

  return (
    <div className="msla-setting-section">
      <div className="msla-setting-section-content">
        <button className="msla-setting-section-header" onClick={() => handleSectionClick(sectionName as SettingSectionName | undefined)}>
          <Icon
            className="msla-setting-section-header-icon"
            aria-label={expanded ? `${collapseAriaLabel} ${title}` : `${expandAriaLabel} ${title}`}
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

const Setting = ({ id, settings, isReadOnly }: { id?: string; settings: Settings[]; isReadOnly?: boolean }): JSX.Element => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const nodeId = useSelectedNodeId();
  const readOnly = useReadOnly();
  const [hideErrorMessage, setHideErrorMessage] = useState<boolean[]>(new Array(settings.length).fill(false));

  const updateHideErrorMessage = (index: number, b: boolean) => {
    setHideErrorMessage([...hideErrorMessage.slice(0, index), b, ...hideErrorMessage.slice(index + 1)]);
  };

  const allConditionalSettings = useMemo(
    () => settings.filter((setting) => (setting.settingProp as any).conditionalVisibility !== undefined),
    [settings]
  );

  const conditionallyInvisibleSettings = useMemo(
    () => settings.filter((setting) => (setting.settingProp as any).conditionalVisibility === false),
    [settings]
  );

  const addNewParamText = intl.formatMessage(
    {
      defaultMessage: 'Showing {countShowing} of {countTotal}',
      description: 'Placeholder text for the number of advanced parameters showing',
    },
    {
      countShowing: allConditionalSettings.length - conditionallyInvisibleSettings.length,
      countTotal: allConditionalSettings.length,
    }
  );

  const addAllButtonText = intl.formatMessage({
    defaultMessage: 'Show all',
    description: 'Button text to add all advanced parameters',
  });
  const removeAllButtonText = intl.formatMessage({
    defaultMessage: 'Clear all',
    description: 'Button text to clear all advanced parameters',
  });
  const addAllButtonTooltip = intl.formatMessage({
    defaultMessage: 'Show all advanced parameters',
    description: 'Button tooltip to add all advanced parameters',
  });
  const removeAllButtonTooltip = intl.formatMessage({
    defaultMessage: 'Remove and clear all advanced parameters and their values',
    description: 'Button tooltip to remove all advanced parameters',
  });
  const advancedParametersLabel = intl.formatMessage({
    defaultMessage: 'Advanced parameters',
    description: 'The label for advanced parameters',
  });

  const renderSetting = (setting: Settings, i: number) => {
    const { settingType, settingProp, visible = true } = setting;
    const { id: parameterId, conditionalVisibility, readOnly, validationErrors } = settingProp as any;
    if (!readOnly) settingProp.readOnly = isReadOnly;
    const errorMessage = validationErrors?.reduce((acc: string, message: any) => acc + message + ' ', '');

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
          return (
            <SettingTokenField
              {...{
                hideValidationErrors: (newState: ChangeState) => {
                  updateHideErrorMessage(i, newState.viewModel.hideErrorMessage);
                },
                ...settingProp,
              }}
            />
          );
        case 'RunAfter':
          return <RunAfter {...settingProp} />;
        case 'SettingDropdown':
          return <SettingDropdown {...settingProp} />;
        default:
          return null;
      }
    };

    const removeParamCallback = () => {
      dispatch(updateParameterConditionalVisibility({ nodeId, groupId: id ?? '', parameterId, value: false }));
    };

    const removeParamTooltip = intl.formatMessage(
      {
        defaultMessage: "Remove parameter ''{parameterName}'' and its value",
        description:
          'Tooltip for button to remove parameter. Do not remove the double single quotes around the display name, as it is needed to wrap the placeholder text.',
      },
      { parameterName: (settingProp as any).label }
    );

    return visible && conditionalVisibility !== false ? (
      <div key={i} style={{ display: 'flex', gap: '4px' }}>
        <div className={getClassName()} style={{ flex: '1 1 auto' }}>
          {renderSetting()}
          {errorMessage && !hideErrorMessage[i] && (
            <span className="msla-input-parameter-error" role="alert">
              {errorMessage}
            </span>
          )}
        </div>
        {!readOnly && conditionalVisibility === true ? (
          <Tooltip relationship="label" content={removeParamTooltip}>
            <Button
              appearance="subtle"
              onClick={removeParamCallback}
              icon={<ClearIcon />}
              style={{ marginTop: '30px', color: 'var(--colorBrandForeground1)', height: '32px' }}
            />
          </Tooltip>
        ) : null}
      </div>
    ) : null;
  };

  return (
    <div className="msla-setting-section-settings">
      {/* Render Required, Important, or Parameters with Values*/}
      {settings?.filter((setting) => (setting.settingProp as any).conditionalVisibility === undefined).map(renderSetting)}
      {/* Render the dropdown list of advanced parameters */}
      {allConditionalSettings.length > 0 && !readOnly ? (
        <div style={{ padding: '24px 0px 16px' }}>
          <Divider style={{ padding: '16px 0px' }} />
          <SearchableDropdownWithAddAll
            dropdownProps={{
              multiSelect: true,
              options: conditionallyInvisibleSettings.map(
                (setting): IDropdownOption => ({
                  key: (setting.settingProp as any).id,
                  text: (setting.settingProp as any).label ?? '',
                })
              ),
              placeholder: addNewParamText,
            }}
            onItemSelectionChanged={(parameterId, value) => {
              dispatch(updateParameterConditionalVisibility({ nodeId, groupId: id ?? '', parameterId, value }));
            }}
            onShowAllClick={() =>
              conditionallyInvisibleSettings.forEach((setting) =>
                dispatch(
                  updateParameterConditionalVisibility({
                    nodeId,
                    groupId: id ?? '',
                    parameterId: (setting.settingProp as any).id,
                    value: true,
                  })
                )
              )
            }
            onHideAllClick={() =>
              allConditionalSettings.forEach(
                (setting) =>
                  (setting.settingProp as any).conditionalVisibility &&
                  dispatch(
                    updateParameterConditionalVisibility({
                      nodeId,
                      groupId: id ?? '',
                      parameterId: (setting.settingProp as any).id,
                      value: false,
                    })
                  )
              )
            }
            addAllButtonText={addAllButtonText}
            addAllButtonTooltip={addAllButtonTooltip}
            addAllButtonEnabled={conditionallyInvisibleSettings.length > 0}
            removeAllButtonText={removeAllButtonText}
            removeAllButtonTooltip={removeAllButtonTooltip}
            removeAllButtonEnabled={conditionallyInvisibleSettings.length !== allConditionalSettings.length}
            label={advancedParametersLabel}
          />
        </div>
      ) : null}
      {/* Render all advanced parameters that are conditionally visible */}
      {settings?.filter((setting) => (setting.settingProp as any).conditionalVisibility === true).map(renderSetting)}
    </div>
  );
};

const matchErrorTypeToMessageBar = (errorType: ValidationErrorType): MessageBarType => {
  switch (errorType) {
    case ValidationErrorType.ERROR:
      return MessageBarType.error;
    case ValidationErrorType.WARNING:
      return MessageBarType.warning;
    case ValidationErrorType.INFO:
      return MessageBarType.info;
    default:
      return MessageBarType.info;
  }
};
