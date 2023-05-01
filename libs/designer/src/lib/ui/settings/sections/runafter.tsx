import type { SectionProps } from '../';
import constants from '../../../common/constants';
import type { AppDispatch, RootState } from '../../../core';
import { type ValidationError, ValidationWarningKeys } from '../../../core/state/setting/settingSlice';
import { addEdgeFromRunAfter, removeEdgeFromRunAfter, updateRunAfter } from '../../../core/state/workflow/workflowSlice';
import type { SettingsSectionProps } from '../settingsection';
import { SettingsSection } from '../settingsection';
import type { RunAfterActionDetailsProps } from './runafterconfiguration';
import type { LogicAppsV2 } from '@microsoft/utils-logic-apps';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export const RunAfter = ({ readOnly = false, expanded, onHeaderClick, nodeId }: SectionProps): JSX.Element | null => {
  const nodeData = useSelector((state: RootState) => state.workflow.operations[nodeId] as LogicAppsV2.ActionDefinition);
  const dispatch = useDispatch<AppDispatch>();
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const showRunAfter = useMemo(() => {
    return Object.keys(nodeData?.runAfter ?? {}).length > 0;
  }, [nodeData?.runAfter]);

  const intl = useIntl();
  const runAfterTitle = intl.formatMessage({
    defaultMessage: 'Run After',
    description: 'title for run after setting section',
  });
  const lastActionErrorMessage = intl.formatMessage({
    description: 'error message for deselection of last run after action',
    defaultMessage: 'Each action must have one or more run after configurations',
  });
  const lastStatusErrorMessage = intl.formatMessage({
    description: 'error message for deselection of last run after status',
    defaultMessage: 'Each run after configuration must have at least one status checked',
  });

  const handleStatusChange = (predecessorId: string, status: string, checked?: boolean) => {
    if (!nodeData.runAfter) {
      return;
    }
    const updatedStatus: string[] = [...nodeData.runAfter[predecessorId]].filter((x) => x.toLowerCase() !== status.toLowerCase());

    if (checked) {
      updatedStatus.push(status);
    }

    if (!updatedStatus.length && !errors.some(({ key }) => key === ValidationWarningKeys.CANNOT_DELETE_LAST_STATUS)) {
      setErrors([...errors, { key: ValidationWarningKeys.CANNOT_DELETE_LAST_STATUS, message: lastStatusErrorMessage }]);
      return;
    } else if (!updatedStatus.length) {
      return;
    } else if (errors.some(({ key }) => key === ValidationWarningKeys.CANNOT_DELETE_LAST_STATUS)) {
      setErrors(errors.filter(({ key }) => key !== ValidationWarningKeys.CANNOT_DELETE_LAST_STATUS));
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
          if (arr.length < 2 && !errors.some(({ key }) => key === ValidationWarningKeys.CANNOT_DELETE_LAST_ACTION)) {
            setErrors([...errors, { key: ValidationWarningKeys.CANNOT_DELETE_LAST_ACTION, message: lastActionErrorMessage }]);
            return;
          } else if (arr.length < 2) {
            return;
          } else if (errors.some(({ key }) => key === ValidationWarningKeys.CANNOT_DELETE_LAST_ACTION)) {
            setErrors(errors.filter(({ key }) => key !== ValidationWarningKeys.CANNOT_DELETE_LAST_ACTION));
          }

          dispatch(
            removeEdgeFromRunAfter({
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
    sectionName: constants.SETTINGSECTIONS.RUNAFTER,
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
              addEdgeFromRunAfter({
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
    onWarningDismiss: handleWarningDismiss,
  };

  return <SettingsSection {...runAfterSectionProps} />;
};
