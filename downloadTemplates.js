/* eslint-disable no-undef */
import { existsSync, createWriteStream } from 'fs';
import { mkdir, rm } from 'fs/promises';
import client from 'https';

const baseURL = `https://raw.githubusercontent.com/azure/LogicAppsTemplates/master`;
const templatesFolder = `./libs/designer/src/lib/core/templates/templateFiles`;

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
  const templateManifest = await (await downloadFetchFile(`${path}/manifest.json`)).json();
  for (const artifact of templateManifest.artifacts) {
    await downloadFile(`${path}/${artifact.file}`);
  }
  await downloadFile(`${path}/${templateManifest.images.light}.png`);
  await downloadFile(`${path}/${templateManifest.images.dark}.png`);
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
