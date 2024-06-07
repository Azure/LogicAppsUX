import type { RootState } from '../../../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import { useIntl, type IntlShape } from 'react-intl';
import { Button, Spinner } from '@fluentui/react-components';
import constants from '../../../../../common/constants';
import { useState } from 'react';

export const ReviewCreatePanel = ({ onCreateClick }: { onCreateClick: () => Promise<void> }) => {
  const intl = useIntl();
  const { workflowName, kind } = useSelector((state: RootState) => state.template);
  const { workflowName: existingWorkflowName } = useSelector((state: RootState) => state.workflow);
  const [isLoadingCreate, setIsLoadingCreate] = useState(false);
  const intlText = {
    CREATE: intl.formatMessage({
      defaultMessage: 'Create',
      id: 'mmph/s',
      description: 'Button text for Creating new workflow from the template',
    }),
  };

  async function handleCreateClick() {
    setIsLoadingCreate(true);
    await onCreateClick();
    setIsLoadingCreate(false);
  }

  return (
    <div>
      <div>
        <Button
          appearance="outline"
          onClick={handleCreateClick}
          data-testid={'create-workflow-button'}
          disabled={!(existingWorkflowName ?? workflowName) || !kind}
        >
          {isLoadingCreate ? <Spinner size="extra-tiny" /> : intlText.CREATE}
        </Button>
      </div>
    </div>
  );
};

export const reviewCreateTab = (intl: IntlShape, onCreateClick: () => Promise<void>) => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE,
  title: intl.formatMessage({
    defaultMessage: 'Review and Create',
    id: 'vlWl7f',
    description: 'The tab label for the monitoring review and create tab on the create workflow panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Review and Create Tab',
    id: 'z4pjNi',
    description: 'An accessability label that describes the review and create tab',
  }),
  visible: true,
  content: <ReviewCreatePanel onCreateClick={onCreateClick} />,
  order: 3,
  icon: 'Info',
});
