export const readJsonFiles = async (fileName: string): Promise<any[]> => {
  try {
    // // Read all files in the folder
    const modules = await import.meta.glob('../../../../../__mocks__/runs/**/*.json');
    const importedFiles = await Promise.all(
      Object.entries(modules).map(async ([path, resolver]) => {
        const module = (await resolver()) as Record<string, any>;
        return {
          path,
          module: {
            properties: module.properties,
            id: module.id,
            type: module.type,
          } as any,
        };
      })
    );

    // Filter .json files
    const filteredFiles = importedFiles.filter((file) => file.path.includes(fileName));

    // // Resolve all imports
    return Promise.all(filteredFiles);
  } catch (error) {
    console.error('Error reading the run file:', error);
    throw error;
  }
};
