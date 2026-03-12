import type { AppDispatch } from '../../../../../core/state/knowledge/store';
import {
  TemplatesSection,
  type TemplatesSectionItem,
  type KnowledgeTabProps,
  type KnowledgeConnectionTabProps,
} from '@microsoft/designer-ui';
import type { IntlShape } from 'react-intl';
import { closePanel } from '../../../../../core/state/knowledge/panelSlice';
import Constants from '../../../../../common/constants';
import { useState, useCallback, useMemo, type FormEvent, useEffect } from 'react';
import {
  getPropertyValue,
  isEmptyString,
  ConnectionParameterTypes,
  type ConnectionParameterSetParameter,
  filterRecord,
  ConnectionParameterEditorService,
  type ConnectionParameterSets,
} from '@microsoft/logic-apps-shared';
import { useCreatePanelStyles } from '../../styles';
import { Label, Text, tokens } from '@fluentui/react-components';
import ConnectionMultiAuthInput from '../../../../panel/connectionsPanel/createConnection/formInputs/connectionMultiAuth';
import {
  type ConnectionParameterProps,
  UniversalConnectionParameter,
} from '../../../../panel/connectionsPanel/createConnection/formInputs/universalConnectionParameter';
import type { IComboBoxStyles, IDropdownStyles, ITextFieldStyles } from '@fluentui/react';

export const basicsTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  connectionParameters: ConnectionParameterSets,
  connectionParameterValues: Record<string, any>,
  setConnectionParameterValues: (values: Record<string, any>) => void,
  isCreating: boolean,
  { isPrimaryButtonDisabled, tabStatusIcon, onPrimaryButtonClick }: KnowledgeConnectionTabProps
): KnowledgeTabProps => ({
  id: Constants.KNOWLEDGE_PANEL_TAB_NAMES.BASICS,
  title: intl.formatMessage({
    defaultMessage: 'Basics',
    id: 'g3DKT8',
    description: 'The tab label for basics tab for quick app create panel',
  }),
  tabStatusIcon,
  content: (
    <Basics
      intl={intl}
      connectionParameterValues={connectionParameterValues}
      setConnectionParameterValues={setConnectionParameterValues}
      connectionParameterSets={connectionParameters}
    />
  ),
  disabled: isCreating,
  footerContent: {
    buttonContents: [
      {
        type: 'navigation',
        text: intl.formatMessage({
          defaultMessage: 'Close',
          id: 'FTrMxN',
          description: 'Button text for closing the panel',
        }),
        onClick: () => {
          dispatch(closePanel());
        },
        disabled: isCreating,
      },
      {
        type: 'navigation',
        text: intl.formatMessage({
          defaultMessage: 'Next',
          id: 'ZWnmOv',
          description: 'Button text for moving to the next tab in the connector panel',
        }),
        onClick: () => {
          onPrimaryButtonClick?.();
        },
        appearance: 'primary',
        disabled: isPrimaryButtonDisabled || isCreating,
      },
    ],
  },
});

export const comboboxStyles: IComboBoxStyles = {
  root: {
    borderRadius: tokens.borderRadiusMedium,
    height: tokens.spacingVerticalXXXL,
    lineHeight: tokens.spacingVerticalXXXL,
    fontSize: tokens.fontSizeBase300,

    selectors: {
      ':active': {
        border: '1px solid green',
        borderBottomColor: 'green',
        borderRadius: tokens.borderRadiusMedium,
      },
    },
  },
} as unknown as IComboBoxStyles;
export const dropdownStyles = {
  dropdown: {
    height: `${tokens.spacingVerticalXXXL} !important`,
  },
  caretDown: {
    lineHeight: tokens.lineHeightBase600,
  },
  dropdownOptionText: {
    fontSize: tokens.fontSizeBase300,
  },
  title: {
    border: 'none',
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase600,
  },
  root: {
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
    borderBottomColor: tokens.colorNeutralStrokeAccessible,
    borderRadius: tokens.borderRadiusMedium,
  },
} as IDropdownStyles;
export const secretFieldStyles = {
  fieldGroup: {
    minHeight: '24px',
    height: 'inherit',
  },
} as ITextFieldStyles;

const Basics = ({
  intl,
  connectionParameterSets,
  connectionParameterValues,
  setConnectionParameterValues,
}: {
  intl: IntlShape;
  connectionParameterSets: ConnectionParameterSets;
  connectionParameterValues: Record<string, any>;
  setConnectionParameterValues: (values: Record<string, any>) => void;
}) => {
  const styles = useCreatePanelStyles();
  const INTL_TEXT = {
    detailsTitle: intl.formatMessage({
      defaultMessage: 'Details',
      id: 'flNr70',
      description: 'Title for the connection details section in basics tab for quick app create panel',
    }),
    detailsDescription: intl.formatMessage({
      defaultMessage: 'Provide a display name for your connection. You can edit this later.',
      id: 'RYovpU',
      description: 'Description for the connection details section in basics tab for quick app create panel',
    }),
    nameLabel: intl.formatMessage({
      defaultMessage: 'Display Name',
      id: 'UeILhA',
      description: 'Label for the name field in basics tab for quick app create panel',
    }),
    namePlaceholder: intl.formatMessage({
      defaultMessage: 'Enter a display name for your connection',
      id: 'LoLMyj',
      description: 'Placeholder for the name field in basics tab for quick app create panel',
    }),
    nameError: intl.formatMessage({
      defaultMessage: 'Name is required',
      id: 'wCEMpJ',
      description: 'Error message when name field is left empty in basics tab for quick app create panel',
    }),
    databaseTitle: intl.formatMessage({
      defaultMessage: 'Database',
      id: '6+XmJg',
      description: 'Title for the database section in basics tab for quick app create panel',
    }),
    databaseDescription: intl.formatMessage({
      defaultMessage: 'Set up a database for your knowledge base.',
      id: '9o9MIz',
      description: 'Description for the database section in basics tab for quick app create panel',
    }),
  };

  const [operationParameterValues, setOperationParameterValues] = useState<Record<string, any>>({});
  const [name, setName] = useState<string | undefined>(connectionParameterValues.displayName);
  const [selectedParamSetIndex, setSelectedParamSetIndex] = useState<number>(
    getSelectedAuthIndex(connectionParameterSets, connectionParameterValues.cosmosDBAuthenticationType)
  );
  const [parameterValues, setParameterValues] = useState<Record<string, any>>(connectionParameterValues);
  const authType = useMemo(
    () => connectionParameterSets?.values[selectedParamSetIndex]?.name,
    [connectionParameterSets, selectedParamSetIndex]
  );

  useEffect(() => {
    if (authType) {
      setOperationParameterValues({ authType });
      setConnectionParameterValues((values: Record<string, any>) => ({ ...values, cosmosDBAuthenticationType: authType })); // Set authType in connection parameter values as well so that it can be used for showing/hiding parameters based on auth type
    }
  }, [authType, setConnectionParameterValues]);

  const handleParametersChange = useCallback(
    (values: Record<string, any>) => {
      setParameterValues(values);
      setConnectionParameterValues(values);
    },
    [setConnectionParameterValues]
  );

  const allParameters = useMemo(
    () => connectionParameterSets?.values[selectedParamSetIndex]?.parameters ?? {},
    [connectionParameterSets, selectedParamSetIndex]
  );

  const isParamVisible = useCallback(
    (parameter: ConnectionParameterSetParameter) => {
      const constraints = parameter?.uiDefinition?.constraints;
      if (constraints?.hidden === 'true' || constraints?.hideInUI === 'true') {
        return false;
      }
      const dependentParam = constraints?.dependentParameter;
      if (dependentParam?.parameter && getPropertyValue(parameterValues, dependentParam.parameter) !== dependentParam.value) {
        return false;
      }
      if (parameter.type === ConnectionParameterTypes.oauthSetting) {
        return false;
      }
      if (parameter.type === ConnectionParameterTypes.managedIdentity) {
        return false;
      }
      return true;
    },
    [parameterValues]
  );

  const parameters: Record<string, ConnectionParameterSetParameter> = useMemo(
    () => filterRecord<any>(allParameters, (_, value) => isParamVisible(value)),
    [allParameters, isParamVisible]
  );

  const onAuthDropdownChange = useCallback(
    (_event: FormEvent<HTMLDivElement>, item: any): void => {
      if (item.key !== selectedParamSetIndex) {
        setSelectedParamSetIndex(item.key as number);
        handleParametersChange(name !== undefined ? { displayName: name } : {}); // Clear out the config params from previous set
      }
    },
    [handleParametersChange, name, selectedParamSetIndex]
  );

  const styleOverrides = useMemo(
    () => ({
      combobox: comboboxStyles,
      dropdown: dropdownStyles,
      secretField: secretFieldStyles,
    }),
    []
  );
  const renderConnectionParameter = useCallback(
    (key: string, parameter: ConnectionParameterSetParameter) => {
      const connectionParameterProps: ConnectionParameterProps = {
        parameterKey: key,
        parameter,
        value: parameterValues[key],
        setValue: (val: any) => handleParametersChange((values: Record<string, any>) => ({ ...values, [key]: val })),
        parameterSet: connectionParameterSets?.values[selectedParamSetIndex],
        setKeyValue: (customKey: string, val: any) =>
          handleParametersChange((values: Record<string, any>) => ({ ...values, [customKey]: val })),
        parameterValues: parameterValues,
        operationParameterValues,
        cssOverrides: { field: styles.paramField, label: styles.paramLabel },
        styleOverrides,
      };

      const customParameterOptions = ConnectionParameterEditorService()?.getConnectionParameterEditor({
        connectorId: '/placeholder/knowledgehub',
        parameterKey: key,
      });
      if (customParameterOptions) {
        const CustomConnectionParameter = customParameterOptions.EditorComponent;
        return <CustomConnectionParameter key={key} data-testId={key} {...connectionParameterProps} />;
      }

      return <UniversalConnectionParameter key={key} data-testId={key} {...connectionParameterProps} />;
    },
    [
      parameterValues,
      connectionParameterSets?.values,
      selectedParamSetIndex,
      operationParameterValues,
      styles.paramField,
      styles.paramLabel,
      styleOverrides,
      handleParametersChange,
    ]
  );

  const handleNameChange = useCallback(
    (name: string) => {
      setName(name);
      setConnectionParameterValues((values: Record<string, any>) => ({ ...values, displayName: name }));
    },
    [setConnectionParameterValues]
  );

  const items: TemplatesSectionItem[] = useMemo(
    () => [
      {
        label: INTL_TEXT.nameLabel,
        value: name,
        type: 'textfield',
        placeholder: INTL_TEXT.namePlaceholder,
        required: true,
        onChange: handleNameChange,
        errorMessage: name !== undefined && isEmptyString(name) ? INTL_TEXT.nameError : undefined,
      },
    ],
    [name, handleNameChange, INTL_TEXT.nameLabel, INTL_TEXT.namePlaceholder, INTL_TEXT.nameError]
  );

  return (
    <div className={styles.container}>
      <TemplatesSection
        title={INTL_TEXT.detailsTitle}
        description={INTL_TEXT.detailsDescription}
        items={items}
        cssOverrides={{ sectionItem: styles.sectionItem }}
      />

      <div className="msla-templates-section">
        <Label className="msla-templates-section-title">{INTL_TEXT.databaseTitle}</Label>
        <Text className="msla-templates-section-description">{INTL_TEXT.databaseDescription}</Text>

        <div className="msla-templates-section-items">
          <ConnectionMultiAuthInput
            data-testId={'connection-multi-auth-input'}
            isLoading={false}
            value={selectedParamSetIndex}
            onChange={onAuthDropdownChange}
            connectionParameterSets={connectionParameterSets}
            cssOverrides={{ field: styles.paramField, label: styles.paramLabel, dropdown: styles.dropdown }}
            styleOverrides={styleOverrides}
          />
          {Object.entries(parameters)?.map(([key, parameter]: [string, ConnectionParameterSetParameter]) => {
            return renderConnectionParameter(key, parameter);
          })}
        </div>
      </div>
    </div>
  );
};

export const getSelectedAuthIndex = (connectionParameterSets: ConnectionParameterSets, authType?: string): number => {
  if (!authType) {
    return 0;
  }
  const index = connectionParameterSets?.values.findIndex((paramSet) => paramSet.name === authType);
  return index !== undefined && index >= 0 ? index : 0;
};
