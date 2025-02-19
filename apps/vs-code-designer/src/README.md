# Azure Logic Apps for Visual Studio Code (Standard)

In Visual Studio Code, you can use the Azure Logic Apps (Standard) extension to quickly create, debug, manage, and deploy logic apps directly to Azure. For requirements and more information, see [Create a Standard logic app workflow using Visual Studio Code](https://go.microsoft.com/fwlink/?linkid=2222287).

> Sign up today for your free Azure account and receive 12 months of free popular services, $200 free credit and 25+ always free services 👉 [Start Free](https://azure.microsoft.com/free/open-source).

## Azure Logic Apps - Creating Logic Apps Standard Projects from Portal Exports

Starting with version 5.18.7, the Azure Logic Apps (Standard) extension for Visual Studio Code will provide the ability to create new Logic Apps Standard projects from an application exported from the Azure Portal. For more information, see [Export Logic Apps Standard Application to VS Code](https://go.microsoft.com/fwlink/?linkid=2304930).

## Azure Logic Apps - Introducing the Logic Apps Hybrid Deployment Model (preview)

Starting with version 4.107.2, the Azure Logic Apps (Standard) extension for Visual Studio Code introduces Logic Apps Hybrid Deployment Model, a new feature that empowers our customers with additional flexibility and control. This new offering allows you to build and deploy workflows that run on customer-managed infrastructure, providing you with the option to run Logic Apps on-premises, in a private cloud, or even in a third-party public cloud. For more information, see [Introducing the Logic Apps Hybrid Deployment Model (Public Preview)](https://go.microsoft.com/fwlink/?linkid=2293544).

## Azure Logic Apps - Automatic Regeneration of Connection ACL keys

Starting with version 4.57.0, the Azure Logic Apps (Standard) extension for Visual Studio Code will automatically regenerate  the keys required to allow the extension to access Azure Managed Connections. This will allow the same Azure Managed Connection to be used for projects for longer than 7 days without any user intervention. For more information, see [Regeneration Azure Managed Connection ACL for Local Development](https://go.microsoft.com/fwlink/?linkid=2283427).

## Azure Logic Apps - Introducing Azure Logic Apps Rules Engine (preview)

Starting with version 4.25.1, the Azure Logic Apps (Standard) extension for Visual Studio Code introduces the Rules Engine, a decision management inference engine. This engine allows customers to build Standard workflows in Azure Logic Apps and integrate readable, declarative, and semantically rich rules that operate on multiple data sources. Currently, the native data sources available for the Rules Engine are XML and .NET objects. For more information, see [Decision management and business logic integration using the Azure Logic Apps Rules Engine (Preview)](https://go.microsoft.com/fwlink/?linkid=2279508).

## Azure Logic Apps - Introducing .NET 8 Custom Code support (preview)

Starting with version 4.25.1, the Azure Logic Apps (Standard) extension for Visual Studio Code supports the integration of .NET 8 custom code into Logic Apps workspaces. This update allows for a smooth transition to the latest .NET version while maintaining compatibility with existing workflows. Developers can now easily develop and debug custom code within the Logic Apps environment, accelerating the development process and leveraging the advancements of .NET 8 technology. This empowers users to build more robust and efficient workflows using the most up-to-date tools and capabilities. For more information, see [Introducing .NET 8 Custom Code support for Azure Logic Apps (Standard) - Preview](https://go.microsoft.com/fwlink/?linkid=2279312).

## Azure Logic Apps - Automated Deployment Scripts Generation (preview)

Starting with version 4.4.3, the Azure Logic Apps (Standard) extension for Visual Studio Code supports the ability to generate ARM templates for Logic Apps Standard applications and Azure Managed Connections. It will also support the generation of Azure DevOps YAML pipelines, sppeding up the move from Local development to cloud using DevOps best practics. For more information, see [Automate build and deployment for Standard logic app workflows with Azure DevOps (preview)](https://go.microsoft.com/fwlink/?linkid=2268158).

## Azure Logic Apps - Improved Onboarding Experience

Starting with version 2.81.5, the Azure Logic Apps (Standard) extension for Visual Studio Code includes a dependency installer that automatically installs all the required dependencies in a new binary folder and leaves any existing dependencies unchanged. For more information, see [Get started more easily with the Azure Logic Apps (Standard) extension for Visual Studio Code](https://go.microsoft.com/fwlink/?linkid=2254016).

## Azure Logic Apps - Data Mapper for Visual Studio Code

In Visual Studio Code, you can graphically describe transformations by mapping relationships between data types in a source schema and a target schema. After you install the Azure Logic Apps - Data Mapper, you can create direct basic relationships and more complex transformations using functions, handling any translation between supported schema types in the backend. For more information, see [Create maps to transform data in Azure Logic Apps with Visual Studio Code (preview)](https://go.microsoft.com/fwlink/?linkid=2234193).

## Azure Logic Apps (Standard) moves to the Resources tab

🎉 Version 2.15.15 and later: The Azure Logic Apps extension now follows the design pattern that Azure extensions follow. Previously, in the Azure window, an Azure Logic Apps extension section showed your Azure subscriptions and associated "remote" logic apps hosted in Azure.

Now, your remote logic apps still appear in the Azure window, but in the Resources section instead. You can see your remote logic apps when you expand the Logic App node.

Extension toolbar buttons have now migrated to the Workspace section.

![Azure Logic Apps in Resources tab.](/apps/vs-code-designer/src/assets/logicAppResources.png)

## Azure Logic Apps (Standard) Custom Code Workspace

We are excited to announce a new feature in Logic Apps that allows users to author their own custom code using the .NET Framework. With this new feature, users can create custom code actions that can be used in their Logic Apps workflows.

Please note that this feature is currently in private preview and is only available on Windows. We encourage users to try out this new feature and provide feedback to help us improve it.

## Known issues

For known issues, see [GitHub issues - Azure Logic Apps](https://github.com/Azure/LogicAppsUX/issues).

## Providing feedback

- To open product bugs, go to [GitHub issues for Azure Logic Apps](https://github.com/Azure/LogicAppsUX/issues).

- To submit feedback and comments, use the [Azure Logic Apps feedback form](https://aka.ms/lafeedback).

### Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Telemetry

Visual Studio Code collects usage data and sends it to Microsoft to help improve our products and services. Read our [privacy statement](https://go.microsoft.com/fwlink/?LinkID=528096&clcid=0x409) to learn more. If you don’t wish to send usage data to Microsoft, you can set the `telemetry.enableTelemetry` setting to `false`. Learn more in our [FAQ](https://code.visualstudio.com/docs/supporting/faq#_how-to-disable-telemetry-reporting).

## License

[MICROSOFT SOFTWARE LICENSE TERMS](https://raw.githubusercontent.com/Azure/logicapps/master/preview/LICENSE)
