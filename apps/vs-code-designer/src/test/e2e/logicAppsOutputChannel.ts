const logicAppsExtensionId = 'ms-azuretools.vscode-azurelogicapps';
const logicAppsStandardOutputLabel = 'Azure Logic Apps (Standard)';
const outputCommandPrefix = `workbench.action.output.show.extension-output-${logicAppsExtensionId}-#`;
const outputCommandSuffix = `-${logicAppsStandardOutputLabel}`;

export function findLogicAppsStandardOutputCommand(commands: readonly string[]): string | undefined {
  const matches = commands.filter((command) => command.startsWith(outputCommandPrefix) && command.endsWith(outputCommandSuffix));
  if (matches.length > 1) {
    throw new Error(`Ambiguous ${logicAppsStandardOutputLabel} output commands: ${matches.join(', ')}`);
  }
  return matches[0];
}

export async function showLogicAppsStandardOutput(
  getCommands: () => Thenable<string[]>,
  executeCommand: (command: string) => Thenable<unknown>,
  deadline: number
): Promise<string> {
  let command: string | undefined;
  while (!command && Date.now() < deadline) {
    command = findLogicAppsStandardOutputCommand(await getCommands());
    if (!command) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  if (!command) {
    throw new Error(`${logicAppsStandardOutputLabel} output channel was not registered before the startup diagnostic deadline`);
  }
  await executeCommand(command);
  return command;
}
