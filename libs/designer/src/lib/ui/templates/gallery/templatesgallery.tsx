import { EmptySearch, Pager } from '@microsoft/designer-ui';
import { TemplateCard } from '../cards/templateCard';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { setPageNum, templatesCountPerPage } from '../../../core/state/templates/manifestSlice';
import { Text } from '@fluentui/react-components';
import { useIntl } from 'react-intl';

interface TemplatesGalleryProps {
  isLightweight?: boolean;
  pageCount?: number;
  blankTemplateCard?: JSX.Element;
  cssOverrides?: Record<string, string>;
  onTemplateSelect?: (templateName: string, isSingleWorkflow: boolean) => void;
}

export const TemplatesGallery = ({
  blankTemplateCard,
  pageCount,
  onTemplateSelect,
  isLightweight,
  cssOverrides,
}: TemplatesGalleryProps) => {
  const {
    filters: { pageNum },
    filteredTemplateNames,
  } = useSelector((state: RootState) => state.manifest);
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const intlText = {
    NO_RESULTS: intl.formatMessage({
      defaultMessage: "Can't find any search results",
      id: 'iCni1C',
      description: 'Accessbility text to indicate no search results found',
    }),
    TRY_DIFFERENT: intl.formatMessage({
      defaultMessage: 'Try a different search term or remove filters',
      id: 'yKNKV/',
      description: 'Accessbility text to indicate to try different search term or remove filters',
    }),
  };

  const countPerPage = pageCount !== undefined ? pageCount : templatesCountPerPage;
  const startingIndex = pageNum * countPerPage;
  const endingIndex = startingIndex + countPerPage;
  const lastPage = Math.ceil((filteredTemplateNames?.length ?? 0) / countPerPage);
  return (
    <>
      <div>
        <div className="msla-templates-list">
          {blankTemplateCard ? blankTemplateCard : null}
          {filteredTemplateNames === undefined
            ? [1, 2, 3, 4].map((i) => <TemplateCard key={i} cssOverrides={cssOverrides} templateName={''} />)
            : filteredTemplateNames?.length > 0
              ? filteredTemplateNames
                  .slice(startingIndex, endingIndex)
                  .map((templateName: string) => (
                    <TemplateCard
                      key={templateName}
                      cssOverrides={cssOverrides}
                      templateName={templateName}
                      isLightweight={isLightweight}
                      onSelect={onTemplateSelect}
                    />
                  ))
              : null}
        </div>
        {filteredTemplateNames?.length && filteredTemplateNames.length > 0 ? (
          <Pager
            current={pageNum + 1}
            max={lastPage}
            min={1}
            readonlyPagerInput={true}
            clickablePageNumbers={5}
            countToDisplay={{
              countPerPage: templatesCountPerPage,
              totalCount: filteredTemplateNames.length,
            }}
            onChange={(page) => dispatch(setPageNum(page.value - 1))}
          />
        ) : null}
      </div>
      {filteredTemplateNames?.length === 0 ? (
        <div className="msla-templates-empty-list">
          <EmptySearch />
          <Text size={500} weight="semibold" align="start" className="msla-template-empty-list-title">
            {intlText.NO_RESULTS}
          </Text>
          <Text>{intlText.TRY_DIFFERENT}</Text>
        </div>
      ) : null}
    </>
  );
};
