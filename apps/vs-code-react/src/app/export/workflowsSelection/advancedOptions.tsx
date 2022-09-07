import { AdvancedOptionsTypes } from '../../../run-service';
import type { AppDispatch, RootState } from '../../../state/store';
import { updateSelectedAdvanceOptions } from '../../../state/vscodeSlice';
import type { InitializedVscodeState } from '../../../state/vscodeSlice';
import { SearchableDropdown } from '../../components/searchableDropdown';
import { getAdvanceOptionsSelection } from './helper';
import { Text } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export const AdvancedOptions: React.FC = () => {
  const vscodeState = useSelector((state: RootState) => state.vscode);
  const { exportData } = vscodeState as InitializedVscodeState;
  const { selectedAdvanceOptions } = exportData;

  const intl = useIntl();
  const dispatch: AppDispatch = useDispatch();

  const intlText = {
    ADVANCED_OPTIONS: intl.formatMessage({
      defaultMessage: 'Advanced options',
      description: 'Advanced options title',
    }),
    EXPORT_CONNECTION: intl.formatMessage({
      defaultMessage: 'Export connection credentials',
      description: 'Export connection credentials title',
    }),
    EXPORT_CONNECTION_DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Export the connection credentials for each application',
      description: 'Export the connection credentials for each application description',
    }),
    OFF: intl.formatMessage({
      defaultMessage: 'Off',
      description: 'Off text',
    }),
    CLONE_CONNECTIONS: intl.formatMessage({
      defaultMessage: 'Clone connections',
      description: 'Clone connections text',
    }),
    GENERATE_INFRAESTRUCTURE: intl.formatMessage({
      defaultMessage: 'Generate infrastructure templates',
      description: 'Generate infrastructure templates',
    }),
  };

  const advancedOptions: IDropdownOption[] = [
    { key: AdvancedOptionsTypes.cloneConnections, text: intlText.CLONE_CONNECTIONS, selected: false },
    { key: AdvancedOptionsTypes.generateInfrastructureTemplates, text: intlText.GENERATE_INFRAESTRUCTURE, selected: false },
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
      <Text className="msla-export-workflows-advanced-options-title" variant="xLarge" block>
        {intlText.ADVANCED_OPTIONS}
      </Text>
      <Text variant="large" block>
        {intlText.EXPORT_CONNECTION}
      </Text>
      <SearchableDropdown
        label={intlText.EXPORT_CONNECTION_DESCRIPTION}
        placeholder={AdvancedOptionsTypes.off}
        options={advancedOptions}
        onChange={onChangeOptions}
        multiSelect
      />
    </div>
  );
};
