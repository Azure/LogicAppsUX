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

const getValidationGroup = (workflowSchema: any, groupName: string, level: number, startIndex: number, count: number, children: any[]) => {
  const isCollapsed = (workflowSchema?.validationState && workflowSchema?.validationState === 'Succeeded') ?? false;

  return {
    children,
    isCollapsed: isCollapsed,
    key: groupName,
    level,
    count,
    name: groupName,
    startIndex,
  };
};

const getItemsValidation = (itemsSchema: any) => {
  const items: any = [];
  const validationGroups: any = [];

  const workflowsId = Object.keys(itemsSchema);

  workflowsId.forEach((workflowId) => {
    const item = itemsSchema[workflowId];
    const actionName = item.displayName ?? workflowId;
    const actionStatus = item.validationState;
    const startIndex = validationGroups.length > 0 ? validationGroups[validationGroups.length - 1].startIndex + 1 : 0;

    validationGroups.push(getValidationGroup(item, actionName, 2, startIndex, 1, []));

    if (actionStatus !== 'Succeeded' && item?.details) {
      items.push(...getActionDetails(item, actionName));
    } else {
      items.push({ action: actionName, status: actionStatus, message: '' });
    }
  });

  return { items, validationGroups };
};

export const parseValidationData = (validationData: any) => {
  const workflowsState = validationData?.properties?.workflows ?? {};
  const validationGroupsGlobal: any = [];
  const validationItems: any = [];

  const workflowsId = Object.keys(workflowsState);

  workflowsId.forEach((workflowId) => {
    const workflowSchema = workflowsState[workflowId];
    let count = 0;
    const children: any[] = [];

    Object.keys(workflowSchema).forEach((workflowSchemaKey, index) => {
      const { items = [], validationGroups = [] } = index === 0 ? {} : getItemsValidation(workflowSchema[workflowSchemaKey]);
      count += items.length;

      if (index !== 0) {
        const innerStart = validationGroupsGlobal.length > 0 ? validationGroupsGlobal[validationGroupsGlobal.length - 1].startIndex : 0;

        const innerValidationGroup = getValidationGroup(
          workflowSchema[workflowSchemaKey],
          workflowSchemaKey,
          1,
          innerStart,
          validationGroups.length,
          validationGroups
        );
        children.push(innerValidationGroup);
      }

      validationItems.push(...items);
    });

    const startIndex =
      validationGroupsGlobal.length > 0 ? validationGroupsGlobal[validationGroupsGlobal.length - 1].startIndex + count - 1 : 0;
    const workflowGroup = getValidationGroup(workflowSchema, workflowId, 0, startIndex, count, children);
    validationGroupsGlobal.push(workflowGroup);
  });

  return { validationItems, validationGroups: validationGroupsGlobal };
};
