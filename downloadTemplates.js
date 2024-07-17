import fs from 'fs-extra';

const baseURL = `https://raw.githubusercontent.com/azure/LogicAppsTemplates/master`;
const templatesFolder = `./libs/designer/src/lib/core/templates/templateFiles`;

const removeTemplatesFolderIfPresent = () => {
  if (fs.existsSync(templatesFolder)) {
    fs.rmSync(templatesFolder, { recursive: true });
  }
};

const createTemplatesFolder = async (path) => {
  await fs.mkdir(`${templatesFolder}/${path}`, { recursive: true });
};

const downloadManifest = async () => {
  const manifestUrl = `${baseURL}/manifest.json`;
  // eslint-disable-next-line no-undef
  const manifestRes = await fetch(manifestUrl);
  const data = await manifestRes.json();
  await fs.writeFile(`${templatesFolder}/manifest.json`, JSON.stringify(data, null, 2));
  return data;
};

const downloadTemplate = async (path) => {
  const templateManifestUrl = `${baseURL}/${path}/manifest.json`;
  // eslint-disable-next-line no-undef
  const templateManifestRes = await fetch(templateManifestUrl);
  const templateManifest = await templateManifestRes.json();
  for (const artifact of templateManifest.artifacts) {
    await downloadArtifact(`${path}/${artifact.file}`);
  }
  templateManifest.images = {
    light: `${baseURL}/${path}/${templateManifest.images.light}.png`,
    dark: `${baseURL}/${path}/${templateManifest.images.dark}.png`,
  };

  await fs.writeFile(`${templatesFolder}/${path}/manifest.json`, JSON.stringify(templateManifest, null, 2));
};

const downloadArtifact = async (path) => {
  const artifactUrl = `${baseURL}/${path}`;
  // eslint-disable-next-line no-undef
  const artifactRes = await fetch(artifactUrl);
  const data = await artifactRes.json();
  await fs.writeFile(`${templatesFolder}/${path}`, JSON.stringify(data, null, 2));
};

const run = async () => {
  removeTemplatesFolderIfPresent();
  await createTemplatesFolder('');
  const value = await downloadManifest();
  for (const path of value) {
    await createTemplatesFolder(path);
    await downloadTemplate(path);
  }
};

run();
