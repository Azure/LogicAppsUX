import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import type { TemplateSearchAndFilterProps } from '../filters/templatesearchfilters';
import { TemplateSearchAndFilters } from '../filters/templatesearchfilters';
import { useEffect } from 'react';
import { initializeWorkflowMetadata } from '../../../core/actions/bjsworkflow/templates';
import { TemplatesGallery } from './templatesgallery';
import type { TemplateSelectHandler } from '../cards/templateCard';

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
  const dispatch = useDispatch<AppDispatch>();

  const { manifest } = useSelector((state: RootState) => state.template);

  useEffect(() => {
    if (manifest) {
      dispatch(initializeWorkflowMetadata());
    }
  }, [dispatch, manifest]);

  return (
    <>
      <TemplateSearchAndFilters {...searchAndFilterProps} />
      <br />
      <TemplatesGallery
        isLightweight={isLightweight}
        pageCount={pageCount}
        blankTemplateCard={blankTemplateCard}
        cssOverrides={cssOverrides}
        onTemplateSelect={onTemplateSelect}
      />
    </>
  );
};
