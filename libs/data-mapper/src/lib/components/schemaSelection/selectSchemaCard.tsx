import { SchemaTypes } from '../configPanel/EditorConfigPanel';
import stateImageOnHover from './card_image_onhover.png';
import stateImageOnRest from './card_image_onrest.png';
import { Image } from '@fluentui/react/lib/Image';
import type { FunctionComponent } from 'react';
import { useIntl } from 'react-intl';

interface SelectSchemaCardProps {
  schemaType: SchemaTypes;
  onClick: () => void;
}

const imageStyle = { paddingLeft: 70, paddingRight: 70, paddingTop: 64, paddingBottom: 28 };

export const SelectSchemaCard: FunctionComponent<SelectSchemaCardProps> = ({ schemaType, onClick }) => {
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
    <div className="schema-select-card" onClick={onClick}>
      <Image className="on-hover" src={stateImageOnHover} alt="select a schema - on hover" style={imageStyle} />
      <Image className="on-rest" src={stateImageOnRest} alt="select a schema - on rest" style={imageStyle} />
      {selectSchemaMsg}
    </div>
  );
};
