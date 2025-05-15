import { css } from '@fluentui/react';
import { replaceWhiteSpaceWithUnderscore } from '@microsoft/logic-apps-shared';

interface GraphContainerProps {
  id: string;
  selected?: boolean;
  active?: boolean;
  isSubgraph?: boolean;
}

export const GraphContainer: React.FC<GraphContainerProps> = (props: GraphContainerProps) => {
  const { selected = false, active = true, id, isSubgraph = false } = props;
  return (
    <div
      data-automation-id={`msla-graph-container-${replaceWhiteSpaceWithUnderscore(id)}`}
      className={css('msla-graph-container', selected && 'selected', isSubgraph && 'is-subgraph', !active && 'msla-card-inactive')}
    />
  );
};
