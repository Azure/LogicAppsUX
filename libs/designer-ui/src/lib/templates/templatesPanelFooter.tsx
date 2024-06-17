import { DefaultButton, PrimaryButton } from '@fluentui/react';

export interface TemplatePanelFooterProps {
  primaryButtonText: string;
  primaryButtonOnClick: () => void;
  primaryButtonDisabled?: boolean;
  onClose: () => void;
}

export const TemplatesPanelFooter = ({ primaryButtonText, primaryButtonOnClick, onClose }: TemplatePanelFooterProps) => {
  return (
    <div className="msla-templates-panel-footer">
      <PrimaryButton onClick={primaryButtonOnClick}>{primaryButtonText}</PrimaryButton>
      <DefaultButton
        onClick={onClose}
        style={{
          marginLeft: '8px',
        }}
      >
        Close
      </DefaultButton>
    </div>
  );
};
