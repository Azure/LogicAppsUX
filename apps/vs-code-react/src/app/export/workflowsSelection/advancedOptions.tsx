import { AdvancedOptionsTypes } from '../../../run-service';
import { SearchableDropdown } from '../../components/searchableDropdown';
import { Text } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react';
import { useIntl } from 'react-intl';

export const AdvancedOptions: React.FC<any> = () => {
  const intl = useIntl();

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
      defaultMessage: 'GenerateInfrastructureTemplates',
      description: 'GenerateInfrastructureTemplates',
    }),
  };

  const advancedOptions: IDropdownOption[] = [
    { key: AdvancedOptionsTypes.off, text: intlText.OFF },
    { key: AdvancedOptionsTypes.cloneConnections, text: intlText.CLONE_CONNECTIONS },
    { key: AdvancedOptionsTypes.generateInfrastructureTemplates, text: intlText.GENERATE_INFRAESTRUCTURE },
  ];

  const onChangeOptions = (_event: React.FormEvent<HTMLDivElement>, selectedOption?: IDropdownOption) => {
    if (selectedOption) {
      if (selectedOption.key === AdvancedOptionsTypes.off) {
        console.log('off');
      } else {
        console.log('else');
      }
    }
  };

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
        selectedKey={null}
        multiSelect
      />
    </div>
  );
};
