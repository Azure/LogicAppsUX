export const readJsonFiles = async (fileName: string): Promise<any[]> => {
  try {
    // // Read all files in the folder
    const modules = import.meta.glob('../../../../../__mocks__/runs/**/*.json');
    const importedFiles = await Promise.all(
      Object.entries(modules).map(async ([path, resolver]) => {
        const module = await resolver();
        return { path, module };
      })
    );

    // Filter .json files
    const filteredFiles = importedFiles.filter((file) => file.path.includes(fileName));

    // // Resolve all imports
    return await Promise.all(filteredFiles);
  } catch (error) {
    console.error('Error reading the run file:', error);
    throw error;
  }
};
