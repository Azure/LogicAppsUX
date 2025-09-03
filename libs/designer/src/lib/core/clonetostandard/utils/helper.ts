import { equals } from '@microsoft/logic-apps-shared';

export const getCloneWorkflowName = (baseName: string, existingWorkflowNames?: string[]): string => {
  let counter = 1;
  const newNameWithClone = `${baseName}_clone`;
  let newUniqueName = newNameWithClone;

  while (existingWorkflowNames?.some((name) => equals(name, newUniqueName))) {
    newUniqueName = `${newNameWithClone}${counter}`;
    counter++;
  }

  return newUniqueName;
};
