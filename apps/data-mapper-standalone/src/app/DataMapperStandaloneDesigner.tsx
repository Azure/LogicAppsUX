import { DevToolbox } from '../components/DevToolbox';
import type { RootState } from '../state/Store';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import {
  DataMapDataProvider,
  DataMapperDesigner,
  DataMapperDesignerProvider,
  defaultDataMapperApiServiceOptions,
  InitDataMapperApiService,
} from '@microsoft/logic-apps-data-mapper';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';

const workflowSchemaFilenames = ['Source.xsd', 'Target.xsd'];

export const DataMapperStandaloneDesigner = () => {
  const theme = useSelector((state: RootState) => state.dataMapDataLoader.theme);

  const xsltFilename = useSelector((state: RootState) => state.dataMapDataLoader.xsltFilename);
  const mapDefinition = useSelector((state: RootState) => state.dataMapDataLoader.mapDefinition);
  const sourceSchema = useSelector((state: RootState) => state.schemaDataLoader.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.schemaDataLoader.targetSchema);

  const armToken = useSelector((state: RootState) => state.dataMapDataLoader.armToken);

  const saveStateCall = (dataMapDefinition: string, dataMapXslt: string) => {
    console.log('Map Definition\n===============');
    console.log(dataMapDefinition);
    console.log('\nXSLT\n===============');
    console.log(dataMapXslt);
  };

  useEffect(() => {
    // Standalone uses default/dev runtime settings - can just run 'func host start' in the workflow root
    InitDataMapperApiService({
      ...defaultDataMapperApiServiceOptions,
      accessToken: armToken,
    });
  }, [armToken]);

  return (
    <div style={{ flex: '1 1 1px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: '0 1 1px' }}>
        <FluentProvider theme={theme === 'Light' ? webLightTheme : webDarkTheme}>
          <DevToolbox />
        </FluentProvider>
      </div>

      <div style={{ flex: '1 1 1px', display: 'flex', flexDirection: 'column' }}>
        <DataMapperDesignerProvider locale="en-US" theme={theme === 'Light' ? 'light' : 'dark'} options={{}}>
          <DataMapDataProvider
            xsltFilename={xsltFilename}
            mapDefinition={mapDefinition}
            sourceSchema={sourceSchema}
            targetSchema={targetSchema}
            availableSchemas={workflowSchemaFilenames}
          >
            <DataMapperDesigner saveStateCall={saveStateCall} />
          </DataMapDataProvider>
        </DataMapperDesignerProvider>
      </div>
    </div>
  );
};
