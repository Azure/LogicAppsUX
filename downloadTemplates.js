/* eslint-disable no-undef */
import { existsSync, writeFile, createWriteStream } from 'fs';
import { mkdir, rm } from 'fs/promises';
import client from 'https';

const releaseBranch = 'release/20250224';

const baseURL = `https://raw.githubusercontent.com/azure/LogicAppsTemplates/${releaseBranch}`;
const sourceCodeURL = `https://github.com/Azure/LogicAppsTemplates/tree/${releaseBranch}`;
const templatesFolder = './libs/logic-apps-shared/src/designer-client-services/lib/templates';

const downloadFile = async (path) => {
  const artifactUrl = `${baseURL}/${path}`;
  client.get(artifactUrl, (res) => {
    res.pipe(createWriteStream(`${templatesFolder}/${path}`));
  });
};

const downloadFetchFile = async (path) => {
  downloadFile(path);
  return await fetch(`${baseURL}/${path}`);
};

const removeTemplatesFolderIfPresent = async () => {
  if (existsSync(templatesFolder)) {
    await rm(templatesFolder, { recursive: true });
  }
};

const createTemplatesFolder = async (path) => {
  await mkdir(`${templatesFolder}/${path}`, { recursive: true });
};

const downloadTemplate = async (path) => {
  const templateManifest = await (await fetch(`${baseURL}/${path}/manifest.json`)).json();
  for (const artifact of templateManifest.artifacts) {
    await downloadFile(`${path}/${artifact.file}`);
  }

  if (templateManifest.images.light && templateManifest.images.dark) {
    await downloadFile(`${path}/${templateManifest.images.light}.png`);
    await downloadFile(`${path}/${templateManifest.images.dark}.png`);
    templateManifest.images = {
      light: `${baseURL}/${path}/${templateManifest.images.light}.png`,
      dark: `${baseURL}/${path}/${templateManifest.images.dark}.png`,
    };
  } else {
    templateManifest.images = undefined;
  }

  templateManifest.sourceCodeUrl = `${sourceCodeURL}/${path}/manifest.json`;
  writeFile(`${templatesFolder}/${path}/manifest.json`, JSON.stringify(templateManifest, null, 2), () => {});

  for (const workflowId of Object.keys(templateManifest.workflows ?? {})) {
    createTemplatesFolder(`${path}/${workflowId}`);
    await downloadTemplate(`${path}/${workflowId}`);
  }
};

const run = async () => {
  await removeTemplatesFolderIfPresent();
  await createTemplatesFolder('');
  const registeredManifestNames = await (await downloadFetchFile('manifest.json')).json();

  for (const manifestName of registeredManifestNames) {
    await createTemplatesFolder(manifestName);
    await downloadTemplate(manifestName);
  }
};

run();
