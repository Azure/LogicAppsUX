export interface DocumentationLinkItemProps extends Swagger.ExternalDocumentation {
  onClick?(): void;
}

export const DocumentationLinkItem: React.FC<DocumentationLinkItemProps> = ({ description, url, onClick }) => {
  return (
    <div>
      <a href={url} target="_blank" rel="noopener noreferrer" onClick={onClick}>
        {description}
      </a>
    </div>
  );
};
