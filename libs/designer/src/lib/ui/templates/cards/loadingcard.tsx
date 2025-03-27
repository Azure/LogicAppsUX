import { css, DocumentCard, Shimmer, ShimmerElementType } from '@fluentui/react';
import { templateCardStyles } from './templateCard';

export const LoadingTemplateCard = ({
  cssOverrides,
  isLightweight = true,
}: { isLightweight?: boolean; cssOverrides?: Record<string, string> }) => {
  return (
    <DocumentCard className={css('msla-template-card-wrapper', cssOverrides?.['card'])} styles={templateCardStyles}>
      <div className="msla-template-card-authored-wrapper">
        <div className="msla-template-card-authored">
          <Shimmer style={{ width: '100%' }} width={'100%'} />
        </div>
      </div>

      <div className="msla-template-card-body">
        <div className="msla-template-card-title-wrapper">
          <br />
          <Shimmer width={'100%'} />
          <br />
          <Shimmer width={'70%'} />
        </div>
        {isLightweight ? null : (
          <div className="msla-template-card-footer">
            <div className="msla-template-card-connectors-list">
              <Shimmer
                shimmerElements={[
                  { type: ShimmerElementType.circle },
                  { type: ShimmerElementType.gap },
                  { type: ShimmerElementType.circle },
                  { type: ShimmerElementType.gap },
                  { type: ShimmerElementType.circle },
                ]}
              />
            </div>
          </div>
        )}
      </div>
    </DocumentCard>
  );
};
