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
import { useSelector } from 'react-redux';

const workflowSchemaFilenames = ['Source.xsd', 'Target.xsd'];

export const DataMapperStandaloneDesigner = () => {
  const theme = useSelector((state: RootState) => state.dataMapDataLoader.theme);

  const dataMap = useSelector((state: RootState) => state.dataMapDataLoader.dataMap);
  const inputSchema = useSelector((state: RootState) => state.schemaDataLoader.inputSchema);
  const outputSchema = useSelector((state: RootState) => state.schemaDataLoader.outputSchema);

  const resourceUrl = useSelector((state: RootState) => state.dataMapDataLoader.resourcePath);
  const armToken = useSelector((state: RootState) => state.dataMapDataLoader.armToken);

  InitDataMapperApiService({
    baseUrl: defaultDataMapperApiServiceOptions.baseUrl,
    resourceUrl: resourceUrl,
    accessToken: armToken,
  });

  const saveStateCall = (dataMapDefinition: string) => {
    console.log(dataMapDefinition);
  };

  // NOTE: Adding FluentProvider here to encapsulate DevToolbox
  return (
    <FluentProvider theme={theme === 'Light' ? webLightTheme : webDarkTheme}>
      <DevToolbox />
      <DataMapperDesignerProvider locale="en-US" theme={theme === 'Light' ? 'light' : 'dark'} options={{}}>
        <DataMapDataProvider
          dataMap={dataMap}
          inputSchema={inputSchema}
          outputSchema={outputSchema}
          availableSchemas={workflowSchemaFilenames}
        >
          <DataMapperDesigner saveStateCall={saveStateCall} />
        </DataMapDataProvider>
      </DataMapperDesignerProvider>
    </FluentProvider>
  );
};
