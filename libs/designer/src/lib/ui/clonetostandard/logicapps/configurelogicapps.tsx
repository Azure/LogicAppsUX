import { Text } from '@fluentui/react-components';
import type { RootState } from '../../../core/state/clonetostandard/store';
import { useSelector } from 'react-redux';
import { CloneResourcePicker } from './resourcepicker';
import { useCloneTabStyles } from './styles';
import { TemplatesSection, type TemplatesSectionItem } from '@microsoft/designer-ui';
import { useResourceStrings } from '../../common/resourcepicker/resourcestrings';
import type { ResourceState } from '../../../core/state/clonetostandard/resourceslice';
import { useCloneStrings } from '../../../core/clonetostandard/utils/cloneStrings';

export const ConfigureLogicApps = () => {
  const { sourceApps } = useSelector((state: RootState) => state.clone);

  const styles = useCloneTabStyles();
  const resourceStrings = useResourceStrings();
  const cloneStrings = useCloneStrings();

  const sourceItems: TemplatesSectionItem[] = useSourceItems(resourceStrings, sourceApps?.[0]);

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
