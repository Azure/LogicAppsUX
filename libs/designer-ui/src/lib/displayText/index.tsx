import { Link } from '@fluentui/react';

export interface DisplayTextEditorProps {
  displayTextText: string;
  relativeLinkText?: string;
  relativeLink?: string;
  openRelativeLink?: (relativeLink: string) => void;
}

export const DisplayTextEditor: React.FC<DisplayTextEditorProps> = ({
  displayTextText,
  relativeLinkText,
  relativeLink,
  openRelativeLink,
}): JSX.Element => {
  return (
    <div className="msla-displayText-editor-container">
      {displayTextText ?? ''}
      <Link className="msla-workflow-parameters-link-text" onClick={() => openRelativeLink?.(relativeLink ?? '')}>
        {relativeLinkText}
      </Link>
    </div>
  );
};
