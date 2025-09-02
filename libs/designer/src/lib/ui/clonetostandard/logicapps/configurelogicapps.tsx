import { Text, tokens } from '@fluentui/react-components';
import type { AppDispatch, RootState } from '../../../core/state/clonetostandard/store';
import { useDispatch, useSelector } from 'react-redux';
import { CloneResourcePicker } from './resourcepicker';
import { useCloneTabStyles } from './styles';
import { FieldSectionItem, TemplatesSection, type TemplatesSectionItem } from '@microsoft/designer-ui';
import { useResourceStrings } from '../../common/resourcepicker/resourcestrings';
import type { ResourceState } from '../../../core/state/clonetostandard/resourceslice';
import { useCloneStrings } from '../../../core/clonetostandard/utils/cloneStrings';
import { updateTargetWorkflowName, updateTargetWorkflowNameValidationError } from '../../../core/state/clonetostandard/cloneslice';
import { validateWorkflowName } from '../../../core/actions/bjsworkflow/templates';
import { useExistingWorkflowNamesOfResource } from '../../../core';
import { Checkmark16Filled } from '@fluentui/react-icons';
import { isUndefinedOrEmptyString } from '@microsoft/logic-apps-shared';

export const ConfigureLogicApps = () => {
  const { sourceApps } = useSelector((state: RootState) => state.clone);

  const styles = useCloneTabStyles();
  const resourceStrings = {
    ...useResourceStrings(),
    ...useCloneStrings(),
  };

  const sourceItems: TemplatesSectionItem[] = useSourceItems(resourceStrings, sourceApps?.[0]);
  const clonedWorkflowItem: TemplatesSectionItem = useCloneWorkflowItem(resourceStrings);

  return (
    <div className={styles.tabContainer}>
      <div className={styles.mainSectionWithBorder}>
        <div className={styles.sectionHeader}>
          <Text size={400} weight="medium">
            {resourceStrings.sourceSectionTitle}
          </Text>
        </div>
        <div className={styles.sectionDescription}>
          <Text>{resourceStrings.sourceDescription}</Text>
        </div>
        <div className={styles.content}>
          <TemplatesSection items={sourceItems} />
        </div>
      </div>

      <div className={styles.mainSectionWithBorder}>
        <div className={styles.sectionHeader}>
          <Text size={400} weight="medium">
            {resourceStrings.destinationSectionTitle}
          </Text>
        </div>
        <div className={styles.sectionDescription}>
          <Text>{resourceStrings.destinationDescription}</Text>
        </div>
        <div className={styles.content}>
          <CloneResourcePicker />
          <FieldSectionItem item={clonedWorkflowItem} />
        </div>
      </div>
    </div>
  );
};

const useSourceItems = (resourceStrings: Record<string, string>, resources: ResourceState) => {
  const { subscriptionId, logicAppName } = resources;
  const items: TemplatesSectionItem[] = [
    {
      label: resourceStrings.SUBSCRIPTION,
      value: subscriptionId || '',
      type: 'textfield',
      disabled: true,
      onChange: () => {},
    },
    {
      label: resourceStrings.LOGIC_APP,
      value: logicAppName || '',
      type: 'textfield',
      disabled: true,
      onChange: () => {},
    },
    {
      label: resourceStrings.WORKFLOW_NAME,
      value: logicAppName || '',
      type: 'textfield',
      disabled: true,
      onChange: () => {},
    },
  ];

  return items;
};

const useCloneWorkflowItem = (resourceStrings: Record<string, string>) => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    sourceApps,
    destinationApp: { subscriptionId: destSubscriptionId, resourceGroup: destResourceGroup, logicAppName: destLogicAppName },
  } = useSelector((state: RootState) => state.clone);
  const sourceApp = sourceApps?.[0];

  const { data: existingWorkflowNames } = useExistingWorkflowNamesOfResource(destSubscriptionId, destResourceGroup, destLogicAppName);

  const items: TemplatesSectionItem = {
    label: resourceStrings.newWorkflowName,
    value: sourceApp?.targetWorkflowName || '',
    required: true,
    type: 'textfield',
    onChange: (newValue) => {
      dispatch(updateTargetWorkflowName(newValue));
    },
    onBlur: async () => {
      const validationError = await validateWorkflowName(sourceApp?.targetWorkflowName, false, {
        subscriptionId: sourceApp?.subscriptionId,
        resourceGroupName: sourceApp?.resourceGroup,
        existingWorkflowNames: existingWorkflowNames ?? [],
      });
      dispatch(updateTargetWorkflowNameValidationError(validationError));
    },
    errorMessage: sourceApp?.targetWorkflowNameValidationError,
    hint: resourceStrings.workflowNameDescription,
    contentAfter:
      sourceApp?.targetWorkflowNameValidationError || isUndefinedOrEmptyString(sourceApp?.targetWorkflowName) ? null : (
        <Checkmark16Filled color={tokens.colorPaletteGreenBackground3} />
      ),
  };

  return items;
};
