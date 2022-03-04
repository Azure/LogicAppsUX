import { DocumentationLinkItem } from '../documentationlinkitem';
import { calloutContentStyles } from '../fabric';
import type { FlyoutSelectedEventHandler } from './types';
import type { Target } from '@fluentui/react';
import { Callout, DirectionalHint } from '@fluentui/react';

export interface FlyoutBalloonProps {
  documentationLink?: Swagger.ExternalDocumentation;
  flyoutExpanded: boolean;
  target: Target | undefined;
  text: string;
  onClick?: FlyoutSelectedEventHandler;
  onDocumentationLinkClick?(): void;
}

export const FlyoutBalloon: React.FC<FlyoutBalloonProps> = ({
  documentationLink,
  flyoutExpanded,
  target,
  text,
  onClick,
  onDocumentationLinkClick,
}) => {
  if (!flyoutExpanded) {
    return null;
  }

  const handleDismiss = () => {
    onClick?.({ key: '' });
  };

  return (
    <Callout
      beakWidth={8}
      className="msla-flyout-callout"
      directionalHint={DirectionalHint.rightTopEdge}
      gapSpace={0}
      setInitialFocus={true}
      styles={calloutContentStyles}
      target={target}
      onDismiss={handleDismiss}
    >
      <div aria-label={text} data-is-focusable={true} role="dialog" tabIndex={0}>
        {text}
        {documentationLink ? (
          <DocumentationLinkItem
            description={documentationLink.description}
            url={documentationLink.url}
            onClick={onDocumentationLinkClick}
          />
        ) : null}
      </div>
    </Callout>
  );
};
