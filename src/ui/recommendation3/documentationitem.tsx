import * as React from 'react';

type DocLinkClickedEventHandler = () => void;

export interface DocumentationItemProps {
  description: string;
  link?: {
    url: string;
    urlDescription: string;
  };
  openWindow?(url: string): Promise<boolean>;
  onClick?: DocLinkClickedEventHandler;
}

export const DocumentationItem: React.FC<DocumentationItemProps> = (props) => {
  const { description, link, onClick, openWindow } = props;
  const handleLinkClicked = React.useCallback(async (): Promise<void> => {
    if (openWindow) {
      const { url } = link ?? { url: '' };
      await openWindow(url);
    }

    if (onClick) {
      onClick();
    }
  }, [onClick, openWindow, link]);

  return (
    <div>
      {description ? <span>{description}</span> : null}
      {link ? (
        <a href={link.url} target="_blank" rel="noreferrer" onClick={handleLinkClicked}>
          {link.urlDescription}
        </a>
      ) : null}
    </div>
  );
};
