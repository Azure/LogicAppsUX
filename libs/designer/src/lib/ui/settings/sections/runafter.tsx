import type { SectionProps } from '../';
import { SettingSectionName } from '../';
import type { AppDispatch, RootState } from '../../../core';
import { addOperationRunAfter, removeOperationRunAfter } from '../../../core/actions/bjsworkflow/runafter';
import { useActionMetadata, useRootTriggerId } from '../../../core/state/workflow/workflowSelectors';
import { updateRunAfter } from '../../../core/state/workflow/workflowSlice';
import { useIsA2AWorkflow } from '../../../core/state/designerView/designerViewSelectors';
import type { SettingsSectionProps } from '../settingsection';
import { SettingsSection } from '../settingsection';
import { validateNodeSettings } from '../validation/validation';
import type { RunAfterActionDetailsProps } from './runafterconfiguration';
import { getRecordEntry, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export const RunAfter = ({ nodeId, readOnly = false, expanded, validationErrors, onHeaderClick }: SectionProps): JSX.Element | null => {
  const nodeData = useActionMetadata(nodeId) as LogicAppsV2.ActionDefinition;
  const dispatch = useDispatch<AppDispatch>();

  const isA2AWorkflow = useIsA2AWorkflow();

  const rootState = useSelector((state: RootState) => state);

  const rootTriggerId = useRootTriggerId();

  useEffect(() => {
    validateNodeSettings(nodeId, {}, SettingSectionName.RUNAFTER, rootState, dispatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, nodeData?.runAfter, dispatch]);

  const intl = useIntl();

  const runAfterTitle = intl.formatMessage({
    defaultMessage: 'Run after',
    id: 'mQJXU4',
    description: 'title for run after setting section',
  });

  const handleStatusChange = (parentId: string, status: string, checked?: boolean) => {
    if (!nodeData?.runAfter) {
      return;
    }
    const updatedStatus: string[] = [...(getRecordEntry(nodeData?.runAfter ?? {}, parentId) ?? [])].filter(
      (x) => x?.toLowerCase() !== status?.toLowerCase()
    );

    if (checked) {
      updatedStatus.push(status);
    }

    if (updatedStatus.length === 0) {
      return;
    }

    dispatch(
      updateRunAfter({
        childOperation: nodeId,
        parentOperation: parentId,
        statuses: updatedStatus,
      })
    );
  };

  const dummyTriggerRunAfterSetting = useMemo(
    () => ({
      [rootTriggerId]: ['Succeeded'],
    }),
    [rootTriggerId]
  );

  const GetRunAfterProps = (): RunAfterActionDetailsProps[] => {
    const items: RunAfterActionDetailsProps[] = [];
    const showDummyRunAfter = !isA2AWorkflow;
    const runAfterValue = Object.keys(nodeData?.runAfter ?? {}).length
      ? (nodeData.runAfter ?? {})
      : showDummyRunAfter
        ? dummyTriggerRunAfterSetting
        : {};
    const isSingleRunAfter = Object.keys(runAfterValue).length === 1;
    const isAfterTrigger = Object.keys(runAfterValue)?.[0] === rootTriggerId;
    Object.entries(runAfterValue).forEach(([id, value], _i) => {
      items.push({
        collapsible: true,
        expanded: false,
        id: id,
        disableDelete: isSingleRunAfter,
        disableStatusChange: isAfterTrigger,
        readOnly: readOnly,
        statuses: value,
        onStatusChange: (status, checked) => {
          handleStatusChange(id, status, checked);
        },
        onDelete: () => {
          dispatch(
            removeOperationRunAfter({
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
    nodeId,
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
              addOperationRunAfter({
                parentOperationId: parentNode,
                childOperationId: nodeId,
              })
            );
          },
        },
      },
    ],
    validationErrors,
  };

  return <SettingsSection {...runAfterSectionProps} />;
};
