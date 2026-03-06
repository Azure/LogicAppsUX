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
import { useState, useCallback, useMemo } from 'react';
import {
  getPropertyValue,
  ConnectionParameterTypes,
  type ConnectionParameterSetParameter,
  filterRecord,
  type ConnectionParameterSets,
} from '@microsoft/logic-apps-shared';
import { useCreatePanelStyles } from '../../styles';
import { useSubscriptions } from '../../../../../core/state/connection/connectionSelector';

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
    authTypeLabel: intl.formatMessage({
      defaultMessage: 'Authentication type',
      id: 'cUwOWl',
      description: 'Label for authentication type dropdown',
    }),
    subscriptionLabel: intl.formatMessage({
      defaultMessage: 'Subscription',
      id: 'cAPPxZ',
      description: 'Label for subscription dropdown',
    }),
    subscriptionPlaceholder: intl.formatMessage({
      defaultMessage: 'Select subscription',
      id: '3VZYMO',
      description: 'Placeholder for subscription dropdown',
    }),
    loadingSubscriptions: intl.formatMessage({
      defaultMessage: 'Loading subscriptions...',
      id: 'qmJ4fl',
      description: 'Loading subscriptions message',
    }),
  };

  const [name, setName] = useState<string | undefined>(undefined);
  const [selectedParamSetIndex, setSelectedParamSetIndex] = useState<number>(0);
  const [parameterValues, setParameterValues] = useState<Record<string, any>>({});
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string>('');
  const { isFetching: isFetchingSubscriptions, data: subscriptions } = useSubscriptions();

  const handleParameterChange = useCallback(
    (key: string, value: any) => {
      const newValues = { ...parameterValues, [key]: value };
      setParameterValues(newValues);
      setConnectionParameterValues(newValues);
    },
    [parameterValues, setConnectionParameterValues]
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

  const visibleParameters: Record<string, ConnectionParameterSetParameter> = useMemo(
    () => filterRecord<any>(allParameters, (_, value) => isParamVisible(value)),
    [allParameters, isParamVisible]
  );

  const onAuthDropdownChange = useCallback(
    (selectedOptions: string[]) => {
      const newIndex = Number.parseInt(selectedOptions[0] ?? '0', 10);
      if (newIndex !== selectedParamSetIndex) {
        setSelectedParamSetIndex(newIndex);
        setParameterValues({});
        setConnectionParameterValues({});
      }
    },
    [selectedParamSetIndex, setConnectionParameterValues]
  );

  // Build auth type dropdown options
  const authTypeOptions = useMemo(
    () =>
      connectionParameterSets?.values.map((paramSet, index) => ({
        id: String(index),
        value: String(index),
        label: paramSet?.uiDefinition?.displayName ?? paramSet?.name,
      })) ?? [],
    [connectionParameterSets]
  );

  // Build subscription dropdown options
  const subscriptionOptions = useMemo(
    () =>
      (subscriptions ?? [])
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .map((subscription) => {
          const id = subscription.id.split('/subscriptions/')[1];
          return {
            id,
            value: id,
            label: `${subscription.displayName} (${id})`,
          };
        }),
    [subscriptions]
  );

  const onSubscriptionChange = useCallback((selectedOptions: string[]) => {
    setSelectedSubscriptionId(selectedOptions[0] ?? '');
  }, []);

  // Build parameter items for TemplatesSection
  const parameterItems: TemplatesSectionItem[] = useMemo(() => {
    return Object.entries(visibleParameters).map(([key, parameter]) => {
      const uiDef = parameter?.uiDefinition;
      const displayName = uiDef?.displayName ?? key;
      const description = uiDef?.description ?? uiDef?.schema?.description;
      const isRequired = uiDef?.constraints?.required === 'true';
      const isSecure = parameter.type === 'securestring' && !uiDef?.constraints?.clearText;

      // Check if parameter has allowed values (dropdown)
      const allowedValues = uiDef?.constraints?.allowedValues;
      if (allowedValues && allowedValues.length > 0) {
        const options = allowedValues.map((av, idx) => ({
          id: String(idx),
          value: av.value,
          label: av.text ?? av.value,
        }));
        return {
          label: displayName,
          type: 'dropdown' as const,
          placeholder: description,
          required: isRequired,
          options,
          selectedOptions: parameterValues[key] ? [parameterValues[key]] : [],
          value: parameterValues[key] ?? '',
          controlled: true,
          onOptionSelect: (selected: string[]) => handleParameterChange(key, selected[0]),
        };
      }

      // Text input (regular or password)
      return {
        id: key,
        label: displayName,
        type: isSecure ? ('textfield' as const) : ('textfield' as const),
        placeholder: description,
        required: isRequired,
        value: parameterValues[key] ?? '',
        onChange: (value: string) => handleParameterChange(key, value),
      };
    });
  }, [visibleParameters, parameterValues, handleParameterChange]);

  const detailsItems: TemplatesSectionItem[] = useMemo(
    () => [
      {
        label: INTL_TEXT.nameLabel,
        value: name ?? '',
        type: 'textfield',
        placeholder: INTL_TEXT.namePlaceholder,
        required: true,
        onChange: setName,
        errorMessage: name !== undefined && name.trim() === '' ? INTL_TEXT.nameError : undefined,
      },
    ],
    [INTL_TEXT.nameLabel, INTL_TEXT.namePlaceholder, INTL_TEXT.nameError, name]
  );

  const databaseItems: TemplatesSectionItem[] = useMemo(
    () => [
      {
        label: INTL_TEXT.subscriptionLabel,
        type: 'dropdown' as const,
        placeholder: isFetchingSubscriptions ? INTL_TEXT.loadingSubscriptions : INTL_TEXT.subscriptionPlaceholder,
        required: true,
        options: subscriptionOptions,
        selectedOptions: selectedSubscriptionId ? [selectedSubscriptionId] : [],
        value: subscriptionOptions.find((opt) => opt.id === selectedSubscriptionId)?.label ?? '',
        controlled: true,
        onOptionSelect: onSubscriptionChange,
        disabled: isFetchingSubscriptions,
      },
      {
        label: connectionParameterSets?.uiDefinition?.displayName ?? INTL_TEXT.authTypeLabel,
        type: 'dropdown' as const,
        placeholder: connectionParameterSets?.uiDefinition?.description,
        required: true,
        options: authTypeOptions,
        selectedOptions: [String(selectedParamSetIndex)],
        value: authTypeOptions[selectedParamSetIndex]?.label ?? '',
        controlled: true,
        onOptionSelect: onAuthDropdownChange,
      },
      ...parameterItems,
    ],
    [
      INTL_TEXT.subscriptionLabel,
      INTL_TEXT.subscriptionPlaceholder,
      INTL_TEXT.loadingSubscriptions,
      isFetchingSubscriptions,
      subscriptionOptions,
      selectedSubscriptionId,
      onSubscriptionChange,
      connectionParameterSets?.uiDefinition?.displayName,
      connectionParameterSets?.uiDefinition?.description,
      INTL_TEXT.authTypeLabel,
      authTypeOptions,
      selectedParamSetIndex,
      onAuthDropdownChange,
      parameterItems,
    ]
  );

  return (
    <div className={styles.container}>
      <TemplatesSection
        title={INTL_TEXT.detailsTitle}
        description={INTL_TEXT.detailsDescription}
        items={detailsItems}
        cssOverrides={{ sectionItem: styles.sectionItem }}
      />
      <TemplatesSection
        title={INTL_TEXT.databaseTitle}
        description={INTL_TEXT.databaseDescription}
        items={databaseItems}
        cssOverrides={{ sectionItem: styles.sectionItem }}
      />
    </div>
  );
};
