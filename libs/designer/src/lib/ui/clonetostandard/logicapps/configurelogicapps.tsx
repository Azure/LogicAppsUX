import { Text } from '@fluentui/react-components';
import type { AppDispatch, RootState } from '../../../core/state/clonetostandard/store';
import { useDispatch, useSelector } from 'react-redux';
import { CloneResourcePicker } from './resourcepicker';
import { useCloneTabStyles } from './styles';
import { TemplatesSection, type TemplatesSectionItem } from '@microsoft/designer-ui';
import { useResourceStrings } from '../../common/resourcepicker/resourcestrings';
import type { ResourceState } from '../../../core/state/clonetostandard/resourceslice';
import { useCloneStrings } from '../../../core/clonetostandard/utils/cloneStrings';
import { updateClonedWorkflowName, updateClonedWorkflowNameValidationError } from '../../../core/state/clonetostandard/cloneslice';
import { validateWorkflowName } from '../../../core/actions/bjsworkflow/templates';
import { useExistingWorkflowNamesOfResource } from '../../../core';

export const ConfigureLogicApps = () => {
  const {
    sourceApps,
    destinationApp: { subscriptionId: destSubscriptionId, resourceGroup: destResourceGroup, logicAppName: destLogicAppName },
  } = useSelector((state: RootState) => state.clone);

  const styles = useCloneTabStyles();
  const resourceStrings = useResourceStrings();
  const cloneStrings = useCloneStrings();

  const { data: existingWorkflowNames } = useExistingWorkflowNamesOfResource(destSubscriptionId, destResourceGroup, destLogicAppName);
  const sourceItems: TemplatesSectionItem[] = useSourceItems(resourceStrings, sourceApps?.[0]);
  const clonedWorkflowItem: TemplatesSectionItem = useCloneWorkflowItem(cloneStrings, existingWorkflowNames ?? []);

  return (
    <div className={styles.tabContainer}>
      <div className={styles.mainSectionWithBorder}>
        <div className={styles.sectionHeader}>
          <Text size={400} weight="medium">
            {cloneStrings.sourceSectionTitle}
          </Text>
        </div>
        <div className={styles.sectionDescription}>
          <Text>{cloneStrings.sourceDescription}</Text>
        </div>
        <div className={styles.content}>
          <TemplatesSection items={sourceItems} />
        </div>
      </div>

      <div className={styles.mainSectionWithBorder}>
        <div className={styles.sectionHeader}>
          <Text size={400} weight="medium">
            {cloneStrings.destinationSectionTitle}
          </Text>
        </div>
        <div className={styles.sectionDescription}>
          <Text>{cloneStrings.destinationDescription}</Text>
        </div>
        <div className={styles.content}>
          <CloneResourcePicker />
          <TemplatesSection items={[clonedWorkflowItem]} />
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

const useCloneWorkflowItem = (cloneStrings: Record<string, string>, existingWorkflowNames: string[]) => {
  const dispatch = useDispatch<AppDispatch>();
  const { sourceApps } = useSelector((state: RootState) => state.clone);
  const sourceApp = sourceApps?.[0];

  const items: TemplatesSectionItem = {
    label: cloneStrings.clonedWorkflowName,
    value: sourceApp?.clonedWorkflowName || '',
    type: 'textfield',
    onChange: (newValue) => {
      dispatch(updateClonedWorkflowName(newValue));
    },
    onBlur: async () => {
      const validationError = await validateWorkflowName(sourceApp?.clonedWorkflowName, false, {
        subscriptionId: sourceApp?.subscriptionId,
        resourceGroupName: sourceApp?.resourceGroup,
        existingWorkflowNames: existingWorkflowNames ?? [],
      });
      dispatch(updateClonedWorkflowNameValidationError(validationError));
    },
    errorMessage: sourceApp?.clonedWorkflowNameValidationError,
    hint: cloneStrings.workflowNameDescription,
  };

  return items;
};
