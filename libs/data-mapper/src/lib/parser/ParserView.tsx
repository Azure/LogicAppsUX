import {
  cbrInputRecordMapDefinitionMock,
  customerOrdersMapDefinitionMock,
  IfWithChildrenAndValueMapDefinitionMock,
  missingDstSchemaNameMapDefinitionMock,
  missingSrcSchemaNameMapDefinitionMock,
  simpleJsonExample,
  simpleMapDefExample,
} from './__mocks__';
import { SampleDataDisplayer } from './components/SampleDataDisplayer';
import { jsonToMapDefinition } from './jsonToMapDefinitionParser';
import { mapDefinitionToJson } from './mapDefinitionToJsonParser';
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
  const theInput = customerOrdersMapDefinitionMock;
  // const [convertedOutput, setConvertedOutput] = useState(JSON.stringify(mapDefinitionToJson(theInput), null, '\t'));
  const [convertedOutput, setConvertedOutput] = useState(JSON.stringify(mapDefinitionToJson(theInput), null, '\t'));

  useEffect(() => {
    async function fetchData() {
      // You can await here
      const parsedYaml = await mapDefinitionToJson(theInput);
      setConvertedOutput(JSON.stringify(parsedYaml, null, '\t'));
      // ...
    }
    fetchData();
    // setConvertedOutput(JSON.stringify(mapDefinitionToJson(theInput), null, '\t'));

    // linesToNode(convertedOutput?.split('\n'), 0);
    mapDefinitionToJson(theInput);
  }, []);

  return (
    <div>
      <SampleDataDisplayer data={theInput} />
      <SampleDataDisplayer data={convertedOutput} />
    </div>
  );
};
