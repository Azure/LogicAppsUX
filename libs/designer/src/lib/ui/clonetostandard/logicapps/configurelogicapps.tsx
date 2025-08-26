import { Text } from '@fluentui/react-components';
import type { RootState } from '../../../core/state/clonetostandard/store';
import { useSelector } from 'react-redux';
import { CloneResourcePicker } from './resourcepicker';
import { useCloneTabStyles } from './styles';
import { useIntl } from 'react-intl';
import { TemplatesSection, type TemplatesSectionItem } from '@microsoft/designer-ui';
import { useResourceStrings } from '../../common/resourcepicker/resourcestrings';
import type { ResourceState } from '../../../core/state/clonetostandard/resourceslice';

export const ConfigureLogicApps = () => {
  const { resource } = useSelector((state: RootState) => state);

  const intl = useIntl();
  const styles = useCloneTabStyles();
  const resourceStrings = useResourceStrings();

  const INTL_TEXT = {
    sourceSectionTitle: intl.formatMessage({
      defaultMessage: 'Source: Logic Apps Consumption',
      id: '3+rUhW',
      description: 'Title for the source section',
    }),
    sourceDescription: intl.formatMessage({
      defaultMessage: 'Source specifications are automatically populated based on your consumption resource.',
      id: 'ql/lcC',
      description: 'Description for the source section',
    }),
    destinationSectionTitle: intl.formatMessage({
      defaultMessage: 'Destination: Logic Apps Standard',
      id: 'Pnedy5',
      description: 'Title for the destination section',
    }),
    destinationDescription: intl.formatMessage({
      defaultMessage: 'Select the destination to clone your consumption resources to.',
      id: 'GtXpHi',
      description: 'Description for the destination section',
    }),
  };

  const sourceItems: TemplatesSectionItem[] = useSourceItems(resourceStrings, resource);

  return (
    <div className={styles.tabContainer}>
      <div className={styles.mainSection}>
        <div className={styles.sectionHeader}>
          <Text size={400} weight="medium">
            {INTL_TEXT.sourceSectionTitle}
          </Text>
        </div>
        <div className={styles.sectionDescription}>
          <Text>{INTL_TEXT.sourceDescription}</Text>
        </div>
        <div className={styles.content}>
          <TemplatesSection items={sourceItems} />
        </div>
      </div>

      <div className={styles.mainSection}>
        <div className={styles.sectionHeader}>
          <Text size={400} weight="medium">
            {INTL_TEXT.destinationSectionTitle}
          </Text>
        </div>
        <div className={styles.sectionDescription}>
          <Text>{INTL_TEXT.destinationDescription}</Text>
        </div>
        <div className={styles.content}>
          <CloneResourcePicker />
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
