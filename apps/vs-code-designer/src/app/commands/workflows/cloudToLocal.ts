// Used cloudToLocal.ts as a template to create this file
// This file is used to import a Logic App from Azure to the local workspace
// Still need to implement the rest of the imports
import * as fs from 'fs';
import { getAccountCredentials } from '../../utils/credentials';
import type { TokenCredential } from '@azure/core-auth';
import { LogicManagementClient } from '@azure/arm-logic';
import * as path from 'path';
import AdmZip = require('adm-zip');

async function isStateful(logicApp: any): Promise<boolean> {
  // Need to check if the Logic App is stateful
  // This is a placeholder implementation
  return logicApp.stateful || false;
}

async function handleParameterizedConnections(logicApp: any): Promise<any> {
  // Need to handle parameterized connections
  // This is a placeholder implementation
  if (logicApp.parameterized) {
    logicApp.auth = 'raw key';
  }
  return logicApp;
}

async function createNewWorkspace(): Promise<string> {
  // Need to create a new workspace
  // This is a placeholder implementation
  const workspacePath = './newWorkspace';
  if (!fs.existsSync(workspacePath)) {
    fs.mkdirSync(workspacePath);
  }
  return workspacePath;
}

async function createZipFile(logicApp: any, workspacePath: string): Promise<string> {
  const zip = new AdmZip();
  const logicAppJson = JSON.stringify(logicApp, null, 2);
  zip.addFile('logicApp.json', Buffer.alloc(logicAppJson.length, logicAppJson));
  // Add your connection parameters to the zip
  // zip.addFile('connectionParameters.json', Buffer.alloc(connectionParametersJson.length, connectionParametersJson));
  const zipPath = path.join(workspacePath, 'logicApp.zip');
  zip.writeZip(zipPath);
  return zipPath;
}

async function copyZipToWorkspace(zipPath: string, workspacePath: string): Promise<void> {
  fs.copyFileSync(zipPath, path.join(workspacePath, path.basename(zipPath)));
}

async function createImportButton(): Promise<void> {
  // Information after clicking button
  // This is a placeholder implementation
  window.showInformationMessage('Import zip into new Workspace', 'Import').then((selection) => {
    if (selection === 'Import') {
      cloudToLocal();
    }
  });
}

async function cloudToLocal() {
  // Set up Azure credentials
  const credentials: TokenCredential | undefined = await getAccountCredentials();

  // Set up Logic Management Client
  const subscriptionId = '<Your Azure Subscription ID>';
  const resourceGroupName = '<Your Resource Group Name>';
  const logicAppName = '<Your Logic App Name>';
  const client = new LogicManagementClient(credentials, subscriptionId);

  // Get Logic App definition
  let logicApp = await client.workflowVersions.get(resourceGroupName, logicAppName, 'current');

  // Check if Logic App is stateful
  if (await isStateful(logicApp)) {
    console.log('Logic App is stateful, bypassing import.');
    return;
  }

  // Handle parameterized connections
  logicApp = await handleParameterizedConnections(logicApp);

  // Create new workspace
  const workspacePath = await createNewWorkspace();

  // Create zip file
  const zipPath = await createZipFile(logicApp, workspacePath);

  // Copy zip file to new workspace
  await copyZipToWorkspace(zipPath, workspacePath);

  console.log(`Logic App definition has been written to ${zipPath}`);
}

createImportButton().catch((err) => console.error(err));
