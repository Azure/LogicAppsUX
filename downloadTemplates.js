/* eslint-disable no-undef */
import { existsSync, createWriteStream } from 'fs';
import { mkdir, writeFile, rm } from 'fs/promises';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import client from 'https';

const baseURL = `https://raw.githubusercontent.com/azure/LogicAppsTemplates/master`;
const templatesFolder = `./libs/designer/src/lib/core/templates/templateFiles`;

const downloadFile = async (url, fileName) => {
  const res = await fetch(url);
  const fileStream = createWriteStream(fileName, { flags: 'wx' });
  await finished(Readable.fromWeb(res.body).pipe(fileStream));
  return fetch(url);
};

const removeTemplatesFolderIfPresent = async () => {
  if (existsSync(templatesFolder)) {
    await rm(templatesFolder, { recursive: true });
  }
};

const createTemplatesFolder = async (path) => {
  await mkdir(`${templatesFolder}/${path}`, { recursive: true });
};

const downloadManifest = async () => {
  const manifestUrl = `${baseURL}/manifest.json`;
  const manifestLocation = `${templatesFolder}/manifest.json`;
  const res = await downloadFile(manifestUrl, manifestLocation);
  return await res.json();
};

const downloadTemplate = async (path) => {
  const templateManifestUrl = `${baseURL}/${path}/manifest.json`;
  const templateManifestFileLocation = `${templatesFolder}/${path}/manifest.json`;
  const templateManifest = await (await downloadFile(templateManifestUrl, templateManifestFileLocation)).json();
  for (const artifact of templateManifest.artifacts) {
    if (artifact.file.endsWith('.json')) {
      // We only support .json for now
      await downloadJsonArtifact(`${path}/${artifact.file}`);
    }
  }
  await downloadImage(`${path}/${templateManifest.images.light}.png`);
  await downloadImage(`${path}/${templateManifest.images.dark}.png`);
  await writeFile(templateManifestFileLocation, JSON.stringify(templateManifest, null, 2));
};

const downloadJsonArtifact = async (path) => {
  const artifactUrl = `${baseURL}/${path}`;
  await downloadFile(artifactUrl, `${templatesFolder}/${path}`);
};

const downloadImage = async (path) => {
  const artifactUrl = `${baseURL}/${path}`;
  client.get(artifactUrl, (res) => {
    res.pipe(createWriteStream(`${templatesFolder}/${path}`));
  });
};

const run = async () => {
  await removeTemplatesFolderIfPresent();
  await createTemplatesFolder('');
  const value = await downloadManifest();
  for (const path of value) {
    await createTemplatesFolder(path);
    await downloadTemplate(path);
  }
};

run();
