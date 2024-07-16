import type { IAzureConnectorsContext } from '../workflows/azureConnectorWizard';
import type * as vscode from 'vscode';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import { ext } from '../../../extensionVariables';

export async function generateStaticWebApp(context: IAzureConnectorsContext, node: vscode.Uri): Promise<void> {
  console.log('generate SWA');
  //removing "/c: because that doesn't fit SWA cli format"
  const command: string = `node C:\\Users\\t-azhiyanov\\static-web-apps-cli-sifat\\dist\\cli\\bin.js generate ${node.path.substring(3)}`;
  executeCommand(ext.outputChannel, undefined, command);
}
