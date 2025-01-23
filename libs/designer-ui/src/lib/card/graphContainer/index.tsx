import { css } from '@fluentui/react';
import { replaceWhiteSpaceWithUnderscore } from '@microsoft/logic-apps-shared';

interface GraphContainerProps {
  id: string;
  selected?: boolean;
  active?: boolean;
}

export const GraphContainer: React.FC<GraphContainerProps> = (props: GraphContainerProps) => {
  const { selected = false, active = true, id } = props;
  return (
    <div
      data-automation-id={`msla-graph-container-${replaceWhiteSpaceWithUnderscore(id)}`}
      className={css('msla-graph-container', selected && 'selected', !active && 'msla-card-inactive')}
    />
  );
};
