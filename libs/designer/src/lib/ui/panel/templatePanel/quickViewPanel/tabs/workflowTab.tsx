import type { RootState } from '../../../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import type { IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { useTheme, Image } from '@fluentui/react';
import { useMemo } from 'react';

export const WorkflowPanel: React.FC = () => {
  const { manifest, images } = useSelector((state: RootState) => state.template);
  const { isInverted } = useTheme();
  const imageName = useMemo(() => isInverted ? images?.dark : images?.light, [isInverted, images]);

  return imageName ? (
    <div className="msla-template-workflow-preview">
      <Image src={imageName} alt={manifest?.title} />
    </div>
  ) : null;
};

export const workflowTab = (intl: IntlShape) => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.WORKFLOW_VIEW,
  title: intl.formatMessage({
    defaultMessage: 'Workflow preview',
    id: '1nykVf',
    description: 'The tab label for the monitoring parameters tab on the operation panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Workflow preview tab',
    id: 'EJnXVY',
    description: 'An accessability label that describes the oveview tab',
  }),
  visible: true,
  content: <WorkflowPanel />,
  order: 0,
  icon: 'Info',
});
