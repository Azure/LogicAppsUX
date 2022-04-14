import { RecommendationPanel } from '@microsoft/designer-ui';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import type { CommonPanelProps } from 'libs/designer-ui/src/lib/panel/panelUtil';

export const RecommendationPanelContext = (props: CommonPanelProps) => {
    return <RecommendationPanel placeholder={''} {...props}></RecommendationPanel>
}
