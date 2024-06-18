import { DefaultButton, PrimaryButton } from '@fluentui/react';
import type { ReactNode } from 'react';

export interface TemplatePanelFooterProps {
  primaryButtonText: string | ReactNode;
  primaryButtonOnClick: () => void | Promise<void>;
  primaryButtonDisabled?: boolean;
  onClose: () => void;
}

export const TemplatesPanelFooter = ({
  primaryButtonText,
  primaryButtonDisabled,
  primaryButtonOnClick,
  onClose,
}: TemplatePanelFooterProps) => {
  return (
    <div className="msla-templates-panel-footer">
      <PrimaryButton onClick={primaryButtonOnClick} disabled={primaryButtonDisabled}>
        {primaryButtonText}
      </PrimaryButton>
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
