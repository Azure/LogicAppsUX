import { DevToolbox } from '../components/DevToolbox';
import { dataMapDataLoaderSlice } from '../state/DataMapDataLoader';
import type { AppDispatch, RootState } from '../state/Store';
import { AzureThemeDark } from '@fluentui/azure-themes/lib/azure/AzureThemeDark';
import { AzureThemeLight } from '@fluentui/azure-themes/lib/azure/AzureThemeLight';
import { ThemeProvider } from '@fluentui/react';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { PortalCompatProvider } from '@fluentui/react-portal-compat';
import {
  DataMapDataProvider,
  DataMapperDesigner,
  DataMapperDesignerProvider,
  InitDataMapperApiService,
  defaultDataMapperApiServiceOptions,
  getFunctions,
} from '@microsoft/logic-apps-data-mapper';
import { Theme as ThemeType } from '@microsoft/utils-logic-apps';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const workflowSchemaFilenames = ['Source.xsd', 'Target.xsd', 'SourceJson.json', 'TargetJson.json'];

export const DataMapperStandaloneDesigner = () => {
  const dispatch = useDispatch<AppDispatch>();
  const theme = useSelector((state: RootState) => state.dataMapDataLoader.theme);
  const armToken = useSelector((state: RootState) => state.dataMapDataLoader.armToken);

  const xsltFilename = useSelector((state: RootState) => state.dataMapDataLoader.xsltFilename);
  const xsltContent = useSelector((state: RootState) => state.dataMapDataLoader.xsltContent);
  const mapDefinition = useSelector((state: RootState) => state.dataMapDataLoader.mapDefinition);
  const fetchedFunctions = useSelector((state: RootState) => state.dataMapDataLoader.fetchedFunctions);
  const sourceSchema = useSelector((state: RootState) => state.schemaDataLoader.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.schemaDataLoader.targetSchema);

  const [functionDisplay, setFunctionDisplayExpanded] = useState<boolean>(true);

  // Standalone uses default/dev runtime settings - can just run 'func host start' in the workflow root
  InitDataMapperApiService({
    ...defaultDataMapperApiServiceOptions,
    accessToken: armToken,
  });

  const saveMapDefinitionCall = (dataMapDefinition: string) => {
    console.log('Map Definition\n===============');
    console.log(dataMapDefinition);
  };

  const saveXsltCall = (dataMapXslt: string) => {
    console.log('\nXSLT\n===============');
    console.log(dataMapXslt);
  };

  useEffect(() => {
    const fetchFunctionList = async () => {
      const fnManifest = await getFunctions();

      if (typeof fnManifest !== 'string') {
        dispatch(dataMapDataLoaderSlice.actions.changeFetchedFunctions(fnManifest));
      }
    };

    fetchFunctionList();
  }, [dispatch, armToken]);

  const isLightMode = theme === ThemeType.Light;

  return (
    <div style={{ flex: '1 1 1px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: '0 1 1px' }}>
        <ThemeProvider theme={isLightMode ? AzureThemeLight : AzureThemeDark}>
          <FluentProvider theme={isLightMode ? webLightTheme : webDarkTheme}>
            {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
            {/* @ts-ignore */}
            <PortalCompatProvider>
              <DevToolbox />
            </PortalCompatProvider>
          </FluentProvider>
        </ThemeProvider>
      </div>

      <div style={{ flex: '1 1 1px', display: 'flex', flexDirection: 'column' }}>
        <DataMapperDesignerProvider locale="en-US" theme={theme} options={{}}>
          <DataMapDataProvider
            xsltFilename={xsltFilename}
            xsltContent={xsltContent}
            mapDefinition={mapDefinition}
            sourceSchema={sourceSchema}
            targetSchema={targetSchema}
            availableSchemas={workflowSchemaFilenames}
            fetchedFunctions={fetchedFunctions}
            theme={theme}
          >
            <DataMapperDesigner
              saveMapDefinitionCall={saveMapDefinitionCall}
              saveXsltCall={saveXsltCall}
              setFunctionDisplayExpanded={setFunctionDisplayExpanded}
              useExpandedFunctionCards={functionDisplay}
            />
          </DataMapDataProvider>
        </DataMapperDesignerProvider>
      </div>
    </div>
  );
};
