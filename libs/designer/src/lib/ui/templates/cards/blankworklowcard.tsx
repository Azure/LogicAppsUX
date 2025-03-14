import { LogEntryLevel, LoggerService, TemplateService } from '@microsoft/logic-apps-shared';
import type { RootState } from '../../../core/state/templates/store';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { DocumentCard } from '@fluentui/react';
import { Text } from '@fluentui/react-components';
import { Add16Regular } from '@fluentui/react-icons';
import { templateCardStyles } from './templateCard';

export const BlankWorkflowTemplateCard = ({ isWorkflowEmpty }: { isWorkflowEmpty: boolean }) => {
  const intl = useIntl();

  const workflowAppName = useSelector((state: RootState) => state.workflow.workflowAppName);

  const intlText = {
    BLANK_WORKFLOW: intl.formatMessage({
      defaultMessage: 'Blank workflow',
      description: 'Title text for the card that lets users start from a blank workflow',
      id: 'pykp8c',
    }),
    BLANK_WORKFLOW_DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Start with an empty workflow to build your integration solution.',
      description: 'Label text for the card that lets users start from a blank workflow',
      id: 'kcWgxU',
    }),
    REPLACE_WITH_BLANK_WORKFLOW: intl.formatMessage({
      defaultMessage: 'Replace your existing workflow with an empty workflow to rebuild your integration solution.',
      description: 'Label text for the card that lets users replace the current workflow with blank workflow',
      id: 'boxBWI',
    }),
  };

  const onBlankWorkflowClick = async () => {
    LoggerService().log({
      level: LogEntryLevel.Trace,
      area: 'Templates.TemplateCard.Blank',
      message: 'Blank workflow is selected',
      args: [workflowAppName],
    });
    await TemplateService()?.onAddBlankWorkflow();
  };

  return (
    <DocumentCard
      className="msla-template-card-wrapper"
      styles={templateCardStyles}
      onClick={onBlankWorkflowClick}
      aria-label={intlText.BLANK_WORKFLOW}
    >
      <div className="msla-blank-template-card">
        <Add16Regular className="msla-blank-template-card-add-icon" />
        <Text size={400} weight="semibold" align="center" className="msla-template-card-title">
          {intlText.BLANK_WORKFLOW}
        </Text>
        <Text size={400} align="center" className="msla-blank-template-card-description">
          {isWorkflowEmpty ? intlText.BLANK_WORKFLOW_DESCRIPTION : intlText.REPLACE_WITH_BLANK_WORKFLOW}
        </Text>
      </div>
    </DocumentCard>
  );
};
