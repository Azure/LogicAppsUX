/* eslint-disable no-undef */
import { existsSync, writeFile, createWriteStream } from 'fs';
import { mkdir, rm } from 'fs/promises';
import client from 'https';

const releaseBranch = 'release/20250324';

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

const downloadTemplate = async (templateId) => {
  const templateManifest = await (await fetch(`${baseURL}/${templateId}/manifest.json`)).json();
  for (const artifact of templateManifest?.artifacts ?? []) {
    await downloadFile(`${templateId}/${artifact.file}`);
  }

  templateManifest.sourceCodeUrl = `${sourceCodeURL}/${templateId}/manifest.json`;
  writeFile(`${templatesFolder}/${templateId}/manifest.json`, JSON.stringify(templateManifest, null, 2), () => {});

  for (const workflowId of Object.keys(templateManifest.workflows)) {
    createTemplatesFolder(`${templateId}/${workflowId}`);
    await downloadWorkflowManifest(`${templateId}/${workflowId}`);
  }
};

const downloadWorkflowManifest = async (path) => {
  const workflowManifest = await (await fetch(`${baseURL}/${path}/manifest.json`)).json();
  for (const artifact of workflowManifest.artifacts) {
    await downloadFile(`${path}/${artifact.file}`);
  }

  if (workflowManifest.images.light && workflowManifest.images.dark) {
    workflowManifest.images = {
      light: `${baseURL}/${path}/${workflowManifest.images.light}.png`,
      dark: `${baseURL}/${path}/${workflowManifest.images.dark}.png`,
    };
  } else {
    workflowManifest.images = undefined;
  }

  workflowManifest.sourceCodeUrl = `${sourceCodeURL}/${path}/manifest.json`;
  writeFile(`${templatesFolder}/${path}/manifest.json`, JSON.stringify(workflowManifest, null, 2), () => {});
};

const run = async () => {
  await removeTemplatesFolderIfPresent();
  await createTemplatesFolder('');
  const registeredManifestNames = await (await downloadFetchFile('manifest.json')).json();

  for (const templateId of registeredManifestNames) {
    await createTemplatesFolder(templateId);
    await downloadTemplate(templateId);
  }
};

run();
