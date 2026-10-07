const logicAppsExtensionId = 'ms-azuretools.vscode-azurelogicapps';
const logicAppsStandardOutputLabel = 'Azure Logic Apps (Standard)';
const outputCommandPrefix = `workbench.action.output.show.extension-output-${logicAppsExtensionId}-#`;
const outputCommandSuffixes = [`-${logicAppsStandardOutputLabel}`, '-Azure-Logic-Apps-Standard-log'];
const toggleOutputCommand = 'workbench.action.output.toggleOutput';

export function findLogicAppsStandardOutputCommand(commands: readonly string[]): string | undefined {
  const matches = commands.filter(
    (command) => command.startsWith(outputCommandPrefix) && outputCommandSuffixes.some((suffix) => command.endsWith(suffix))
  );
  if (matches.length > 1) {
    throw new Error(`Ambiguous ${logicAppsStandardOutputLabel} output commands: ${matches.join(', ')}`);
  }
  return matches[0];
}

export async function showLogicAppsStandardOutput(
  getCommands: () => Thenable<string[]>,
  executeCommand: (command: string, ...args: unknown[]) => Thenable<unknown>,
  deadline: number
): Promise<string> {
  let outputOpened = false;
  while (Date.now() < deadline) {
    const commands = await getCommands();
    const exactCommand = findLogicAppsStandardOutputCommand(commands);
    if (exactCommand) {
      await executeCommand(exactCommand);
      return exactCommand;
    }
    if (!outputOpened && commands.includes(toggleOutputCommand)) {
      await executeCommand(toggleOutputCommand);
      outputOpened = true;
      continue;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`${logicAppsStandardOutputLabel} output command was not registered before the startup diagnostic deadline`);
}
