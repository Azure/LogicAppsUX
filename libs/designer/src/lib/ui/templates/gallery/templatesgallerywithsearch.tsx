import type { TemplateSearchAndFilterProps } from '../filters/templatesearchfilters';
import { TemplateSearchAndFilters } from '../filters/templatesearchfilters';
import { TemplatesGallery } from './templatesgallery';
import type { TemplateSelectHandler } from '../cards/templateCard';
import { useTemplatesGalleryWithSearchStyles } from './templatesgallerywithsearch.styles';

export interface TemplatesGalleryWithSearchProps {
  searchAndFilterProps: TemplateSearchAndFilterProps;
  isLightweight?: boolean;
  pageCount?: number;
  blankTemplateCard?: JSX.Element;
  cssOverrides?: Record<string, string>;
  onTemplateSelect: TemplateSelectHandler;
}

export const TemplatesGalleryWithSearch = ({
  isLightweight,
  pageCount,
  blankTemplateCard,
  searchAndFilterProps,
  cssOverrides,
  onTemplateSelect,
}: TemplatesGalleryWithSearchProps) => {
  const styles = useTemplatesGalleryWithSearchStyles();

  return (
    <div className={styles.wrapper}>
      <TemplateSearchAndFilters {...searchAndFilterProps} />
      <br />
      <TemplatesGallery
        isLightweight={isLightweight}
        pageCount={pageCount}
        blankTemplateCard={blankTemplateCard}
        cssOverrides={cssOverrides}
        onTemplateSelect={onTemplateSelect}
      />
    </div>
  );
};
