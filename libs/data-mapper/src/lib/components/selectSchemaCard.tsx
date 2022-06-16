import type { SchemaTypes } from './addSchemaPanelButton';
// import stateImage from './state_image.png';
import stateImageDisabled from './state_image_disabled.png';
import { Image } from '@fluentui/react/lib/Image';
import * as React from 'react';

// import '../../lib/styles.less';

interface DocumentCardBasicExampleProps {
  schemaType: SchemaTypes;
  onClick: () => void;
}

const cardStyles: React.CSSProperties = {
  width: '240px',
  height: '280',
  background: 'white',
  paddingBottom: 64,
  borderRadius: 4,
  // border: '2px solid #DEECF9',
  textAlign: 'center',

  fontWeight: 'bold',
  fontSize: 16,
  cursor: 'pointer',
};

// const cardStylesOnHover: React.CSSProperties = {
//     width: '240px',
//     height: '280',
//     background: '#DEECF9',
//     paddingBottom: 64,
//     borderRadius: 4,
//     border: '2px solid #0078D4',
//     textAlign: 'center',

//     fontWeight: 'bold',
//     fontSize: 16,
//     cursor: 'pointer'
// };

export const DocumentCardBasicExample: React.FunctionComponent<DocumentCardBasicExampleProps> = ({ schemaType, onClick }) => (
  <div aria-label="Select schema" onClick={onClick} style={cardStyles}>
    <Image src={stateImageDisabled} alt="state image" style={{ paddingLeft: 70, paddingRight: 70, paddingTop: 64, paddingBottom: 28 }} />
    {`Select an ${schemaType} schema`}
  </div>
);
