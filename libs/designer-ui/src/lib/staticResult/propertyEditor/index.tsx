import { PropertyEditor } from './PropertyEditor';
import { useState } from 'react';

interface PropertyEditorProps {
  properties?: Record<string, string>;
}

export const PropertyEditorContainer = ({ properties = {} }: PropertyEditorProps): JSX.Element => {
  const [currProperties, setCurrProperties] = useState(properties);

  return (
    <div className="msla-property-editor-container">
      <div className="msla-property-editors">
        <PropertyEditor properties={currProperties} updateProperties={setCurrProperties} />
      </div>
    </div>
  );
};
