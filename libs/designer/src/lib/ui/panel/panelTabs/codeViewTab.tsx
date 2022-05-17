import { Peek } from '@microsoft/designer-ui';
import React from 'react';

export const CodeViewTab = () => {
  return <Peek input={'{\n"test": true,\n"test2" : \n\t{\n\t\t"object" : "value"\n\t}\n}'} />;
};
