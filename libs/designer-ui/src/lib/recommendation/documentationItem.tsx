import * as React from 'react';

export type DocLinkClickedEventHandler = () => void;

export interface DocumentationItemProps {
  description?: string;
  link?: {
    url: string;
    urlDescription: string;
  };
  openWindow?(url: string): Promise<boolean>;
  onClick?: DocLinkClickedEventHandler;
}

export const DocumentationItem = ({ description, link, openWindow, onClick }: DocumentationItemProps): JSX.Element => {
  const handleLinkClicked = async (): Promise<void> => {
    if (openWindow && link) {
      await openWindow(link.url);
    }

    if (onClick) {
      onClick();
    }
  };
  return (
    <div>
      {description ? <span>{description}</span> : null}
      {link ? (
        <a href={link.url} target="_blank" rel="noopener noreferrer" onClick={handleLinkClicked}>
          {link.urlDescription}
        </a>
      ) : null}
    </div>
  );
};
