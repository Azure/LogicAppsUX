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
import { useState, useCallback, useMemo, type FormEvent } from 'react';
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
import { Label, Text } from '@fluentui/react-components';
import ConnectionMultiAuthInput from '../../../../panel/connectionsPanel/createConnection/formInputs/connectionMultiAuth';
import {
  type ConnectionParameterProps,
  UniversalConnectionParameter,
} from '../../../../panel/connectionsPanel/createConnection/formInputs/universalConnectionParameter';

export const basicsTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  connectionParameters: ConnectionParameterSets,
  setConnectionParameterValues: (values: Record<string, any>) => void,
  { isTabDisabled, isPrimaryButtonDisabled, tabStatusIcon, onPrimaryButtonClick }: KnowledgeConnectionTabProps
): KnowledgeTabProps => ({
  id: Constants.KNOWLEDGE_PANEL_TAB_NAMES.BASICS,
  title: intl.formatMessage({
    defaultMessage: 'Basics',
    id: 'g3DKT8',
    description: 'The tab label for basics tab for quick app create panel',
  }),
  tabStatusIcon,
  content: (
    <Basics intl={intl} setConnectionParameterValues={setConnectionParameterValues} connectionParameterSets={connectionParameters} />
  ),
  disabled: isTabDisabled,
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
        disabled: isPrimaryButtonDisabled,
      },
    ],
  },
});

const Basics = ({
  intl,
  connectionParameterSets,
  setConnectionParameterValues,
}: {
  intl: IntlShape;
  connectionParameterSets: ConnectionParameterSets;
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

  const [name, setName] = useState<string | undefined>(undefined);
  const [selectedParamSetIndex, setSelectedParamSetIndex] = useState<number>(0);
  const [parameterValues, setParameterValues] = useState<Record<string, any>>({});

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
        handleParametersChange({}); // Clear out the config params from previous set
      }
    },
    [handleParametersChange, selectedParamSetIndex]
  );

  const renderConnectionParameter = (key: string, parameter: ConnectionParameterSetParameter) => {
    const connectionParameterProps: ConnectionParameterProps = {
      parameterKey: key,
      parameter,
      value: parameterValues[key],
      setValue: (val: any) => handleParametersChange((values: Record<string, any>) => ({ ...values, [key]: val })),
      parameterSet: connectionParameterSets?.values[selectedParamSetIndex],
      setKeyValue: (customKey: string, val: any) =>
        handleParametersChange((values: Record<string, any>) => ({ ...values, [customKey]: val })),
      parameterValues: parameterValues,
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
  };

  const items: TemplatesSectionItem[] = [
    {
      label: INTL_TEXT.nameLabel,
      value: name,
      type: 'textfield',
      placeholder: INTL_TEXT.namePlaceholder,
      required: true,
      onChange: setName,
      errorMessage: name !== undefined && isEmptyString(name) ? INTL_TEXT.nameError : undefined,
    },
  ];

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
      </div>

      <ConnectionMultiAuthInput
        data-testId={'connection-multi-auth-input'}
        isLoading={false}
        value={selectedParamSetIndex}
        onChange={onAuthDropdownChange}
        connectionParameterSets={connectionParameterSets}
      />
      {Object.entries(parameters)?.map(([key, parameter]: [string, ConnectionParameterSetParameter]) => {
        return renderConnectionParameter(key, parameter);
      })}
    </div>
  );
};
