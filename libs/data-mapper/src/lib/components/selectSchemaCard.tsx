import type { SchemaTypes } from './addSchemaPanelButton';
import './components.less';
import stateImageOnHover from './state_image.png';
import stateImageOnRest from './state_image_disabled.png';
import { Image } from '@fluentui/react/lib/Image';
import type { FunctionComponent } from 'react';

interface SelectSchemaCardProps {
  schemaType: SchemaTypes;
  onClick: () => void;
}

const imageStyle = { paddingLeft: 70, paddingRight: 70, paddingTop: 64, paddingBottom: 28 };

export const SelectSchemaCard: FunctionComponent<SelectSchemaCardProps> = ({ schemaType, onClick }) => (
  <div
    className="schema-card"
    aria-label="Select schema"
    onClick={onClick}
    style={{
      justifyContent: 'center',
      justifyItems: 'center',
      justifySelf: 'center',
      alignContent: 'center',
      alignItems: 'center',
      // height: 'inherit',
      // marginLeft: 'auto',
      // marginRight: 'auto',
      margin: 'auto',
      padding: 'auto',
    }}
  >
    <Image className="on-hover" src={stateImageOnHover} alt="select on hover" style={imageStyle} />
    <Image className="on-rest" src={stateImageOnRest} alt="select on rest" style={imageStyle} />
    {`Select an ${schemaType} schema`}
  </div>
);
