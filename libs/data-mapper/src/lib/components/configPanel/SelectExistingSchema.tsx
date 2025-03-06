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
    id: 'msda039f408daf',
    description: 'Schema dropdown aria label',
  });
  const dropdownAriaLabel = intl.formatMessage({
    defaultMessage: 'Select the schema for dropdown',
    id: 'ms7381906443fc',
    description: 'Schema dropdown aria label',
  });
  const schemaDropdownPlaceholder = useMemo(() => {
    if (props.schemaType === SchemaType.Source) {
      return intl.formatMessage({
        defaultMessage: 'Select a source schema',
        id: 'msdde7a58bb664',
        description: 'Source schema dropdown placeholder',
      });
    }
    return intl.formatMessage({
      defaultMessage: 'Select a target schema',
      id: 'ms5e4071bf9317',
      description: 'Target schema dropdown placeholder',
    });
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
