import { customerOrdersJsonMock, ParserView, simpleMapDefExample } from '@microsoft/logic-apps-data-mapper';

export const ParserViewInApp = () => {
  return <ParserView input={JSON.stringify(customerOrdersJsonMock, null, '\t')} />;
  // return <ParserView input={simpleMapDefExample} />;
};
