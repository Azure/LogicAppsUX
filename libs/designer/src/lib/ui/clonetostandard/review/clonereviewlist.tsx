import { Button, MessageBar, MessageBarActions, MessageBarBody, Text } from '@fluentui/react-components';
import type { RootState } from '../../../core/state/clonetostandard/store';
import { useSelector } from 'react-redux';
import { CloneService, isUndefinedOrEmptyString } from '@microsoft/logic-apps-shared';
import { TemplatesSection, type TemplatesSectionItem } from '@microsoft/designer-ui';
import { useResourceStrings } from '../../common/resourcepicker/resourcestrings';
import type { ResourceState } from '../../../core/state/clonetostandard/resourceslice';
import { useCloneTabStyles } from '../logicapps/styles';
import { useCloneStrings } from '../../../core/clonetostandard/utils/cloneStrings';
import { useIntl } from 'react-intl';
import { useCallback } from 'react';

export const CloneReviewList = () => {
  const intl = useIntl();
  const { sourceApps, destinationApp, errorMessage, isSuccessfullyCloned } = useSelector((state: RootState) => state.clone);

  const styles = useCloneTabStyles();

  const resourceStrings = {
    ...useResourceStrings(),
    ...useCloneStrings(),
  };

  const sourceItems: TemplatesSectionItem[] = useSourceItems(resourceStrings, sourceApps?.[0]);
  const destinationItems: TemplatesSectionItem[] = useDestinationItems(
    resourceStrings,
    destinationApp,
    sourceApps?.[0]?.targetWorkflowName || ''
  );

  const handleOpenBlade = useCallback(() => {
    //TODO: to be replaced by back-end given back resourceId (same value)
    const resourceId = `/subscriptions/${destinationApp.subscriptionId}/resourceGroups/${destinationApp.resourceGroup}/providers/Microsoft.Web/sites/${destinationApp.logicAppName}`;
    CloneService()?.openBladeAfterCreate?.(resourceId);
  }, [destinationApp]);

  return (
    <div className={styles.tabContainer}>
      {isSuccessfullyCloned ? (
        <MessageBar intent="success">
          <MessageBarBody>
            {intl.formatMessage({
              defaultMessage: 'Successfully cloned.',
              id: 'ILKpNE',
              description: 'Label to indicate the successfully cloned workflow',
            })}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={handleOpenBlade}>
              {intl.formatMessage({
                defaultMessage: 'Go to destination workflow',
                id: '83HCUb',
                description: 'Label to indicate go to the workflow',
              })}
            </Button>
          </MessageBarActions>
        </MessageBar>
      ) : null}
      {!isUndefinedOrEmptyString(errorMessage) && <MessageBar intent="error">{errorMessage}</MessageBar>}

      <div className={styles.mainSection}>
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

      <div className={styles.mainSection}>
        <div className={styles.sectionHeader}>
          <Text size={400} weight="medium">
            {resourceStrings.destinationSectionTitle}
          </Text>
        </div>
        <div className={styles.sectionDescription}>
          <Text>{resourceStrings.destinationDescription}</Text>
        </div>
        <div className={styles.content}>
          <TemplatesSection items={destinationItems} />
        </div>
      </div>
    </div>
  );
};

const useSourceItems = (resourceStrings: Record<string, string>, sourceResources: ResourceState) => {
  const { subscriptionId, logicAppName } = sourceResources;
  const items: TemplatesSectionItem[] = [
    {
      label: resourceStrings.SUBSCRIPTION,
      value: subscriptionId || '',
      type: 'text',
    },
    {
      label: resourceStrings.LOGIC_APP,
      value: logicAppName || '',
      type: 'text',
    },
    {
      label: resourceStrings.WORKFLOW_NAME,
      value: logicAppName || '',
      type: 'text',
    },
  ];

  return items;
};

const useDestinationItems = (resourceStrings: Record<string, string>, destinationResources: ResourceState, targetWorkflowName: string) => {
  const { subscriptionId, resourceGroup, logicAppName } = destinationResources;
  const items: TemplatesSectionItem[] = [
    {
      label: resourceStrings.SUBSCRIPTION,
      value: subscriptionId || '',
      type: 'text',
    },
    {
      label: resourceStrings.RESOURCE_GROUP,
      value: resourceGroup || '',
      type: 'text',
    },
    {
      label: resourceStrings.LOGIC_APP,
      value: logicAppName || '',
      type: 'text',
    },
    {
      label: resourceStrings.WORKFLOW_NAME,
      value: targetWorkflowName || '',
      type: 'text',
    },
  ];

  return items;
};
