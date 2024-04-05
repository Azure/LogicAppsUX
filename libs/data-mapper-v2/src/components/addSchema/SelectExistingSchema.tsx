import type { RootState } from '../../core/state/Store';
import { FileDropdown } from '../fileDropdown/fileDropdown';
import { SchemaType } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

export type SelectExistingSchemaProps = {
  errorMessage: string;
  schemaType?: SchemaType;
  setSelectedSchema: (item: string | undefined) => void;
};

export const SelectExistingSchema = (props: SelectExistingSchemaProps) => {
  const schemaRelativePath = '/Artifacts/Schemas';

  // intl
  const intl = useIntl();
  const folderLocationLabel = intl.formatMessage({
    defaultMessage: 'Existing schemas from',
    id: '2gOfQI',
    description: 'Schema dropdown aria label',
  });
  const dropdownAriaLabel = intl.formatMessage({
    defaultMessage: 'Select the schema for dropdown',
    id: 'c4GQZE',
    description: 'Schema dropdown aria label',
  });
  const schemaDropdownPlaceholder = useMemo(() => {
    if (props.schemaType === SchemaType.Source) {
      return intl.formatMessage({
        defaultMessage: 'Select a source schema',
        id: '3eeli7',
        description: 'Source schema dropdown placeholder',
      });
    } else {
      return intl.formatMessage({
        defaultMessage: 'Select a target schema',
        id: 'XkBxv5',
        description: 'Target schema dropdown placeholder',
      });
    }
  }, [intl, props.schemaType]);

  const availableSchemaList = useSelector((state: RootState) => state.schema.availableSchemas);

  const dataMapDropdownOptions = useMemo(() => availableSchemaList ?? [], [availableSchemaList]);

  const setSelectedSchema = props.setSelectedSchema;

  return (
    <FileDropdown
      allPathOptions={dataMapDropdownOptions}
      errorMessage={props.errorMessage}
      setSelectedPath={setSelectedSchema}
      relativePathMessage={`${folderLocationLabel} ${schemaRelativePath}`}
      placeholder={schemaDropdownPlaceholder}
      ariaLabel={dropdownAriaLabel}
      loadedSelection={''}
    />
  );
};
