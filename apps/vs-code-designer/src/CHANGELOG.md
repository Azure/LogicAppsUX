# Change Log

## [1.0.45] - 2022-12-13

### Changed

- Fixed Bug where parameterized connections were not being sent when deployed.
- Fixed Bug about not being able to debug nuget based app when .NET 6 version is installed.
- Fixed Bug where connections interpolations were not working when using parameters.json.
- Fixed Bug when deleted logic app site parameter is null.

## [1.0.44] - 2022-11-09

### Changed

- Added support to Functions Core Tools version 4 and .NET version 6.
- Added support for dynamic calls in local projects and cloud apps.
- Added support Open Designer and Overview commands via command palette.
- Added telemetry in Monitoring View.
- Bug fixes sorting subscriptions in alphabetical order.

## [1.0.43] - 2022-10-21

### Changed

- Added support for export Consumption logic apps to Standard.
- UX improvements and bug fixes in the designer.
- Bug fixes when creating a project and workflow.

## [1.0.40] - 2022-09-23

### Changed

- Added export experience from ISE logic apps to Standard.
- Added support for parameterization with and without curly braces in connection.json.
- Bug fix not showing connection name in the designer.
- Bug fix not showing dynamic parameters in the designer.
- Bug fix convert from raw key to ManagedServiceIdentity key when deploying a logic app.
- UX improvements in the designer.

## [1.0.34] - 2022-08-30

### Changed

- Bug fix not showing trigger button in overview for remote logic apps.
- Bug fix not showing monitoring views for local and remote logic apps.
- UX improvements in the designer.

## [1.0.10] - 2021-11-19

### Changed

- Added support for custom request timeout setting in HTTP actions.
- UX improvements and bug fixes in the designer.

## [1.0.8] - 2021-10-26

- Added support for SQL storage.
- Added flat file operations.
- UX improvements and bug fixes in the designer.

## [1.0.7] - 2021-09-22

### Changed

- UX improvements and bug fixes in the designer.

## [1.0.6] - 2021-08-16

### Changed

- UX improvements and bug fixes in the designer.

## [1.0.4] - 2021-08-23

### Changed

- Bug fixes for the Logic App designer.

## [1.0.3] - 2021-07-27

### Changed

- Various UX improvements and bug fixes.
- New Logic Apps parameter UI.

## [1.0.2] - 2021-07-02

### Changed

- UX improvements and bug fixes in the designer.

## [1.0.1] - 2021-06-17

### Changed

- UX improvements and bug fixes in the designer.

## [1.0.0] - 2021-05-26

### Changed

- New SKU support for workflows
- New UX for enabling/disabling debug mode.
- New Logic Apps on Azure Arc support.
- New Logic Apps parameterization support.

## [0.0.11] - 2021-03-11

### Changed

- UX improvements and bug fixes in the designer.

## [0.0.10] - 2021-02-25

### Changed

- Default Logic App project is now created using extension bundle.
- Support to switch to a Nuget-based Logic App project.
- Support for adding redirect URL's in webhook.
- Support for pressing Ctrl+Up and Ctrl+Down to navigate between cards on the designer.
- Support for adding actions and parallel branches in additional places.

## [0.0.9] - 2021-02-11

### Changed

- UX improvements and bug fixes in the designer.

## [0.0.8] - 2021-01-28

### Changed

- Added support for custom SSL certificate authority.
- Added support for adding parallel branches in designer.
- Partial save bug fixed when azure connections are used.
- UX improvements and bug fixes in the designer.

## [0.0.7] - 2020-12-08

### Changed

- Added support for Integration Account in Logic App (Preview)
- Added support for breakpoints in Logic App
- Added support for workflow validation in local project
- Added support to invoke Azure Functions

## [0.0.6] - 2020-11-11

### Changed

- Fixed Logic App project creation bug

## [0.0.5] - 2020-10-30

### Changed

- Updated the Logic App designer
- Updated the workflows nuget package version to 1.0.0.8-preview
- Fixed api connection trigger support

## [0.0.4] - 2020-10-08

### Changed

- Enabled panel mode for workflow run history view.

## [0.0.3] - 2020-09-28

### Changed

- Fixed the bug encountered during project creation.
- Fixed azure operations authoring issue in designer when signed in user have multiple tenant directories.

## [0.0.2] - 2020-09-25

### Changed

- Updated the Logic App designer version to 1.50914.1.11.
- Fixed output channel name for the extension.
- Enabled panel mode for workflows deployed in Azure.
- Removed broken repository link.
- Fixed description for extension commands.

## [0.0.1] - 2020-09-22

- Initial release
