import { Label } from '@fluentui/react';
import { Text } from '@fluentui/react-components';
import { ChevronDown16Regular, ChevronUp16Regular } from '@fluentui/react-icons';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import Markdown from 'react-markdown';

export interface TemplatesPanelHeaderProps {
  title: string;
  description: string;
}

export const TemplatesPanelHeader = ({ title, description }: TemplatesPanelHeaderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const intl = useIntl();
  const intlText = {
    CREATE_WORKFLOW: intl.formatMessage({
      defaultMessage: 'Create a new workflow from template',
      id: 'RZNabt',
      description: 'Panel header title for creating the workflow',
    }),
    BY_MICROSOFT: intl.formatMessage({
      defaultMessage: 'By Microsoft',
      id: 'Xs7Uvt',
      description: 'Panel description for stating it was created by Microsoft',
    }),
    TEMPLATE_DETAILS: intl.formatMessage({
      defaultMessage: 'Template Details',
      id: 'ZD8dme',
      description: 'Panel description title for template details, allowing to click to read more',
    }),
    NAME: intl.formatMessage({
      defaultMessage: 'Name',
      id: 'DX9jWz',
      description: 'Description label for template name',
    }),
    DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Description',
      id: 'l9+EbH',
      description: 'Description label for template description',
    }),
  };

  return (
    <div className="msla-templates-panel-header">
      <Text className="msla-templates-panel-header-title">{intlText.CREATE_WORKFLOW}</Text>
      <div
        className="msla-templates-panel-header-details-title"
        onClick={() => {
          setIsOpen(!isOpen);
        }}
      >
        <Text className="msla-templates-panel-header-details-title-text">{intlText.TEMPLATE_DETAILS}</Text>
        {isOpen ? <ChevronUp16Regular /> : <ChevronDown16Regular />}
      </div>
      {isOpen && (
        <div className="msla-templates-panel-header-description-wrapper">
          <div className="msla-templates-panel-header-description">
            <Label className="msla-templates-panel-header-description-title">{intlText.NAME}</Label>
            <Text className="msla-templates-panel-header-description-text">{title}</Text>
          </div>
          <div className="msla-templates-panel-header-description">
            <Label className="msla-templates-panel-header-description-title">{intlText.DESCRIPTION}</Label>
            <Markdown className="msla-templates-panel-header-description-text" linkTarget="_blank">
              {description}
            </Markdown>
          </div>
        </div>
      )}
    </div>
  );
};
