import { ParserView } from '@microsoft/logic-apps-data-mapper';

export const ParserViewInApp = () => {
  return <ParserView input={'{\n"test0": true,\n"test2" : \n\t{\n\t\t"object" : "value"\n\t}\n}'} />;
};
