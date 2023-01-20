import { Stack, StackItem, TextField } from '@fluentui/react';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Button,
  makeStyles,
  shorthands,
  Text,
  tokens,
} from '@fluentui/react-components';
import { EditorLanguage, MonacoEditor } from '@microsoft/designer-ui';
import { getFunctions, getSelectedSchema } from '@microsoft/logic-apps-data-mapper';
import { useState } from 'react';

const useStyles = makeStyles({
  editorStyle: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding('2px'),
  },
});

export const DevApiTester = () => {
  const styles = useStyles();

  const [schemaFilename, setSchemaFilename] = useState<string>('');
  const [apiResponse, setApiResponse] = useState<string>('Trigger a request to see the response here');

  const getSchemaTree = async () => {
    try {
      const schemaTree = await getSelectedSchema(schemaFilename);
      setApiResponse(JSON.stringify(schemaTree, null, 2));
    } catch (error: unknown) {
      setApiResponse(JSON.stringify((error as Error).message, null, 2));
    }
  };

  const getFunctionManifest = async () => {
    const fnManifest = await getFunctions();

    setApiResponse(JSON.stringify(fnManifest, null, 2));
  };

  return (
    <div style={{ marginBottom: '20px', backgroundColor: tokens.colorNeutralBackground2, padding: 4 }}>
      <Accordion collapsible>
        <AccordionItem value="1">
          <AccordionHeader>Dev API Tester</AccordionHeader>
          <AccordionPanel>
            <Stack horizontal horizontalAlign="space-around" tokens={{ childrenGap: '8px' }} wrap>
              <StackItem style={{ width: '250px' }}>
                <Stack verticalAlign="space-around" style={{ height: '100%' }}>
                  <Stack tokens={{ childrenGap: '8px' }}>
                    <Text style={{ fontWeight: 'bold', fontSize: '22px' }}>Schema Tree</Text>

                    <TextField
                      label="Schema Filename"
                      placeholder="Schema filename (w/o .xsd)"
                      value={schemaFilename ?? ''}
                      onChange={(_e, newValue) => setSchemaFilename(newValue ?? '')}
                    />

                    <Button onClick={getSchemaTree}>GET schemaTree</Button>
                  </Stack>

                  <Stack tokens={{ childrenGap: '8px' }}>
                    <Text style={{ fontWeight: 'bold', fontSize: '22px' }}>Function Manifest</Text>

                    <Button onClick={getFunctionManifest}>GET mapTransformations</Button>
                  </Stack>
                </Stack>
              </StackItem>

              <StackItem>
                <Text style={{ fontWeight: 'bold', fontSize: '22px', display: 'block', marginBottom: '12px' }}>Response</Text>
                <MonacoEditor
                  language={EditorLanguage.json}
                  value={apiResponse}
                  className={styles.editorStyle}
                  lineNumbers="on"
                  scrollbar={{ horizontal: 'auto', vertical: 'auto' }}
                  wordWrap="on"
                  wrappingIndent="same"
                  height="600px"
                  width="600px"
                />
              </StackItem>
            </Stack>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
