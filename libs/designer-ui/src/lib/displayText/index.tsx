import { Link } from '@fluentui/react';

export interface DisplayTextEditorProps {
  text: string;
  relativeLinkText?: string;
  relativeLink?: string;
  openRelativeLink?: (relativeLink: string) => void;
}

export const DisplayTextEditor: React.FC<DisplayTextEditorProps> = ({
  text,
  relativeLinkText,
  relativeLink,
  openRelativeLink,
}): JSX.Element => {
  return (
    <div className="msla-displayText-editor-container">
      {text}
      <Link className="msla-workflow-parameters-link-text" onClick={() => openRelativeLink?.(relativeLink ?? '')}>
        {relativeLinkText}
      </Link>
    </div>
  );
};
