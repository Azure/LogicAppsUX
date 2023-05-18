import type { RootState } from '../state/Store';
import { Stack } from '@fluentui/react';
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
import { EditorLanguage, MonacoEditor } from '@microsoft/designer-ui';
import {
  convertSchemaToSchemaExtended,
  convertToMapDefinition,
  flattenSchemaIntoSortArray,
  loadMapDefinition,
  MapDefinitionDeserializer,
} from '@microsoft/logic-apps-data-mapper';
import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

enum SerializationTab {
  Deserialization = 'Deserialization',
  Serialization = 'Serialization',
}

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

export const DevSerializationTester = () => {
  const styles = useStyles();

  const [selectedTab, setSelectedTab] = useState<SerializationTab>(SerializationTab.Deserialization);
  const [inputMapDefinition, setInputMapDefinition] = useState<string>('');
  const [outputConnections, setOutputConnections] = useState<string>('');
  const [inputConnections, setInputConnections] = useState<string>('');
  const [outputMapDefinition, setOutputMapDefinition] = useState<string>('');

  const { fetchedFunctions } = useSelector((state: RootState) => state.dataMapDataLoader);
  const { sourceSchema, targetSchema } = useSelector((state: RootState) => state.schemaDataLoader);

  const sourceSchemaExtended = useMemo(() => {
    if (sourceSchema) {
      return convertSchemaToSchemaExtended(sourceSchema);
    }

    return undefined;
  }, [sourceSchema]);

  const targetSchemaExtended = useMemo(() => {
    if (targetSchema) {
      return convertSchemaToSchemaExtended(targetSchema);
    }

    return undefined;
  }, [targetSchema]);

  const targetSchemaSortArray = useMemo(() => {
    return targetSchemaExtended ? flattenSchemaIntoSortArray(targetSchemaExtended.schemaTreeRoot) : [];
  }, [targetSchemaExtended]);

  const deserializeMapDefinitionIntoConnections = () => {
    if (!sourceSchemaExtended || !targetSchemaExtended) {
      window.alert('You must select your source and target schemas in the dropdowns above!');
      return;
    }

    if (!fetchedFunctions) {
      window.alert('No function data was found.');
      return;
    }

    const mapDefinitionDeserializer = new MapDefinitionDeserializer(
      loadMapDefinition(inputMapDefinition ?? ''),
      sourceSchemaExtended,
      targetSchemaExtended,
      fetchedFunctions
    );

    const deserializedConnections = mapDefinitionDeserializer.convertFromMapDefinition();

    setOutputConnections(JSON.stringify(deserializedConnections, null, 2));
  };

  const serializeConnectionsIntoMapDefinition = () => {
    if (!sourceSchema || !targetSchema) {
      window.alert('You must select your source and target schemas in the dropdowns above!');
      return;
    }

    const serializedMapDefinition = convertToMapDefinition(
      JSON.parse(inputConnections),
      sourceSchemaExtended,
      targetSchemaExtended,
      targetSchemaSortArray
    );

    setOutputMapDefinition(serializedMapDefinition);
  };

  return (
    <div style={{ backgroundColor: tokens.colorNeutralBackground2 }}>
      <Accordion collapsible>
        <AccordionItem value="1">
          <AccordionHeader>Serialization Tester</AccordionHeader>
          <AccordionPanel>
            <Text>
              <Text weight="bold">NOTE:</Text> This uses the source and target schemas you&apos;ve selected above!
            </Text>

            <TabList
              selectedValue={selectedTab}
              onTabSelect={(_e, data) => setSelectedTab(data.value as SerializationTab)}
              style={{ marginBottom: 16 }}
            >
              <Tab id="Deserialization" value={SerializationTab.Deserialization}>
                Deserialization
              </Tab>
              <Tab id="Serialization" value={SerializationTab.Serialization}>
                Serialization
              </Tab>
            </TabList>

            <Stack horizontal horizontalAlign="space-around" tokens={{ childrenGap: '8px' }} wrap>
              {selectedTab === SerializationTab.Deserialization && (
                <>
                  <Stack tokens={{ childrenGap: '8px' }}>
                    <Text style={{ fontWeight: 'bold', fontSize: '22px', display: 'block', marginBottom: '12px' }}>Map definition</Text>
                    <MonacoEditor
                      {...commonCodeEditorProps}
                      language={EditorLanguage.yaml}
                      value={inputMapDefinition}
                      onContentChanged={(e) => setInputMapDefinition(e.value ?? '')}
                      className={styles.editorStyle}
                      height="400px"
                    />

                    <Button onClick={deserializeMapDefinitionIntoConnections}>Deserialize map definition</Button>
                  </Stack>

                  <Stack tokens={{ childrenGap: '8px' }}>
                    <Text style={{ fontWeight: 'bold', fontSize: '22px', display: 'block', marginBottom: '12px' }}>Connections</Text>
                    <MonacoEditor
                      {...commonCodeEditorProps}
                      language={EditorLanguage.json}
                      value={outputConnections}
                      className={styles.editorStyle}
                      height="400px"
                      readOnly
                    />
                  </Stack>
                </>
              )}

              {selectedTab === SerializationTab.Serialization && (
                <>
                  <Stack tokens={{ childrenGap: '8px' }}>
                    <Text style={{ fontWeight: 'bold', fontSize: '22px', display: 'block', marginBottom: '12px' }}>Connections</Text>
                    <MonacoEditor
                      {...commonCodeEditorProps}
                      language={EditorLanguage.json}
                      value={inputConnections}
                      onContentChanged={(e) => setInputConnections(e.value ?? '')}
                      className={styles.editorStyle}
                      height="400px"
                    />

                    <Button onClick={serializeConnectionsIntoMapDefinition}>Serialize connections</Button>
                  </Stack>

                  <Stack tokens={{ childrenGap: '8px' }}>
                    <Text style={{ fontWeight: 'bold', fontSize: '22px', display: 'block', marginBottom: '12px' }}>Map definition</Text>
                    <MonacoEditor
                      {...commonCodeEditorProps}
                      language={EditorLanguage.json}
                      value={outputMapDefinition}
                      className={styles.editorStyle}
                      height="400px"
                      readOnly
                    />
                  </Stack>
                </>
              )}
            </Stack>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
