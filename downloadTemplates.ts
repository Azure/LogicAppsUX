import fs from 'fs-extra';

const baseURL = `https://raw.githubusercontent.com/azure/LogicAppsTemplates/master`;
const templatesFolder = `./libs/designer/src/lib/core/templates/templateFiles`;

const removeTemplatesFolderIfPresent = () => {
  if (fs.existsSync(templatesFolder)) {
    fs.rmSync(templatesFolder, { recursive: true });
  }
};

const createTemplatesFolder = async (path: string) => {
  await fs.mkdir(`${templatesFolder}/${path}`, { recursive: true });
};

const downloadManifest = async (): Promise<string[]> => {
  const manifestUrl = `${baseURL}/manifest.json`;
  const manifestRes = await fetch(manifestUrl);
  const data = await manifestRes.json();
  await fs.writeFile(`${templatesFolder}/manifest.json`, JSON.stringify(data, null, 2));
  return data as string[];
};

const downloadTemplate = async (path: string) => {
  const templateManifestUrl = `${baseURL}/${path}/manifest.json`;
  const templateManifestRes = await fetch(templateManifestUrl);
  const templateManifest: any = await templateManifestRes.json();
  for (const artifact of templateManifest.artifacts) {
    await downloadArtifact(`${path}/${artifact.file}`);
  }
  await downloadImage(`${path}/${templateManifest.images.light}`);
  await downloadImage(`${path}/${templateManifest.images.dark}`);
};

const downloadArtifact = async (path: string) => {
  const artifactUrl = `${baseURL}/${path}`;
  const artifactRes = await fetch(artifactUrl);
  const data = await artifactRes.json();
  await fs.writeFile(`${templatesFolder}/${path}`, JSON.stringify(data, null, 2));
};

const downloadImage = async (_path: string) => {
  // TODO
  // const imageUrl = `${baseURL}/${path}`;
  // console.log("---loading to : ", `${templatesFolder}/${path}.png`);
  // const imageFileStream = fs.createWriteStream(`${templatesFolder}/${path}.png`);
  // const imageRes = await nodeFetch(imageUrl);
  // await new Promise((resolve, reject) => {
  //     imageRes?.body?.pipe(imageFileStream);
  //     imageRes?.body?.on("error", reject);
  //     imageFileStream.on("finish", resolve);
  //   });
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
