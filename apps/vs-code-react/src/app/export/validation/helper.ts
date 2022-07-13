import { ValidationStatus } from '../../../run-service';
import type { IValidationData, IGroupedItem, IGroupedGroup, IWorkflowValidation } from '../../../run-service';

export const getValidationListColumns = () => {
  return [
    { key: 'action', name: 'action', fieldName: 'action', minWidth: 170, maxWidth: 250, isResizable: true },
    { key: 'status', name: 'status', fieldName: 'status', minWidth: 170, maxWidth: 250, isResizable: true },
    { key: 'message', name: 'message', fieldName: 'message', minWidth: 170, maxWidth: 250, isResizable: true },
  ];
};

const getDetailsErrors = (itemsSchema: any, actionName: string): Array<IGroupedItem> => {
  const { details, validationState } = itemsSchema;
  const errors: Array<IGroupedItem> = Object.values(details).map((detail: any) => {
    return { action: actionName, status: validationState, message: detail.message };
  });
  return errors;
};

const getValidationGroup = (
  workflowSchema: any,
  groupName: string,
  level: number,
  startIndex: number,
  count: number,
  children: any[]
): IGroupedGroup => {
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
  const items: Array<IGroupedItem> = [];
  const validationGroups: Array<IGroupedGroup> = [];
  const itemsIds: Array<string> = Object.keys(itemsSchema);

  itemsIds.forEach((itemId: string) => {
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

const getIndexStart = (workflowsGroups: Array<IGroupedGroup>, children: Array<IGroupedGroup>, groupIndex: number) => {
  const workflowsLength = workflowsGroups.length;
  const childrenLength = children.length;

  let indexStart =
    workflowsLength > 0 && groupIndex < 2
      ? workflowsGroups[workflowsLength - 1].count + workflowsGroups[workflowsLength - 1].startIndex
      : 0;
  indexStart += childrenLength > 0 ? children[childrenLength - 1].count : 0;
  indexStart += childrenLength > 0 && groupIndex >= 2 ? children[childrenLength - 1].startIndex : 0;

  return indexStart;
};

export const parseValidationData = (validationData: IValidationData) => {
  const workflowsSchema: Record<string, IWorkflowValidation> = validationData?.properties?.workflows ?? {};
  const workflowsGroups: Array<IGroupedGroup> = [];
  const workflowsItems: Array<IGroupedItem> = [];

  const workflowsIds: Array<string> = Object.keys(workflowsSchema);

  workflowsIds.forEach((workflowId: string) => {
    const workflowSchema: IWorkflowValidation = workflowsSchema[workflowId];
    let detailsCount = 0;
    const children: Array<IGroupedGroup> = [];

    Object.keys(workflowSchema).forEach((workflowSchemaKey: string, index: number) => {
      const indexStart = getIndexStart(workflowsGroups, children, index);
      const action = workflowSchema[workflowSchemaKey as keyof IWorkflowValidation];

      const { items = [], validationGroups = [] } = index === 0 ? {} : getItemsValidation(action, indexStart);
      detailsCount += items.length;

      if (index !== 0) {
        const innerValidationGroup = getValidationGroup(
          action,
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
    const outerIndexStart =
      workflowsGroupsLength > 0
        ? workflowsGroups[workflowsGroupsLength - 1].startIndex + workflowsGroups[workflowsGroupsLength - 1].count
        : 0;
    const workflowGroup = getValidationGroup(workflowSchema, workflowId, 0, outerIndexStart, detailsCount, children);
    workflowsGroups.push(workflowGroup);
  });

  return { validationItems: workflowsItems, validationGroups: workflowsGroups };
};
