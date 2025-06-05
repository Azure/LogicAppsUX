---
sidebar_position: 11
---

# API Reference

This reference documents the public APIs for integrating Azure Logic Apps UX components into your applications.

## Designer Package

### Installation

```bash
npm install @microsoft/logic-apps-designer
```

### Basic Usage

```typescript
import { DesignerProvider, Designer } from '@microsoft/logic-apps-designer';

function App() {
  return (
    <DesignerProvider options={designerOptions}>
      <Designer />
    </DesignerProvider>
  );
}
```

### Core Components

#### `<DesignerProvider>`

The main provider component that supplies context and services to the designer.

```typescript
interface DesignerProviderProps {
  options: {
    services: ServiceOptions;
    workflowSpec?: WorkflowSpec;
    initialState?: InitialState;
    isDarkMode?: boolean;
    language?: string;
    features?: FeatureOptions;
  };
  children: React.ReactNode;
}
```

#### `<Designer>`

The workflow designer canvas component.

```typescript
interface DesignerProps {
  backgroundProps?: BackgroundProps;
  panelLocation?: PanelLocation;
  customPanelLocations?: CustomPanelLocations;
  displayRuntimeInfo?: boolean;
}
```

### Service Configuration

The designer requires several services to be configured:

```typescript
interface ServiceOptions {
  // Required Services
  connectionService: IConnectionService;
  operationManifestService: IOperationManifestService;
  searchService: ISearchService;
  oAuthService: IOAuthService;
  workflowService: IWorkflowService;
  
  // Optional Services
  connectorService?: IConnectorService;
  gatewayService?: IGatewayService;
  loggerService?: ILoggerService;
  runService?: IRunService;
  apimService?: IApimService;
  functionService?: IFunctionService;
  appService?: IAppService;
  tenantService?: ITenantService;
  customCodeService?: ICustomCodeService;
  hostService?: IHostService;
  workspaceService?: IWorkspaceService;
  userService?: IUserService;
  templateService?: ITemplateService;
}
```

### Hooks

#### Workflow State Hooks

```typescript
// Check if workflow has unsaved changes
const isDirty = useIsWorkflowDirty();

// Get node display name
const displayName = useNodeDisplayName(nodeId);

// Get node metadata
const metadata = useNodeMetadata(nodeId);

// Check initialization status
const nodesInitialized = useNodesInitialized();
```

#### Connection Hooks

```typescript
// Get connection mapping
const connectionMapping = useConnectionMapping();

// Get connection references
const connectionRefs = useConnectionRefs();

// Check if operation is missing connection
const isMissingConnection = useIsOperationMissingConnection(nodeId);
```

#### Validation Hooks

```typescript
// Get all settings validation errors
const settingsErrors = useAllSettingsValidationErrors();

// Get all connection errors
const connectionErrors = useAllConnectionErrors();
```

#### History Hooks

```typescript
// Check undo/redo availability
const canUndo = useCanUndo();
const canRedo = useCanRedo();
```

### Actions

#### Workflow Actions

```typescript
// Serialize current workflow
const serializedWorkflow = await serializeWorkflow(store.getState());

// Discard all changes
dispatch(discardAllChanges());

// Set workflow dirty state
dispatch(setIsWorkflowDirty(true));

// Focus on a node
dispatch(setFocusNode(nodeId));
```

#### Panel Actions

```typescript
// Open a panel for a node
dispatch(openPanel(nodeId, panelType));

// Clear panel
dispatch(clearPanel());

// Collapse panel
dispatch(collapsePanel());

// Change panel node
dispatch(changePanelNode(nodeId));
```

#### State Management

```typescript
// Reset workflow state
dispatch(resetWorkflowState());

// Reset nodes load status
dispatch(resetNodesLoadStatus());

// Reset designer dirty state
dispatch(resetDesignerDirtyState());
```

### Utility Functions

#### Parameter Utilities

```typescript
// Validate parameter
const validation = validateParameter(parameter, value);

// Convert parameter value to string
const stringValue = parameterValueToString(parameter, value);

// Load parameter value from string
const value = loadParameterValueFromString(parameter, stringValue);
```

#### Token Utilities

```typescript
// Get output token sections
const sections = getOutputTokenSections(operation);

// Get expression token sections
const expressions = getExpressionTokenSections();
```

#### Segment Utilities

```typescript
// Create literal value segment
const literal = createLiteralValueSegment(value);

// Create token value segment
const token = createTokenValueSegment(tokenData);

// Convert value segments
const converted = ValueSegmentConvertor(segments);
```

### Types

#### Workflow Types

```typescript
interface Workflow {
  definition: LogicAppsV2.WorkflowDefinition;
  connectionReferences?: ConnectionReferences;
  parameters?: Record<string, WorkflowParameter>;
}

interface ConnectionReference {
  connection: {
    id: string;
  };
  api: {
    id: string;
  };
  connectionName?: string;
  authentication?: Authentication;
}

interface WorkflowParameter {
  name: string;
  type: string;
  value?: any;
  defaultValue?: any;
  metadata?: ParameterMetadata;
}
```

#### Custom Code Types

```typescript
interface CustomCode {
  id: string;
  name: string;
  type: 'javascript' | 'csharp' | 'typescript';
  content?: string;
}

interface CustomCodeWithData extends CustomCode {
  fileData?: string;
  fileExtension: string;
  fileName: string;
  isModified: boolean;
  isDeleted: boolean;
}
```

## Data Mapper Package

### Installation

```bash
npm install @microsoft/logic-apps-data-mapper-v2
```

### Basic Usage

```typescript
import { DataMapperDesigner } from '@microsoft/logic-apps-data-mapper-v2';

function DataMapper() {
  return (
    <DataMapperDesigner
      mapDefinition={mapDefinition}
      sourceSchema={sourceSchema}
      targetSchema={targetSchema}
      dataMapperApiService={apiService}
      options={options}
    />
  );
}
```

### Data Mapper Components

#### `<DataMapperDesigner>`

The main data mapper designer component.

```typescript
interface DataMapperDesignerProps {
  mapDefinition?: MapDefinitionEntry;
  sourceSchema: SchemaExtended;
  targetSchema: SchemaExtended;
  dataMapperApiService: IDataMapperApiService;
  options?: DataMapperDesignerOptions;
}
```

### Data Mapper Services

```typescript
interface IDataMapperApiService {
  compile(mapDefinition: string, targetSchemaId: string): Promise<string>;
  getAvailableCustomFunctions(): Promise<FunctionData[]>;
  getSchemaTree(schemaId: string): Promise<SchemaExtended>;
  saveDraftStateCall?(mapDefinition: string): Promise<void>;
  saveXsltCall?(xslt: string): Promise<void>;
  testMap?(mapDefinition: string, context: TestMapContext): Promise<TestMapResponse>;
}
```

## Designer UI Package

### Installation

```bash
npm install @microsoft/designer-ui
```

### Common Components

This package provides stateless UI components used across the designer:

- Form controls
- Icons and assets
- Theme definitions
- Accessibility utilities

**Note**: This package must remain stateless - no Redux, no hooks with state.

## Shared Package

### Installation

```bash
npm install @microsoft/logic-apps-shared
```

### Utilities

#### API Clients

```typescript
import { ArmParser } from '@microsoft/logic-apps-shared';

const parser = new ArmParser(armUrl);
const resourceId = parser.getResourceId();
```

#### Data Parsers

```typescript
import { parseWorkflowDefinition } from '@microsoft/logic-apps-shared';

const parsed = parseWorkflowDefinition(definition);
```

#### Localization

```typescript
import { getIntl } from '@microsoft/logic-apps-shared';

const intl = getIntl();
const message = intl.formatMessage({ defaultMessage: 'Hello' });
```

## VS Code Extension

### Installation

The VS Code extension is available in the VS Code Marketplace as "Azure Logic Apps (Standard)".

### Extension API

For extension development:

```typescript
import { ExtensionApi } from '@microsoft/vscode-extension-logic-apps';

// Activate extension
export async function activate(context: vscode.ExtensionContext): Promise<ExtensionApi> {
  // Extension activation logic
  return api;
}
```

## Migration Guide

### From v1 to v2

#### Designer Changes

```typescript
// v1
import { Designer } from '@microsoft/designer';

// v2
import { DesignerProvider, Designer } from '@microsoft/logic-apps-designer';

// v2 requires DesignerProvider wrapper
```

#### Service Configuration

```typescript
// v1
const designer = new Designer({
  services: { /* ... */ }
});

// v2
<DesignerProvider options={{ services: { /* ... */ } }}>
  <Designer />
</DesignerProvider>
```

## Troubleshooting

### Common Issues

#### Service Not Configured

```
Error: Required service 'connectionService' not provided
```

**Solution**: Ensure all required services are configured in `ServiceOptions`.

#### State Not Initialized

```
Error: Cannot read workflow state before initialization
```

**Solution**: Wait for `useNodesInitialized()` to return `true` before accessing state.

#### Token Picker Not Working

```
Error: Expression builder context not found
```

**Solution**: Ensure component is wrapped in `DesignerProvider`.

## Support

- **GitHub Issues**: [Report bugs](https://github.com/Azure/LogicAppsUX/issues)
- **Documentation**: [Full documentation](/)
- **Examples**: [Standalone designer](/Development/Standalone)