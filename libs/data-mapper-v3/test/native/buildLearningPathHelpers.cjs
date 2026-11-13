const { execFileSync } = require('node:child_process');
const { existsSync, statSync } = require('node:fs');
const path = require('node:path');

exports.buildLearningPathHelpers = (corpusRoot) => {
  const helpers = [
    {
      directory: path.join(corpusRoot, 'Calling-external-assembly-from-Custom-XSLT', 'BizTalk.CallingExternalAssemblyFromInlineXSLT'),
      source: 'MappingFunctions.cs',
      assembly: 'MapperExtensionsFunctions.dll',
    },
    {
      directory: path.join(
        corpusRoot,
        'How-to-Access-Orchestration-Variables-from-Maps',
        'HowToSendOrchestrationVariablesIntoMaps',
        'UsingHelperClass'
      ),
      source: 'StoreValues.cs',
      assembly: 'StoreValuesHelperClass.dll',
    },
  ];
  const windows = process.env.WINDIR || 'C:\\Windows';
  const compiler = ['Framework64', 'Framework']
    .map((folder) => path.join(windows, 'Microsoft.NET', folder, 'v4.0.30319', 'csc.exe'))
    .find(existsSync);
  if (!compiler) {
    throw new Error('The .NET Framework C# compiler is required for the learning-path extension-object fixture.');
  }
  for (const helper of helpers) {
    const source = path.join(helper.directory, helper.source);
    const output = path.join(helper.directory, helper.assembly);
    if (!existsSync(output) || statSync(output).mtimeMs < statSync(source).mtimeMs) {
      execFileSync(compiler, ['/nologo', '/target:library', `/out:${output}`, source], {
        timeout: 30_000,
        windowsHide: true,
      });
    }
  }
  return path.join(helpers[0].directory, helpers[0].assembly);
};
