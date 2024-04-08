import { Stack, StackItem, TextField } from '@fluentui/react';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Button,
  makeStyles,
  shorthands,
  Tab,
  TabList,
  Text,
  tokens,
} from '@fluentui/react-components';
import type { MonacoProps } from '@microsoft/designer-ui';
import { MonacoEditor } from '@microsoft/designer-ui';
import { generateDataMapXslt, getFunctions, getSelectedSchema, testDataMap } from '@microsoft/logic-apps-data-mapper';
import { EditorLanguage } from '@microsoft/logic-apps-shared';
import { useState } from 'react';

const RequestTab = {
  SchemaTree: 'schemaTree',
  FunctionManifest: 'functionManifest',
  TestMap: 'testMap',
  GenerateXslt: 'generateXslt',
};
export type RequestTab = (typeof RequestTab)[keyof typeof RequestTab];
const commonCodeEditorProps: Partial<MonacoProps> = {
  lineNumbers: 'on',
  scrollbar: { horizontal: 'auto', vertical: 'auto' },
  wordWrap: 'on',
  wrappingIndent: 'same',
  width: '600px',
};

const useStyles = makeStyles({
  editorStyle: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding('2px'),
  },
});

export const DevApiTester = () => {
  const styles = useStyles();

  const [selectedTab, setSelectedTab] = useState<RequestTab>(Object.values(RequestTab)[0]);
  const [schemaFilename, setSchemaFilename] = useState<string>('');
  const [testMapInput, setTestMapInput] = useState<string>('');
  const [xsltFilename, setXsltFilename] = useState<string>('');
  const [generateXsltInput, setGenerateXsltInput] = useState<string>('');
  const [apiResponse, setApiResponse] = useState<string>('"Trigger a request to see the response here"');

  const getSchemaTree = async () => {
    try {
      setApiResponse('Getting schema');
      const schemaTree = await getSelectedSchema(schemaFilename, '');
      setApiResponse(JSON.stringify(schemaTree, null, 2));
    } catch (error: unknown) {
      setApiResponse(JSON.stringify((error as Error).message, null, 2));
    }
  };

  const getFunctionManifest = async () => {
    setApiResponse('Fetching manifest');
    const fnManifest = await getFunctions();
    setApiResponse(JSON.stringify(fnManifest, null, 2));
  };

  const testMap = async () => {
    setApiResponse('Testing map');
    const testMapResponse = await testDataMap(xsltFilename, testMapInput);
    setApiResponse(JSON.stringify(testMapResponse, null, 2));
  };

  const generateXslt = async () => {
    try {
      setApiResponse('Generating XSLT');
      const generateXsltResponse = await generateDataMapXslt(generateXsltInput);
      setApiResponse(JSON.stringify(generateXsltResponse, null, 2));
    } catch (error: unknown) {
      setApiResponse(JSON.stringify((error as Error).message, null, 2));
    }
  };

  return (
    <div style={{ backgroundColor: tokens.colorNeutralBackground2 }}>
      <Accordion collapsible>
        <AccordionItem value="1">
          <AccordionHeader>API Tester</AccordionHeader>
          <AccordionPanel>
            <Text>
              <Text weight="bold">NOTE:</Text> You must run `func host start` in workflow_folder/workflow-designtime
            </Text>

            <Stack horizontal horizontalAlign="space-around" tokens={{ childrenGap: '8px' }} wrap>
              <StackItem style={{ width: '500px' }}>
                <TabList
                  selectedValue={selectedTab}
                  onTabSelect={(_e, data) => setSelectedTab(data.value as RequestTab)}
                  style={{ marginBottom: 16 }}
                >
                  <Tab id="Schema Tree" value={RequestTab.SchemaTree}>
                    Schema Tree
                  </Tab>
                  <Tab id="Function Manifest" value={RequestTab.FunctionManifest}>
                    Function Manifest
                  </Tab>
                  <Tab id="Test Map" value={RequestTab.TestMap}>
                    Test Map
                  </Tab>
                  <Tab id="Generate XSLT" value={RequestTab.GenerateXslt}>
                    Generate XSLT
                  </Tab>
                </TabList>

                <Stack horizontalAlign="center" style={{ width: '100%' }}>
                  {selectedTab === RequestTab.SchemaTree && (
                    <Stack tokens={{ childrenGap: '8px' }}>
                      <TextField
                        label="Schema filename"
                        placeholder="Schema filename (w/o extension)"
                        value={schemaFilename ?? ''}
                        onChange={(_e, newValue) => setSchemaFilename(newValue ?? '')}
                      />

                      <Button onClick={getSchemaTree}>GET schemaTree</Button>
                    </Stack>
                  )}

                  {selectedTab === RequestTab.FunctionManifest && <Button onClick={getFunctionManifest}>GET mapTransformations</Button>}

                  {selectedTab === RequestTab.TestMap && (
                    <Stack tokens={{ childrenGap: '8px' }}>
                      <TextField
                        label="XSLT filename"
                        placeholder="Xslt filename (w/o .xslt)"
                        value={xsltFilename ?? ''}
                        onChange={(_e, newValue) => setXsltFilename(newValue ?? '')}
                      />

                      <Text
                        style={{
                          fontWeight: 'bold',
                          fontSize: '22px',
                          display: 'block',
                          marginBottom: '12px',
                        }}
                      >
                        Input schema value
                      </Text>
                      <MonacoEditor
                        {...commonCodeEditorProps}
                        language={EditorLanguage.xml}
                        value={testMapInput}
                        onContentChanged={(e) => setTestMapInput(e.value ?? '')}
                        className={styles.editorStyle}
                        height="400px"
                      />

                      <Button onClick={testMap}>POST testMap</Button>
                    </Stack>
                  )}

                  {selectedTab === RequestTab.GenerateXslt && (
                    <Stack tokens={{ childrenGap: '8px' }}>
                      <Text
                        style={{
                          fontWeight: 'bold',
                          fontSize: '22px',
                          display: 'block',
                          marginBottom: '12px',
                        }}
                      >
                        Map definition
                      </Text>
                      <MonacoEditor
                        {...commonCodeEditorProps}
                        language={EditorLanguage.yaml}
                        value={generateXsltInput}
                        onContentChanged={(e) => setGenerateXsltInput(e.value ?? '')}
                        className={styles.editorStyle}
                        height="400px"
                      />

                      <Button onClick={generateXslt}>POST generateXslt</Button>
                    </Stack>
                  )}
                </Stack>
              </StackItem>

              <StackItem>
                <Text
                  style={{
                    fontWeight: 'bold',
                    fontSize: '22px',
                    display: 'block',
                    marginBottom: '12px',
                  }}
                >
                  Response
                </Text>
                <MonacoEditor
                  {...commonCodeEditorProps}
                  language={EditorLanguage.json}
                  value={apiResponse}
                  className={styles.editorStyle}
                  height="600px"
                  readOnly
                />
              </StackItem>
            </Stack>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
