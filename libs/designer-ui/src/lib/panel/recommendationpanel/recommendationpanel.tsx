// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { DesignerSearchBox } from '../..';
import { List, Panel } from '@fluentui/react';
// danielle will fix
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import type { CommonPanelProps } from 'libs/designer-ui/src/lib/panel/panelUtil';

export type RecommendationPanelProps = {
  placeholder: string;
} & CommonPanelProps;

export const RecommendationPanel = (props: RecommendationPanelProps) => {
  return (
    <Panel customWidth={props.width} isOpen={true}>
      <DesignerSearchBox name="idk"></DesignerSearchBox>
      <List></List>
    </Panel>
  );
};
