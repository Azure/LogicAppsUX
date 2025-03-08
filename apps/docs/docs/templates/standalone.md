# Standalone

## Local browser experience for development

#### Prerequisite

#### Run

To run Templates Standalone:

1. Follow Steps in [Development in Standalone](/Development/Standalone)
2. Open localhost with templates specific route (localhost:4200/templates)

From here (localhost:4200/templates in your browser), you can either:

- View all available templates (which is imported by [LogicAppsTemplates Repo](https://github.com/Azure/LogicAppsTemplates/tree/main))
- Choose template to create the workflow with

#### Troubleshoot 

1. The standalone page is not loading templates
   - Make sure you have ran `pnpm install` (`pnpm postinstall` runs the script for downloading templates)
   - Make sure you have selected the Logic Apps resource from the dropdown (templates load once resource is selected)
2. The standalone page is not showing the latest templates from [LogicAppsTemplates Repo](https://github.com/Azure/LogicAppsTemplates/tree/main)
   - Check the 'releaseBranch' variable in downloadTemplate.js - we cut branches every release, so it'll likely be pointing at the latest release branch, meaning changes in main may not be reflected.
   - Q. It doesn't show any templates at all
      - A. Run `pnpm install` again (`pnpm postinstall` runs the script for downloading latest released templates)
3. The page is not loading templates / showing 'Reload page after loading arm token.' on the top
   - This means you do not have the valid arm token. Follow Steps in [Direct development against live APIs](/Development/Standalone)
   - Q. Why do I need a arm token to run templates? 
      - A. Templates experience includes deploying the template to your resources, so we need the arm token to bring this experience.