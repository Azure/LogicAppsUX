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
        <Text className="msla-templates-panel-header-details-title-text">{'Template Details'}</Text>
        {isOpen ? <ChevronUp16Regular /> : <ChevronDown16Regular />}
      </div>
      {isOpen && (
        <div className="msla-templates-panel-header-description-wrapper">
          <div className="msla-templates-panel-header-description">
            <Label className="msla-templates-panel-header-description-title">Name</Label>
            <Text className="msla-templates-panel-header-description-text">{title}</Text>
          </div>
          <div className="msla-templates-panel-header-description">
            <Label className="msla-templates-panel-header-description-title">Description</Label>
            <Markdown className="msla-templates-panel-header-description-text" linkTarget="_blank">
              {description}
            </Markdown>
          </div>
        </div>
      )}
    </div>
  );
};
