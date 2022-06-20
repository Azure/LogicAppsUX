import type { SchemaTypes } from './addSchemaPanelButton';
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

  return (
    <div className="schema-card" aria-label="Select schema" onClick={onClick}>
      <Image className="on-hover" src={stateImageOnHover} alt="select on hover" style={imageStyle} />
      <Image className="on-rest" src={stateImageOnRest} alt="select on rest" style={imageStyle} />
      {intl.formatMessage(
        {
          defaultMessage: 'Select an {schemaType} schema',
          description: 'label to inform to select schema to be used',
        },
        { schemaType: schemaType }
      )}
    </div>
  );
};
