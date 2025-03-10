import { DocumentCard, Shimmer, ShimmerElementType } from '@fluentui/react';
import { templateCardStyles } from './templateCard';

export const LoadingTemplateCard = () => {
  return (
    <DocumentCard className="msla-template-card-wrapper" styles={templateCardStyles}>
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
      </div>
    </DocumentCard>
  );
};
