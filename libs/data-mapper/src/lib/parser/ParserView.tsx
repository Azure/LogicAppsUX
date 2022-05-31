import { simpleJsonExample, simpleMapDefExample } from './__mocks__';
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
  const [convertedOutput, setConvertedOutput] = useState(JSON.stringify(linesToNode(simpleMapDefExample), null, '\t'));

  useEffect(() => {
    setConvertedOutput(JSON.stringify(linesToNode(simpleMapDefExample), null, '\t'));

    linesToNode(convertedOutput);
  }, [input]);

  return (
    <div>
      <SampleDataDisplayer data={simpleMapDefExample} />
      <SampleDataDisplayer data={convertedOutput} />
    </div>
  );
};
