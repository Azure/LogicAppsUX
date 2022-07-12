export const getValidationColumns = () => {
  return [
    { key: 'action', name: 'action', fieldName: 'action', minWidth: 170, maxWidth: 250, isResizable: true },
    { key: 'status', name: 'status', fieldName: 'status', minWidth: 170, maxWidth: 250, isResizable: true },
    { key: 'message', name: 'message', fieldName: 'message', minWidth: 170, maxWidth: 250, isResizable: true },
  ];
};

const getActionDetails = (itemsSchema: any, actionName: string) => {
  const { details, validationState } = itemsSchema;
  const errors = Object.values(details).map((detail: any) => {
    return { action: actionName, status: validationState, message: detail.message };
  });
  return errors;
};

const getValidationGroup = (workflowSchema: any, groupName: string) => {
  const isCollapsed = workflowSchema.validationState && workflowSchema.validationState === 'Succeeded';

  return {
    children: [],
    isCollapsed: isCollapsed,
    key: groupName,
    level: 0,
    name: groupName,
    startIndex: 0,
  };
};

const getItemsValidation = (itemsSchema: any) => {
  const items: any = [];
  const workflowsId = Object.keys(itemsSchema);

  workflowsId.forEach((workflowId) => {
    const item = itemsSchema[workflowId];
    const actionName = item.displayName ?? workflowId;
    const actionStatus = item.validationState;

    if (actionStatus !== 'Succeeded' && item?.details) {
      items.push(...getActionDetails(item, actionName));
    } else {
      items.push({ action: actionName, status: actionStatus, message: '' });
    }
  });

  return items;
};

export const parseValidationData = (validationData: any) => {
  const workflowsState = validationData?.properties?.workflows ?? {};
  const validationGroups: any = [];
  const validationItems: any = [];

  const workflowsId = Object.keys(workflowsState);

  workflowsId.forEach((workflowId) => {
    const workflowSchema = workflowsState[workflowId];
    const workflowGroup = getValidationGroup(workflowSchema, workflowId);

    validationItems.push(...getItemsValidation(workflowSchema.workflowOperations));
    validationItems.push(...getItemsValidation(workflowSchema.connections));
    validationItems.push(...getItemsValidation(workflowSchema.parameters));
    validationGroups.push(workflowGroup);
  });

  return { validationItems, validationGroups };
};
