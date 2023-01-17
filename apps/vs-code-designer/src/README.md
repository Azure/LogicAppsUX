# Azure Logic Apps for Visual Studio Code (Standard)

Use the Azure Logic Apps (Standard) extension to quickly create, debug, manage, and deploy Logic Apps directly from VS Code.

> Sign up today for your free Azure account and receive 12 months of free popular services, $200 free credit and 25+ always free services 👉 [Start Free](https://azure.microsoft.com/free/open-source).

## Create your first logic app

1. Select the button to create a new project in the Azure Logic Apps explorer

2. Select a new, _empty_ folder to contain your project

3. Select "Stateful" for your project's first function

4. Use "Stateful1" as the function name

5. If the selected folder is not already open, select "Open in current window" to open it

## Run the logic app locally

This extension integrates with the [Azure Functions Core Tools](https://docs.microsoft.com/azure/azure-functions/functions-run-local) to let you run your project locally before publishing to Azure.

1. To start your project, press F5 or the "play" button

2. If you do not have the [Azure Functions Core Tools](https://github.com/Azure/azure-functions-core-tools/releases/tag/4.0.4915) installed, you will be automatically prompted to install. Follow the specified instructions, or skip to the "Deploy" step if you would rather deploy without running locally.

   > TIP: The "Terminal" panel should pop up automatically and you know your project is running if you see output

3. Make sure you have [Azurite Emulator](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite?tabs=visual-studio-code) installed and running. Alternatively, edit the value of `AzureWebJobsStorage` in `local.settings.json` under the project's root folder and under `/workflow-designtime` to a valid connection string for an Azure storage account.
   > **WARNING**: [Azure Storage Emulator](https://docs.microsoft.com/azure/storage/common/storage-use-emulator) has been deprecated.

## Deploy to Azure

1. Sign in to your Azure Account by clicking "Sign in to Azure..." in the Azure Logic Apps explorer

   > If you don't already have an Azure Account, click "Create a Free Azure Account"

2. Select the button to deploy

3. Choose "Create new Logic App in Azure..."

4. Enter a globally unique name for your Logic App

5. Select a location

6. Wait for deployment to complete. Progress will be shown in the bottom right corner of your window

7. Once deployment is complete, expand your _subscription_ in the Azure Logic explorer to view it

## Development Notes

If building the extension make sure you are using node version 14. If you are using [NVM](https://github.com/nvm-sh/nvm) or [NVM Windows](https://github.com/coreybutler/nvm-windows) you can just use 'nvm use' in this repo to switch to the supported version.

## Known issues

You can see known issues [here](https://github.com/Azure/logicapps/blob/master/articles/logic-apps-public-preview-known-issues.md).

## Providing feedback

1. You can open issues [here](https://github.com/Azure/logicapps/issues) on GitHub.

2. You can submit feedbacks and comments using [this form](https://aka.ms/lafeedback).

### Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Telemetry

VS Code collects usage data and sends it to Microsoft to help improve our products and services. Read our [privacy statement](https://go.microsoft.com/fwlink/?LinkID=528096&clcid=0x409) to learn more. If you don’t wish to send usage data to Microsoft, you can set the `telemetry.enableTelemetry` setting to `false`. Learn more in our [FAQ](https://code.visualstudio.com/docs/supporting/faq#_how-to-disable-telemetry-reporting).

## License

[MICROSOFT SOFTWARE LICENSE TERMS](https://raw.githubusercontent.com/Azure/logicapps/master/preview/LICENSE)
