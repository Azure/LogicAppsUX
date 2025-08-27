import { MessageBar, Text } from '@fluentui/react-components';
import type { RootState } from '../../../core/state/clonetostandard/store';
import { useSelector } from 'react-redux';
import { isUndefinedOrEmptyString } from '@microsoft/logic-apps-shared';
import { TemplatesSection, type TemplatesSectionItem } from '@microsoft/designer-ui';
import { useResourceStrings } from '../../common/resourcepicker/resourcestrings';
import type { ResourceState } from '../../../core/state/clonetostandard/resourceslice';
import { useCloneTabStyles } from '../logicapps/styles';
import { useCloneStrings } from '../../../core/clonetostandard/utils/cloneStrings';
import { useIntl } from 'react-intl';

export const CloneReviewList = () => {
  const { sourceApps, destinationApp, errorMessage } = useSelector((state: RootState) => state.clone);

  const styles = useCloneTabStyles();
  const resourceStrings = useResourceStrings();
  const cloneStrings = useCloneStrings();

  const sourceItems: TemplatesSectionItem[] = useSourceItems(resourceStrings, sourceApps?.[0]);
  const destinationItems: TemplatesSectionItem[] = useDestinationItems(resourceStrings, destinationApp);

  return (
    <div className={styles.tabContainer}>
      {!isUndefinedOrEmptyString(errorMessage) && <MessageBar intent="error">{errorMessage}</MessageBar>}

      <div className={styles.mainSection}>
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

      <div className={styles.mainSection}>
        <div className={styles.sectionHeader}>
          <Text size={400} weight="medium">
            {cloneStrings.destinationSectionTitle}
          </Text>
        </div>
        <div className={styles.sectionDescription}>
          <Text>{cloneStrings.destinationDescription}</Text>
        </div>
        <div className={styles.content}>
          <TemplatesSection items={destinationItems} />
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

const useDestinationItems = (resourceStrings: Record<string, string>, resources: ResourceState) => {
  const intl = useIntl();
  const { subscriptionId, logicAppName } = resources;
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
      label: intl.formatMessage({
        defaultMessage: 'Cloned workflow name',
        id: 'snGySi',
        description: 'Label for cloned workflow name',
      }),
      value: logicAppName || '',
      type: 'text',
    },
  ];

  return items;
};
