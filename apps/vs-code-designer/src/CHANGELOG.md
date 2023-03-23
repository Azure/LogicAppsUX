# Change Log

## [1.0.49] - 2023-03-22

### Changed

- Update azure packages.
- Add data mapper operations to client support operations.
- Update designtime functions worker runtime to dotnet-isolated.
- Made UX improvements in the designer.

## [1.0.46] - 2023-02-17

### Changed

- Fixed Bug where VS Code was not correctly initialized when selecting language while deploying.

## [1.0.45] - 2022-12-13

### Changed

- Fixed bug where parameterized connections weren't sent when deployed.
- Fixed bug where you can't debug a NuGet-based app when .NET 6 version is installed.
- Fixed bug where connection interpolations weren't working when using the parameters.json file.
- Fixed bug where the site parameter for a deleted logic app is null.

## [1.0.44] - 2022-11-09

### Changed

- Added support to Azure Functions Core Tools 4.x and .NET 6.
- Added support for dynamic calls in local projects and cloud apps.
- Added support for Open Designer and Overview commands using the command palette.
- Added telemetry to workflow run history view.
- Fixed bug related to sorting subscriptions in alphabetical order.

## [1.0.43] - 2022-10-21

### Changed

- Added support for exporting Consumption to Standard logic apps.
- Made UX improvements and bug fixes in the designer.
- Fixed bug related to creating a project and workflow.

## [1.0.40] - 2022-09-23

### Changed

- Added experience for exporting logic apps from integration service environment (ISE) to Standard.
- Added support for parameterization with and without curly braces in the connection.json file.
- Fixed bug related to not showing connection name in the designer.
- Fixed bug related to not showing dynamic parameters in the designer.
- Fixed bug related to converting from raw key to ManagedServiceIdentity key when deploying a logic app.
- Made UX improvements in the designer.

## [1.0.34] - 2022-08-30

### Changed

- Fixed bug related to not showing the "Run Trigger" button on the "Overview" page for logic apps running in the Azure portal.
- Fixed bug related to not showing monitoring views for logic apps running locally and in the Azure portal.
- Made UX improvements in the designer.

## [1.0.10] - 2021-11-19

### Changed

- Added support for custom request timeout setting in HTTP actions.
- Made UX improvements and bug fixes in the designer.

## [1.0.8] - 2021-10-26

- Added support for SQL storage.
- Added flat file operations.
- Made UX improvements and bug fixes in the designer.

## [1.0.7] - 2021-09-22

### Changed

- Made UX improvements and bug fixes in the designer.

## [1.0.6] - 2021-08-16

### Changed

- Made UX improvements and bug fixes in the designer.

## [1.0.4] - 2021-08-23

### Changed

- Made bug fixes in the workflow designer.

## [1.0.3] - 2021-07-27

### Changed

- Various UX improvements and bug fixes.
- Added new logic app parameters UX to the designer.

## [1.0.2] - 2021-07-02

### Changed

- Made UX improvements and bug fixes in the designer.

## [1.0.1] - 2021-06-17

### Changed

- Made UX improvements and bug fixes in the designer.

## [1.0.0] - 2021-05-26

### Changed

- New SKU support for workflows.
- New UX to enable or disable debug mode.
- New Logic Apps on Azure Arc support.
- New parameterization support for logic apps.

## [0.0.11] - 2021-03-11

### Changed

- Made UX improvements and bug fixes in the designer.

## [0.0.10] - 2021-02-25

### Changed

- Default Azure Logic Apps project is now created using extension bundle.
- Support for switching to a NuGet-based Azure Logic Apps project.
- Support for adding redirect URLs in webhook.
- Support for pressing Ctrl+Up and Ctrl+Down to navigate between operation shapes on the designer.
- Support for adding actions and parallel branches in additional places.

## [0.0.9] - 2021-02-11

### Changed

- Made UX improvements and bug fixes in the designer.

## [0.0.8] - 2021-01-28

### Changed

- Added support for custom SSL certificate authority.
- Added support for adding parallel branches in designer.
- Fixed partial save bug when Azure connections are used.
- Made UX improvements and bug fixes in the designer.

## [0.0.7] - 2020-12-08

### Changed

- Added support for integration account in Azure Logic Apps (Standard - Preview).
- Added support for breakpoints in an Azure Logic Apps project.
- Added support for workflow validation in local project.
- Added support to call Azure Functions.

## [0.0.6] - 2020-11-11

### Changed

- Fixed bug related to Azure Logic Apps project creation.

## [0.0.5] - 2020-10-30

### Changed

- Updated the designer in Azure Logic Apps.
- Updated the workflows NuGet package version to 1.0.0.8-preview.
- Fixed 'ApiConnection' trigger support.

## [0.0.4] - 2020-10-08

### Changed

- Enabled panel mode for workflow run history view.

## [0.0.3] - 2020-09-28

### Changed

- Fixed the bug encountered during project creation.
- Fixed Azure operations authoring issue in designer when the signed-in user has multiple tenant directories.

## [0.0.2] - 2020-09-25

### Changed

- Updated the workflow designer version to 1.50914.1.11.
- Fixed output channel name for the extension.
- Enabled panel mode for workflows deployed in Azure.
- Removed broken repository link.
- Fixed description for extension commands.

## [0.0.1] - 2020-09-22

- Initial release
