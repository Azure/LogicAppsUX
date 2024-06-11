import { DevToolbox } from '../components/DevToolbox';
import { dataMapDataLoaderSlice } from '../state/DataMapDataLoader';
import {
  DataMapperDesigner as DataMapperDesignerV2,
  DataMapDataProvider as DataMapDataProviderV2,
  DataMapperDesignerProvider as DataMapperDesignerProviderV2,
  type IDataMapperFileService,
} from '@microsoft/logic-apps-data-mapper-v2';
import type { AppDispatch, RootState } from '../state/Store';
import { AzureThemeDark } from '@fluentui/azure-themes/lib/azure/AzureThemeDark';
import { AzureThemeLight } from '@fluentui/azure-themes/lib/azure/AzureThemeLight';
import { ThemeProvider } from '@fluentui/react';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { PortalCompatProvider } from '@fluentui/react-portal-compat';
import { InitDataMapperApiService, defaultDataMapperApiServiceOptions, getFunctions } from '@microsoft/logic-apps-data-mapper';
import { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { IFileSysTreeItem } from '@microsoft/logic-apps-data-mapper-v2/src/models/Tree';

const mockFileItems: IFileSysTreeItem[] = [
  {
    name: 'Child1.xsd',
    type: 'file',
    fullPath: '/Artifacts/Schemas/Child1.xsd',
  },
  {
    name: 'Folder',
    type: 'directory',
    children: [
      {
        name: 'Abc.json',
        type: 'file',
        fullPath: '/Artifacts/Schemas/Folder/Abc.json',
      },
    ],
  },
  {
    name: 'sourceSchema.json',
    type: 'file',
    fullPath: '/Artifacts/Schemas/sourceSchema.json',
  },
];

class DataMapperFileService implements IDataMapperFileService {
  private verbose: boolean;

  constructor(verbose: boolean) {
    this.verbose = verbose;
  }

  public saveMapDefinitionCall = (dataMapDefinition: string, mapMetadata: string) => {
    if (this.verbose) {
      console.log('Saved definition: ', dataMapDefinition);
      console.log('Saved metadata: ', mapMetadata);
    }
  };

  public readCurrentSchemaOptions = () => {
    return;
  };
}

const customXsltPath = ['folder/file.xslt', 'file2.xslt'];

export const DataMapperStandaloneDesignerV2 = () => {
  const dispatch = useDispatch<AppDispatch>();
  const theme = useSelector((state: RootState) => state.dataMapDataLoader.theme);
  const armToken = useSelector((state: RootState) => state.dataMapDataLoader.armToken);

  const xsltFilename = useSelector((state: RootState) => state.dataMapDataLoader.xsltFilename);
  const xsltContent = useSelector((state: RootState) => state.dataMapDataLoader.xsltContent);
  const mapDefinition = useSelector((state: RootState) => state.dataMapDataLoader.mapDefinition);
  const mapMetadata = useSelector((state: RootState) => state.dataMapDataLoader.mapMetadata);
  const fetchedFunctions = useSelector((state: RootState) => state.dataMapDataLoader.fetchedFunctions);
  const sourceSchema = useSelector((state: RootState) => state.schemaDataLoader.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.schemaDataLoader.targetSchema);

  // Standalone uses default/dev runtime settings - can just run 'func host start' in the workflow root
  InitDataMapperApiService({
    ...defaultDataMapperApiServiceOptions,
    accessToken: armToken,
  });

  const dataMapperFileService = new DataMapperFileService(true);

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
    <div style={{ flex: '1 1 1px', display: 'flex', flexDirection: 'column', height: '100%' }}>
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
        <DataMapperDesignerProviderV2 locale="en-US" theme={theme} options={{}}>
          <DataMapDataProviderV2
            xsltFilename={xsltFilename}
            xsltContent={xsltContent}
            mapDefinition={mapDefinition}
            dataMapMetadata={mapMetadata}
            sourceSchema={sourceSchema}
            targetSchema={targetSchema}
            availableSchemas={mockFileItems}
            customXsltPaths={customXsltPath}
            fetchedFunctions={fetchedFunctions}
            theme={theme}
          >
            <DataMapperDesignerV2 fileService={dataMapperFileService} saveXsltCall={saveXsltCall} />
          </DataMapDataProviderV2>
        </DataMapperDesignerProviderV2>
      </div>
    </div>
  );
};
