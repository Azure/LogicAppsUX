import type { AppDispatch } from '../../../../../core/state/knowledge/store';
import type { KnowledgeConnectionTabProps, KnowledgeTabProps } from '@microsoft/designer-ui';
import type { IntlShape } from 'react-intl';
import { selectPanelTab } from '../../../../../core/state/knowledge/panelSlice';
import Constants from '../../../../../common/constants';
import {
  ConnectionParameterEditorService,
  type ConnectionParameterSetParameter,
  type ConnectionParameterSets,
  ConnectionParameterTypes,
  filterRecord,
  getPropertyValue,
} from '@microsoft/logic-apps-shared';
import { useCreatePanelStyles } from '../../styles';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Text } from '@fluentui/react-components';
import ConnectionMultiAuthInput from '../../../../panel/connectionsPanel/createConnection/formInputs/connectionMultiAuth';
import {
  type ConnectionParameterProps,
  UniversalConnectionParameter,
} from '../../../../panel/connectionsPanel/createConnection/formInputs/universalConnectionParameter';
import { comboboxStyles, dropdownStyles, getSelectedAuthIndex, secretFieldStyles } from './basics';

export const modelTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  connectionParameters: ConnectionParameterSets,
  connectionParameterValues: Record<string, any>,
  setConnectionParameterValues: (values: Record<string, any>) => void,
  isCreating: boolean,
  { isPrimaryButtonDisabled, tabStatusIcon, onPrimaryButtonClick }: KnowledgeConnectionTabProps
): KnowledgeTabProps => ({
  id: Constants.KNOWLEDGE_PANEL_TAB_NAMES.MODEL,
  title: intl.formatMessage({
    defaultMessage: 'Model',
    id: 'qlFQqe',
    description: 'The tab label for model tab for quick app create panel',
  }),
  tabStatusIcon,
  content: (
    <Model
      intl={intl}
      connectionParameterSets={connectionParameters}
      connectionParameterValues={connectionParameterValues}
      setConnectionParameterValues={setConnectionParameterValues}
    />
  ),
  disabled: isCreating,
  footerContent: {
    buttonContents: [
      {
        type: 'navigation',
        text: intl.formatMessage({
          defaultMessage: 'Previous',
          id: 'T1TsMb',
          description: 'Button text for moving to the previous tab in the connection panel',
        }),
        onClick: () => {
          dispatch(selectPanelTab(Constants.KNOWLEDGE_PANEL_TAB_NAMES.BASICS));
        },
      },
      {
        type: 'navigation',
        text: isCreating
          ? intl.formatMessage({
              defaultMessage: 'Creating...',
              id: '4I7gV9',
              description: 'Button text for creating the connection',
            })
          : intl.formatMessage({
              defaultMessage: 'Create',
              id: 'giDs3v',
              description: 'Button text for creating the connection',
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

const Model = ({
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
    description: intl.formatMessage({
      defaultMessage: 'Set up a model for your knowledge base.',
      id: 'snTAYI',
      description: 'Description for the model tab in create connection panel',
    }),
  };

  const [selectedParamSetIndex, setSelectedParamSetIndex] = useState<number>(
    getSelectedAuthIndex(connectionParameterSets, connectionParameterValues.openAIAuthenticationType)
  );
  const [parameterValues, setParameterValues] = useState<Record<string, any>>(connectionParameterValues);

  const authType = useMemo(
    () => connectionParameterSets?.values[selectedParamSetIndex]?.name,
    [connectionParameterSets, selectedParamSetIndex]
  );

  useEffect(() => {
    if (authType) {
      setConnectionParameterValues((values: Record<string, any>) => ({ ...values, openAIAuthenticationType: authType })); // Set authType in connection parameter values as well so that it can be used for showing/hiding parameters based on auth type
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
        handleParametersChange({}); // Clear out the config params from previous set
      }
    },
    [handleParametersChange, selectedParamSetIndex]
  );

  const styleOverrides = useMemo(
    () => ({
      combobox: comboboxStyles,
      dropdown: dropdownStyles,
      secretField: secretFieldStyles,
    }),
    []
  );
  const renderConnectionParameter = (key: string, parameter: ConnectionParameterSetParameter) => {
    const connectionParameterProps: ConnectionParameterProps = {
      parameterKey: key,
      parameter,
      operationParameterValues: { agentModelType: 'AzureOpenAI', hideCreate: true },
      value: parameterValues[key],
      setValue: (val: any) => handleParametersChange((values: Record<string, any>) => ({ ...values, [key]: val })),
      parameterSet: connectionParameterSets?.values[selectedParamSetIndex],
      setKeyValue: (customKey: string, val: any) =>
        handleParametersChange((values: Record<string, any>) => ({ ...values, [customKey]: val })),
      parameterValues: parameterValues,
      cssOverrides: {
        field: styles.paramField,
        label: styles.paramLabel,
        combobox: styles.combobox,
        disabledField: styles.disabledField,
      },
      styleOverrides,
    };

    const customParameterOptions = ConnectionParameterEditorService()?.getConnectionParameterEditor({
      connectorId: 'connectionProviders/agent',
      parameterKey: key,
    });
    if (customParameterOptions) {
      const CustomConnectionParameter = customParameterOptions.EditorComponent;
      return <CustomConnectionParameter key={key} data-testId={key} {...connectionParameterProps} />;
    }

    return <UniversalConnectionParameter key={key} data-testId={key} {...connectionParameterProps} />;
  };

  return (
    <div className={styles.container}>
      <Text className="msla-templates-section-description">{INTL_TEXT.description}</Text>

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
  );
};
