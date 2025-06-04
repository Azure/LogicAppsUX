import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ProgressLocation, window } from 'vscode';
import type { SlotTreeItem } from '../../../tree/slotsTree/SlotTreeItem';
import { localize } from '../../../../localize';
import { connectToSMB } from './connectToSMB';
import { cleanSMB, deleteSMBFolder, unMountSMB } from './cleanResources';
import { getRandomHexString } from '../../../utils/fs';
import { createOrUpdateHybridApp, patchAppSettings } from '../../../utils/codeless/hybridLogicApp/hybridApp';
import { updateSMBConnectedEnvironment } from '../../../utils/codeless/hybridLogicApp/connectedEnvironment';
import path from 'path';
import { getAuthorizationToken } from '../../../utils/codeless/getAuthorizationToken';
import { getWorkspaceSetting } from '../../../utils/vsCodeConfig/settings';
import {
  azurePublicBaseUrl,
  driveLetterSMBSetting,
  hybridAppApiVersion,
  workflowAppAADClientId,
  workflowAppAADClientSecret,
  workflowAppAADTenantId,
} from '../../../../constants';
import axios from 'axios';
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { isSuccessResponse } from '@microsoft/vscode-extension-logic-apps';
import * as fs from 'fs';
import { ClientSecretCredential } from '@azure/identity';
import * as yazl from 'yazl';
import * as os from 'os';
import { createContainerClient } from '../../../utils/azureClients';

export const deployHybridLogicApp = async (context: IActionContext, node: SlotTreeItem) => {
  const mountDrive: string = getWorkspaceSetting<string>(driveLetterSMBSetting);

  try {
    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: localize('deployingHibridLogicApp', 'Deploying hybrid logic app'),
        cancellable: true,
      },
      async (progress) => {
        context.telemetry.properties.lastStep = 'connectToSMB';

        const newSmbFolderName = `${node.hybridSite.name}-${getRandomHexString(32 - node.hybridSite.name.length - 1)}`.toLowerCase();

        const accessToken = await getAuthorizationToken();

        progress.report({ increment: 16, message: 'Connecting to SMB and uploading files' });

        if (!node.fileShare) {
          await getSMBDetails(context, node);
        }

        const smbPathParts = node.fileShare.path.split(path.sep);
        const currentSmbFolder = smbPathParts.length === 2 ? smbPathParts[1] : null;
        node.fileShare.path = smbPathParts[0];

        await connectToSMB(context, node, newSmbFolderName, mountDrive);

        progress.report({
          increment: 16,
          message: 'Update SMB to connected environment',
        });

        await updateSMBConnectedEnvironment(
          accessToken,
          node.subscription.subscriptionId,
          node.connectedEnvironment?.id ?? node.hybridSite.environmentId,
          newSmbFolderName,
          {
            ...node.fileShare,
            path: path.join(node.fileShare.path, newSmbFolderName),
          }
        );

        progress.report({ increment: 16, message: 'Updating hybrid logic app' });
        const hybridAppOptions = {
          sqlConnectionString: node.sqlConnectionString,
          location: node.location,
          connectedEnvironment: node.connectedEnvironment,
          storageName: newSmbFolderName,
          subscriptionId: node.subscription.subscriptionId,
          resourceGroup: node.resourceGroupName ?? node.hybridSite.id.split('/')[4],
          siteName: node.hybridSite.name,
          hybridApp: node.hybridSite,
        };
        await createOrUpdateHybridApp(context, accessToken, hybridAppOptions);

        if (currentSmbFolder) {
          progress.report({ increment: 16, message: 'Cleaning up previous resources' });
          await cleanSMB(node.hybridSite.environmentId, currentSmbFolder, accessToken);
          await deleteSMBFolder(mountDrive, currentSmbFolder);
        }

        progress.report({ increment: 20, message: 'Unmounting SMB' });
      }
    );
  } catch (error) {
    throw new Error(`${localize('errorDeployingHybridLogicApp', 'Error deploying hybrid logic app')} - ${error.message}`);
  } finally {
    await unMountSMB(mountDrive);
  }
};

export const zipDeployHybridLogicApp = async (context: IActionContext, node: SlotTreeItem, effectiveDeployFsPath: string) => {
  try {
    const logicAppsContext = context as ILogicAppWizardContext;
    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: localize('deployingHybridLogicAppV2', 'Deploying hybrid logic app using zip deploy'),
        cancellable: true,
      },
      async (progress) => {
        context.telemetry.properties.lastStep = 'zipAndDeploy';

        progress.report({ increment: 20, message: 'Zipping content for deployment' });

        const zipFilePromise = createZipFileOnDisk(effectiveDeployFsPath);
        const accessTokenPromise = getAccessTokenForZipDeploy(node, logicAppsContext);

        if (!node.hybridSite.configuration?.ingress?.fqdn) {
          const clientContainer = await createContainerClient(logicAppsContext);
          await waitForIngressFqdn(node, context, clientContainer);
        }

        const containerAppProvisioningPromise = waitForContainerAppProvisioning(
          node.hybridSite.configuration.ingress.fqdn,
          context,
          progress
        );

        const [zipFilePath, accessToken] = await Promise.all([zipFilePromise, accessTokenPromise, containerAppProvisioningPromise]);

        progress.report({ increment: 60, message: 'Uploading ZIP to Logic App' });
        // Step 3: Call the /zipDeploy API
        const zipDeployUrl = `https://${node.hybridSite.configuration.ingress.fqdn}/api/zipDeploy`;
        await axios.put(zipDeployUrl, fs.createReadStream(zipFilePath), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/zip',
          },
          maxContentLength: Number.POSITIVE_INFINITY,
          maxBodyLength: Number.POSITIVE_INFINITY,
        });

        const hybridAppOptions = {
          location: node.location,
          connectedEnvironment: node.connectedEnvironment,
          subscriptionId: node.subscription.subscriptionId,
          resourceGroup: node.resourceGroupName ?? node.hybridSite.id.split('/')[4],
          siteName: node.hybridSite.name,
          hybridApp: node.hybridSite,
        };

        if (!logicAppsContext.isCreate) {
          progress.report({ increment: 80, message: 'Updating app settings' });

          await patchAppSettings(hybridAppOptions, context, await getAuthorizationToken());
        }

        progress.report({ increment: 100, message: 'Deployment completed successfully' });

        // Clean up the zip file after deployment
        fs.unlinkSync(zipFilePath);
      }
    );
  } catch (error) {
    context.telemetry.properties.errorDeployingHybridLogicAppV2 = error instanceof Error ? error.message : String(error);
    throw new Error(`${localize('errorDeployingHybridLogicAppV2', 'Error deploying hybrid logic app (v2)')} - ${error.message}`);
  }
};

const waitForContainerAppProvisioning = async (fqdn: string, context, progress): Promise<void> => {
  progress.report({ increment: 40, message: `Waiting for logic app to be ready: ${fqdn}` });
  const maxRetries = 40; // Maximum number of retries
  const delay = 3000; // Delay between retries in milliseconds (3 seconds)
  const zipDeployUrl = `https://${fqdn}/api/zipDeploy`;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.get(zipDeployUrl, { timeout: 3000 });
      if (response.status === 200) {
        return; // Container app is ready
      }
    } catch (_) {
      // Ignore errors and retry
    }

    await new Promise((resolve) => setTimeout(resolve, delay)); // Wait before retrying
  }
  const errorMessage = 'Logic app is not ready to serve traffic after waiting.';
  context.telemetry.properties.logicAppNotProvisionedError = errorMessage;
  throw new Error(localize('logicAppNotReadyError', errorMessage));
};

const waitForIngressFqdn = async (
  node: SlotTreeItem,
  context: IActionContext,
  clientContainer: any,
  maxRetries = 30,
  delay = 3000
): Promise<void> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (node.hybridSite.configuration?.ingress?.fqdn !== null) {
      return;
    }

    try {
      node.hybridSite = await clientContainer.containerApps.get(node.resourceGroupName, node.hybridSite.name);
    } catch (error) {
      console.error(`Error refreshing hybrid site details: ${error.message}`);
    }

    // Wait before retrying
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  const errorMessage = 'Failed to retrieve ingress FQDN after waiting.';
  context.telemetry.properties.ingressFqdnError = errorMessage;
  throw new Error(localize('errorRetrievingIngressFqdn', errorMessage));
};

const createZipFileOnDisk = async (sourceDir: string): Promise<string> => {
  const tempDir = os.tmpdir();
  const zipFilePath = path.join(tempDir, `logicapp-deploy-${Date.now()}.zip`);
  const zipFile = new yazl.ZipFile();

  // List of files and folders to ignore
  const ignoreList = ['node_modules', '.git', '.env', '.vscode', 'workflow-designtime', 'local.settings.json'];

  // Add all files in the directory to the zip
  const addDirectoryToZip = async (dir: string, basePath: string) => {
    const files = await fs.promises.readdir(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const relativePath = path.relative(basePath, fullPath);

      // Skip ignored files and folders
      if (ignoreList.some((ignore) => relativePath.startsWith(ignore))) {
        continue;
      }

      if ((await fs.promises.stat(fullPath)).isDirectory()) {
        await addDirectoryToZip(fullPath, basePath); // Recursively add subdirectories
      } else {
        zipFile.addFile(fullPath, relativePath, { compress: true }); // Add file to the zip
      }
    }
  };

  await addDirectoryToZip(sourceDir, sourceDir);

  // Write the zip file to disk
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipFilePath);
    zipFile.outputStream.pipe(output);

    output.on('close', () => resolve(zipFilePath));
    output.on('error', (err) => reject(err));
    zipFile.end();
  });
};

const getAccessTokenForZipDeploy = async (node: SlotTreeItem, context: ILogicAppWizardContext): Promise<string> => {
  const envVars = node.hybridSite.template?.containers?.[0]?.env || [];
  const tenantId = envVars.find((e) => e.name === workflowAppAADTenantId)?.value;
  const clientId = envVars.find((e) => e.name === workflowAppAADClientId)?.value;
  const clientSecretKey = envVars.find((e) => e.name === workflowAppAADClientSecret)?.secretRef;
  const clientSecret = node.resourceTree?.hybridSiteSecrets?.find((s) => s.name === clientSecretKey)?.value ?? context.aad?.clientSecret;

  if (!tenantId || !clientId || !clientSecret) {
    const errorMessage = 'Missing required environment variables for ZIP deploy: "{0}", "{1}", "{2}"';
    context.telemetry.properties.getAccessTokenError = errorMessage
      .replace('{0}', workflowAppAADClientId)
      .replace('{1}', workflowAppAADTenantId)
      .replace('{2}', workflowAppAADClientSecret);
    throw new Error(
      localize('errorMissingEnvVars', errorMessage, workflowAppAADClientId, workflowAppAADTenantId, workflowAppAADClientSecret)
    );
  }

  // Create a credential using ClientSecretCredential
  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

  // Get the access token for the application
  const tokenResponse = await credential.getToken(`api://${clientId}/.default`);

  if (!tokenResponse || !tokenResponse.token) {
    const errorMessage = 'Failed to retrieve access token for zip deploy API';
    context.telemetry.properties.getAccessTokenError = errorMessage;
    throw new Error(localize('errorFetchingAccessToken', errorMessage));
  }

  return tokenResponse.token;
};

const getSMBDetails = async (context: IActionContext, node: SlotTreeItem) => {
  const smbError = new Error(
    localize('errorDeployingHybridLogicApp', `The logic app ${node.hybridSite.name} is not configured to use SMB`)
  );
  try {
    const volumeMount = node.hybridSite.template.containers[0]?.volumeMounts?.find((v) => v.mountPath === '/home/site/wwwroot');
    const smbVolume = node.hybridSite.template.volumes.find((v) => v.name === volumeMount.volumeName);

    if (smbVolume.storageType !== 'Smb') {
      context.telemetry.properties.smbConfig = 'false';
      throw smbError;
    }
    context.telemetry.properties.smbConfig = 'true';
    await getStorageInfoForConnectedEnv(node.hybridSite.environmentId, smbVolume.storageName, context, node);
  } catch (error) {
    context.telemetry.properties.smbError = error instanceof Error ? error.message : error;
    context.telemetry.properties.smbConfig = 'false';
    throw smbError;
  }
};

const getStorageInfoForConnectedEnv = async (connectedEnvId: string, storageName: string, context: IActionContext, node: SlotTreeItem) => {
  const accessToken = await getAuthorizationToken();

  const url = `${azurePublicBaseUrl}/${connectedEnvId}/storages/${storageName}?api-version=${hybridAppApiVersion}`;

  try {
    const response = await axios.get(url, { headers: { authorization: accessToken } });

    if (!isSuccessResponse(response.status)) {
      throw new Error(response.statusText);
    }

    node.fileShare = {
      hostName: response.data?.properties?.smb?.host,
      path: response.data?.properties?.smb?.shareName,
    };
    const fileSharePath = `${path.sep}${path.sep}${node.fileShare.hostName}${path.sep}${node.fileShare.path.split(path.sep)[0]}`;
    node.fileShare.userName = await context.ui.showInputBox({
      placeHolder: localize('userNameFileShare', `User name for ${fileSharePath}`),
      prompt: localize('userNamePrompt', 'Provide the user name for SMB authentication.'),
      validateInput: async (input: string): Promise<string | undefined> => await validateUserName(input),
    });

    node.fileShare.password = await context.ui.showInputBox({
      placeHolder: localize('passwordFileShare', `Password for ${fileSharePath}`),
      prompt: localize('passwordPrompt', 'Provide the password for SMB authentication.'),
      password: true,
      validateInput: async (input: string): Promise<string | undefined> => await validatePassword(input),
    });
  } catch (error) {
    throw new Error(`${localize('errorGettingSMBDetails', 'Error fetching SMB details')} - ${error.message}`);
  }
};

const validateUserName = async (userName: string | undefined): Promise<string | undefined> => {
  if (!userName) {
    return localize('emptyUserNameError', 'The user name cannot be empty.');
  }
};

const validatePassword = async (password: string | undefined): Promise<string | undefined> => {
  if (!password) {
    return localize('emptyPasswordError', 'The password cannot be empty.');
  }
};
