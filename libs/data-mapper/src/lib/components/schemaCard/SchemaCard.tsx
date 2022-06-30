import { SchemaTypes } from '../configPanel/EditorConfigPanel';
import { IconButton } from '@fluentui/react';
import type { FunctionComponent } from 'react';
import { useIntl } from 'react-intl';

interface SchemaCardProps {
  schemaType: SchemaTypes;
  onClick?: () => void;
}

// const imageStyle = { paddingLeft: 70, paddingRight: 70, paddingTop: 64, paddingBottom: 28 };

export const SchemaCard: FunctionComponent<SchemaCardProps> = ({ schemaType, onClick }) => {
  const intl = useIntl();

  let selectSchemaMsg = '';

  switch (schemaType) {
    case SchemaTypes.Input:
      selectSchemaMsg = intl.formatMessage({
        defaultMessage: 'Select an input schema',
        description: 'label to inform to select input schema to be used',
      });
      break;
    case SchemaTypes.Output:
      selectSchemaMsg = intl.formatMessage({
        defaultMessage: 'Select an output schema',
        description: 'label to inform to select output schema to be used',
      });
      break;
    default:
      break;
  }

  return (
    <div className="schema-card" onClick={onClick}>
      <IconButton iconProps={{ iconName: 'Diamond' }} />
      {selectSchemaMsg}
    </div>
  );
};
