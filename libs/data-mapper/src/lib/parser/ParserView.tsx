import { customerOrdersMapDefinitionMock, simpleJsonExample, simpleMapDefExample } from './__mocks__';
import { SampleDataDisplayer } from './components/SampleDataDisplayer';
import { jsonToMapDefinition } from './jsonToMapDefinitionParser';
import { linesToNode, mapDefinitionToJson } from './mapDefinitionToJsonParser';
import { useEffect, useState } from 'react';

export interface ParserViewProps {
  input: string;
}
// export const ParserView = ({ input }: ParserViewProps) => {
//   const [convertedOutput, setConvertedOutput] = useState(jsonToMapDefinition(JSON.parse(input)));

//   useEffect(() => {
//     setConvertedOutput(jsonToMapDefinition(JSON.parse(input)));

//     mapDefinitionToJson(convertedOutput);
//   }, [input]);

//   return (
//     <div>
//       <SampleDataDisplayer data={input} />
//       <SampleDataDisplayer data={convertedOutput} />
//     </div>
//   );
// };

// export const ParserView = ({ input }: ParserViewProps) => {
//   const [convertedOutput, setConvertedOutput] = useState(jsonToMapDefinition(JSON.parse(input)));

//   useEffect(() => {
//     setConvertedOutput(jsonToMapDefinition(JSON.parse(input)));

//     mapDefinitionToJson(convertedOutput);
//   }, [input]);

//   return (
//     <div>
//       <SampleDataDisplayer data={JSON.stringify(simpleJsonExample, null, '\t')} />
//       <SampleDataDisplayer data={simpleMapDefExample} />
//     </div>
//   );
// };

export const ParserView = ({ input }: ParserViewProps) => {
  const [convertedOutput, setConvertedOutput] = useState(JSON.stringify(mapDefinitionToJson(customerOrdersMapDefinitionMock), null, '\t'));

  useEffect(() => {
    setConvertedOutput(JSON.stringify(mapDefinitionToJson(customerOrdersMapDefinitionMock), null, '\t'));

    // linesToNode(convertedOutput?.split('\n'), 0);
  }, [input]);

  return (
    <div>
      <SampleDataDisplayer data={customerOrdersMapDefinitionMock} />
      <SampleDataDisplayer data={convertedOutput} />
    </div>
  );
};
