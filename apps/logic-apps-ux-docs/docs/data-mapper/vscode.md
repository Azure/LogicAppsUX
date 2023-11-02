# VS Code Extension

## Setup

### Prerequisites

- `git clone`, and run `npm install` in, the logic_apps_designer repo
- Install nx if you haven't already - `npm install -g nx`

- .NET Core SDK 3.1 (https://dotnet.microsoft.com/en-us/download/dotnet/3.1)
- Azure Functions Core Tools (https://github.com/Azure/azure-functions-core-tools or `npm i -g azure-functions-core-tools --unsafe-perm true`)
- **VS Code Extensions:** Azure Tools, Azure Logic Apps (Standard)

- Logic Apps workflow (folder - w/ schemas) - see steps to create below:
  1.  In Azure Tools extension tab under Logic Apps (Standard), click the 'Create New Project' icon, and choose where you want the project folder
  2.  Open that folder in VS Code, then go back to Logic Apps (Standard), and click 'Create New Workflow' -> Stateless -> Press Enter
  3.  Make sure that ./Artifacts/Schemas exists within the project folder, and add an .xsd schema for testing (see the DM Overview doc for test data)

### Daily .VSIX Build

The daily build of the VS Code extension (.vsix) for Data Mapper can be found at https://github.com/Azure/logic_apps_designer/releases
under Assets with the name `microsoft-data-mapper-vscode-extension-x.x.x.vsix`

In order to utilize the above file once downloaded:

1. Open VS Code, click the Extensions tab (left - on the Activity Bar)
2. Click the ellipsis/three-dots button on the title bar
3. Click 'Install from VSIX...', and then select the .vsix file just downloaded

You're all set! See the section on usage/functionality at the bottom to help you get started!

### Build (Dev/Debug)

To build, run the following commands _in order_ (from the root of the repo folder):

```bash
nx build vs-code-data-mapper
```

```bash
nx build vs-code-data-mapper-react
```

### Run (Dev/Debug)

**NOTE:** As of 11/16/2022, Data Mapper's API endpoints are in the public workflow extension bundle, so no further action needs to be taken to utilize DM

To run the VS Code extension (in debug mode):

1.  Open the repo folder in VS Code
2.  Click the 'Run and Debug' tab on the left (Activity) bar
3.  Select 'Run Data Mapper Extension...' in the dropdown at the top, then click the 'Start debugging' icon

### Backend Runtime / Workflow Extension Bundle Setup

**NOTE:** These steps are only if you need to use a custom/dev bundle

To use a custom bundle, all you have to do is add the setting `"FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI"` to your workflow's root _and_ workflow-designtime `local.settings.json` files inside `Values`
with the value being the URI for the bundle .zip file

## Usage / Supported Functionality

The extension will activate/initialize automatically upon viewing the Azure Tools extension tree, or by having a Logic Apps workflow folder (with a host.json) open in your VS Code workspace

Listed below are different ways you can kick off your usage/flow of Data Mapper:

- Create a new data map: open the Azure Tools extension tab, find the Data Mapper sub-view, and click either 'Create new data map' button
- Load a data map: right-click on a .lml map definition
