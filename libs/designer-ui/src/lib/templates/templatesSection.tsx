import { Label, Link, Text } from '@fluentui/react-components';
import { Open16Regular } from '@fluentui/react-icons';
import type { TemplatesSectionProps } from './templatesSectionModel';
import { css } from '@fluentui/utilities';
import { FieldSectionItem } from './fieldsectionitem';

export const TemplatesSection = ({
  title,
  isTitleRequired,
  titleHtmlFor,
  description,
  descriptionLink,
  items,
  onRenderInfoBar,
  cssOverrides = {},
  children = null,
}: TemplatesSectionProps) => {
  return (
    <div className={css('msla-templates-section', cssOverrides?.['sectionContainer'])}>
      {title ? (
        <Label className="msla-templates-section-title" required={isTitleRequired} htmlFor={titleHtmlFor}>
          {title}
        </Label>
      ) : null}
      {description ? (
        <Text className="msla-templates-section-description">
          {description}
          {descriptionLink && (
            <Link className="msla-templates-section-description-link" href={descriptionLink.href} target="_blank" rel="noreferrer">
              {descriptionLink.text}
              <Open16Regular className="msla-templates-section-description-icon" />
            </Link>
          )}
        </Text>
      ) : null}
      {onRenderInfoBar ? onRenderInfoBar() : null}
      <div className={css('msla-templates-section-items', cssOverrides?.['sectionItems'])}>
        {items
          ? items.map((item, index) => {
              return <FieldSectionItem key={index} item={item} />;
            })
          : children}
      </div>
    </div>
  );
};
