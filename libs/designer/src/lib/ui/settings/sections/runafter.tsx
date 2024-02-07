import type { SectionProps } from '../';
import { SettingSectionName } from '../';
import type { AppDispatch } from '../../../core';
import { addEdgeFromRunAfterOperation, removeEdgeFromRunAfterOperation } from '../../../core/actions/bjsworkflow/runafter';
import { useActionMetadata } from '../../../core/state/workflow/workflowSelectors';
import { updateRunAfter } from '../../../core/state/workflow/workflowSlice';
import type { SettingsSectionProps } from '../settingsection';
import { SettingsSection } from '../settingsection';
import type { ValidationError } from '../validation/validation';
import { ValidationErrorKeys, ValidationErrorType } from '../validation/validation';
import type { RunAfterActionDetailsProps } from './runafterconfiguration';
import { getRecordEntry, type LogicAppsV2 } from '@microsoft/utils-logic-apps';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

export const RunAfter = ({ nodeId, readOnly = false, expanded, onHeaderClick }: SectionProps): JSX.Element | null => {
  const nodeData = useActionMetadata(nodeId) as LogicAppsV2.ActionDefinition;
  const dispatch = useDispatch<AppDispatch>();
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const showRunAfter = useMemo(() => Object.keys(nodeData?.runAfter ?? {}).length > 0, [nodeData?.runAfter]);

  const intl = useIntl();

  const runAfterTitle = intl.formatMessage({
    defaultMessage: 'Run After',
    description: 'title for run after setting section',
  });
  const lastActionErrorMessage = intl.formatMessage({
    defaultMessage: 'Each action must have one or more run after configurations',
    description: 'error message for deselection of last run after action',
  });
  const lastStatusErrorMessage = intl.formatMessage({
    defaultMessage: 'Each run after configuration must have at least one status checked',
    description: 'error message for deselection of last run after status',
  });

  const handleStatusChange = (predecessorId: string, status: string, checked?: boolean) => {
    if (!nodeData?.runAfter) return;
    const updatedStatus: string[] = [...(getRecordEntry(nodeData.runAfter, predecessorId) ?? [])].filter(
      (x) => x?.toLowerCase() !== status?.toLowerCase()
    );

    if (checked) {
      updatedStatus.push(status);
    }

    if (!updatedStatus.length && !errors.some(({ key }) => key === ValidationErrorKeys.CANNOT_DELETE_LAST_STATUS)) {
      setErrors([
        ...errors,
        {
          key: ValidationErrorKeys.CANNOT_DELETE_LAST_STATUS,
          errorType: ValidationErrorType.WARNING,
          message: lastStatusErrorMessage,
        },
      ]);
      return;
    } else if (!updatedStatus.length) {
      return;
    } else if (errors.some(({ key }) => key === ValidationErrorKeys.CANNOT_DELETE_LAST_STATUS)) {
      setErrors(errors.filter(({ key }) => key !== ValidationErrorKeys.CANNOT_DELETE_LAST_STATUS));
    }

    dispatch(
      updateRunAfter({
        childOperation: nodeId,
        parentOperation: predecessorId,
        statuses: updatedStatus,
      })
    );
  };

  const handleWarningDismiss = (key?: string, message?: string): void => {
    setErrors(errors.filter((err) => (key ? err.key !== key : message ? err.message !== message : true)));
  };

  const GetRunAfterProps = (): RunAfterActionDetailsProps[] => {
    const items: RunAfterActionDetailsProps[] = [];
    Object.entries(nodeData?.runAfter ?? {}).forEach(([id, value], _i, arr) => {
      items.push({
        collapsible: true,
        expanded: false,
        id: id,
        isDeleteVisible: true,
        readOnly: readOnly,
        statuses: value,
        onStatusChange: (status, checked) => {
          handleStatusChange(id, status, checked);
        },
        onDelete: () => {
          if (arr.length < 2 && !errors.some(({ key }) => key === ValidationErrorKeys.CANNOT_DELETE_LAST_ACTION)) {
            setErrors([
              ...errors,
              {
                key: ValidationErrorKeys.CANNOT_DELETE_LAST_ACTION,
                errorType: ValidationErrorType.WARNING,
                message: lastActionErrorMessage,
              },
            ]);
            return;
          } else if (arr.length < 2) {
            return;
          } else if (errors.some(({ key }) => key === ValidationErrorKeys.CANNOT_DELETE_LAST_ACTION)) {
            setErrors(errors.filter(({ key }) => key !== ValidationErrorKeys.CANNOT_DELETE_LAST_ACTION));
          }

          dispatch(
            removeEdgeFromRunAfterOperation({
              parentOperationId: id,
              childOperationId: nodeId,
            })
          );
        },
      });
    });
    return items;
  };

  const runAfterSectionProps: SettingsSectionProps = {
    id: 'runAfter',
    title: runAfterTitle,
    sectionName: SettingSectionName.RUNAFTER,
    expanded,
    isReadOnly: readOnly,
    onHeaderClick,
    settings: [
      {
        settingType: 'RunAfter',
        settingProp: {
          items: GetRunAfterProps(),
          readOnly,
          onEdgeAddition: (parentNode: string) => {
            dispatch(
              addEdgeFromRunAfterOperation({
                parentOperationId: parentNode,
                childOperationId: nodeId,
              })
            );
          },
        },
        visible: showRunAfter,
      },
    ],
    validationErrors: errors,
    onDismiss: handleWarningDismiss,
  };

  return <SettingsSection {...runAfterSectionProps} />;
};
