import { LargeText, XLargeText } from '@microsoft/designer-ui';
import { AdvancedOptionsTypes } from '../../../run-service';
import { updateSelectedAdvanceOptions } from '../../../state/WorkflowSlice';
import type { AppDispatch, RootState } from '../../../state/store';
import { SearchableDropdown, type IDropdownOption } from '../../components/searchableDropdown';
import { getAdvanceOptionsSelection, isCloneConnectionsAvailable } from './helper';
import { useCallback } from 'react';
import { useIntlMessages, exportMessages } from '../../../intl';
import { useDispatch, useSelector } from 'react-redux';
import { useExportStyles } from '../exportStyles';

export const AdvancedOptions: React.FC = () => {
  const workflowState = useSelector((state: RootState) => state.workflow);
  const { exportData } = workflowState;
  const { selectedAdvanceOptions } = exportData;
  const styles = useExportStyles();
  const dispatch: AppDispatch = useDispatch();

  const intlText = useIntlMessages(exportMessages);

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
    (_event: React.FormEvent<HTMLDivElement>, selectedOption?: IDropdownOption | undefined) => {
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
    <div>
      <XLargeText text={intlText.ADVANCED_OPTIONS} className={styles.exportWorkflowsAdvancedOptionsTitle} style={{ display: 'block' }} />
      <LargeText text={intlText.EXPORT_CONNECTION} style={{ display: 'block' }} />
      <SearchableDropdown
        label={intlText.EXPORT_CONNECTION_DESCRIPTION}
        placeholder={AdvancedOptionsTypes.off}
        options={advancedOptions}
        onChange={onChangeOptions}
        selectedKeys={selectedAdvanceOptions}
        multiSelect
        className={styles.exportWorkflowsAdvancedOptionsDropdown}
      />
    </div>
  );
};
