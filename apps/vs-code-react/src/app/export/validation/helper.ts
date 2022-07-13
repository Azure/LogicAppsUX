import { ValidationStatus } from '../../../run-service';

export const getValidationListColumns = () => {
  return [
    { key: 'action', name: 'action', fieldName: 'action', minWidth: 170, maxWidth: 250, isResizable: true },
    { key: 'status', name: 'status', fieldName: 'status', minWidth: 170, maxWidth: 250, isResizable: true },
    { key: 'message', name: 'message', fieldName: 'message', minWidth: 170, maxWidth: 250, isResizable: true },
  ];
};

const getDetailsErrors = (itemsSchema: any, actionName: string) => {
  const { details, validationState } = itemsSchema;
  const errors = Object.values(details).map((detail: any) => {
    return { action: actionName, status: validationState, message: detail.message };
  });
  return errors;
};

const getValidationGroup = (workflowSchema: any, groupName: string, level: number, startIndex: number, count: number, children: any[]) => {
  const isCollapsed = (workflowSchema?.validationState && workflowSchema?.validationState === ValidationStatus.succeeded) ?? false;

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

const getItemsValidation = (itemsSchema: any, innerStart: number) => {
  const items: any = [];
  const validationGroups: any = [];
  const itemsIds = Object.keys(itemsSchema);

  itemsIds.forEach((itemId) => {
    const item = itemsSchema[itemId];
    const actionName = item.displayName ?? itemId;
    const actionStatus = item.validationState;
    const validationGroupsLength = validationGroups.length;

    const startIndex = validationGroupsLength > 0 ? validationGroups[validationGroupsLength - 1].startIndex + 1 : innerStart;

    if (actionStatus !== ValidationStatus.succeeded && item?.details) {
      const errors = getDetailsErrors(item, actionName);
      validationGroups.push(getValidationGroup(item, actionName, 2, startIndex, errors.length, []));
      items.push(...errors);
    } else {
      validationGroups.push(getValidationGroup(item, actionName, 2, startIndex, 1, []));
      items.push({ action: actionName, status: actionStatus, message: '' });
    }
  });

  return { items, validationGroups };
};

const getIndexStart = (workflowsGroups: any, children: any, groupIndex: number) => {
  const workflowsLength = workflowsGroups.length;
  const childrenLength = children.length;
  let indexStart = workflowsLength > 0 && groupIndex < 2 ? workflowsGroups[workflowsLength - 1].count : 0;
  indexStart += childrenLength > 0 ? children[childrenLength - 1].count : 0;
  indexStart += childrenLength > 0 && groupIndex >= 2 ? children[childrenLength - 1].startIndex : 0;

  return indexStart;
};

export const parseValidationData = (validationData: any) => {
  const workflowsSchema = validationData?.properties?.workflows ?? {};
  const workflowsGroups: any = [];
  const workflowsItems: any = [];

  const workflowsIds = Object.keys(workflowsSchema);

  workflowsIds.forEach((workflowId) => {
    const workflowSchema = workflowsSchema[workflowId];
    let detailsCount = 0;
    const children: any[] = [];

    Object.keys(workflowSchema).forEach((workflowSchemaKey, index) => {
      const indexStart = getIndexStart(workflowsGroups, children, index);
      const { items = [], validationGroups = [] } = index === 0 ? {} : getItemsValidation(workflowSchema[workflowSchemaKey], indexStart);
      detailsCount += items.length;

      if (index !== 0) {
        const innerValidationGroup = getValidationGroup(
          workflowSchema[workflowSchemaKey],
          workflowSchemaKey,
          1,
          indexStart,
          validationGroups.length,
          validationGroups
        );
        children.push(innerValidationGroup);
      }

      workflowsItems.push(...items);
    });

    const workflowsGroupsLength = workflowsGroups.length;
    const startIndex = workflowsGroupsLength > 0 ? workflowsGroups[workflowsGroupsLength - 1].startIndex + detailsCount - 1 : 0;
    const workflowGroup = getValidationGroup(workflowSchema, workflowId, 0, startIndex, detailsCount, children);
    workflowsGroups.push(workflowGroup);
  });

  return { validationItems: workflowsItems, validationGroups: workflowsGroups };
};
