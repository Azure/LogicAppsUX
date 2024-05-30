import { LargeText, XLargeText } from '@microsoft/designer-ui';
import { AdvancedOptionsTypes } from '../../../run-service';
import { updateSelectedAdvanceOptions } from '../../../state/WorkflowSlice';
import type { AppDispatch, RootState } from '../../../state/store';
import { SearchableDropdown } from '../../components/searchableDropdown';
import { getAdvanceOptionsSelection, isCloneConnectionsAvailable } from './helper';
import type { IDropdownOption } from '@fluentui/react';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export const AdvancedOptions: React.FC = () => {
  const workflowState = useSelector((state: RootState) => state.workflow);
  const { exportData } = workflowState;
  const { selectedAdvanceOptions } = exportData;

  const intl = useIntl();
  const dispatch: AppDispatch = useDispatch();

  const intlText = {
    ADVANCED_OPTIONS: intl.formatMessage({
      defaultMessage: 'Advanced options',
      id: 'AANqXs',
      description: 'Advanced options title',
    }),
    EXPORT_CONNECTION: intl.formatMessage({
      defaultMessage: 'Export connection credentials',
      id: 'IasIBo',
      description: 'Export connection credentials title',
    }),
    EXPORT_CONNECTION_DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Export the connection credentials for each application',
      id: 'qMrEa5',
      description: 'Export the connection credentials for each application description',
    }),
    OFF: intl.formatMessage({
      defaultMessage: 'Off',
      id: 'nwlaY0',
      description: 'Off text',
    }),
    CLONE_CONNECTIONS: intl.formatMessage({
      defaultMessage: 'Clone connections credentials',
      id: 'Okr6Rk',
      description: 'Clone connections text',
    }),
    GENERATE_INFRAESTRUCTURE: intl.formatMessage({
      defaultMessage: 'Generate infrastructure templates',
      id: '1ilzLi',
      description: 'Generate infrastructure templates',
    }),
    INTEGRATION_ACCOUNT_SOURCE: intl.formatMessage({
      defaultMessage: 'Default to integration account as source for transformations and schema validation',
      id: 'Wr+bL6',
      description: 'Default to integration account as source for transformations and schema validation',
    }),
    EXPORT_CUSTOM_API_ACTIONS_TO_API_MANAGEMENT_ACTIONS: intl.formatMessage({
      defaultMessage: 'Export custom connector actions as API Management actions',
      id: 'KMOkYN',
      description: 'Export custom connector actions as API Management actions',
    }),
  };

  const advancedOptions: IDropdownOption[] = [
    { key: AdvancedOptionsTypes.generateInfrastructureTemplates, text: intlText.GENERATE_INFRAESTRUCTURE, selected: false },
    {
      key: AdvancedOptionsTypes.cloneConnections,
      text: intlText.CLONE_CONNECTIONS,
      selected: false,
      disabled: isCloneConnectionsAvailable(selectedAdvanceOptions),
    },
    {
      key: AdvancedOptionsTypes.integrationAccountSource,
      text: intlText.INTEGRATION_ACCOUNT_SOURCE,
      selected: false,
    },
    {
      key: AdvancedOptionsTypes.exportCustomApiActionsToAPIManagementActions,
      text: intlText.EXPORT_CUSTOM_API_ACTIONS_TO_API_MANAGEMENT_ACTIONS,
      selected: false,
    },
  ];

  const onChangeOptions = useCallback(
    (_event: React.FormEvent<HTMLDivElement>, selectedOption?: IDropdownOption<any> | undefined) => {
      if (selectedOption) {
        const optionsSelection = getAdvanceOptionsSelection(selectedAdvanceOptions, selectedOption);
        dispatch(
          updateSelectedAdvanceOptions({
            selectedAdvanceOptions: optionsSelection,
          })
        );
      }
    },
    [selectedAdvanceOptions, dispatch]
  );

  return (
    <div className="msla-export-workflows-advanced-options">
      <XLargeText text={intlText.ADVANCED_OPTIONS} className="msla-export-workflows-advanced-options-title" style={{ display: 'block' }} />
      <LargeText text={intlText.EXPORT_CONNECTION} style={{ display: 'block' }} />
      <SearchableDropdown
        label={intlText.EXPORT_CONNECTION_DESCRIPTION}
        placeholder={AdvancedOptionsTypes.off}
        options={advancedOptions}
        onChange={onChangeOptions}
        selectedKeys={selectedAdvanceOptions}
        multiSelect
        className="msla-export-workflows-advanced-options-dropdown"
      />
    </div>
  );
};
