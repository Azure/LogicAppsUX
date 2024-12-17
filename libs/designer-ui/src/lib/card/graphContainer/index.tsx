import { css } from '@fluentui/react';

interface GraphContainerProps {
  selected?: boolean;
  active?: boolean;
}

export const GraphContainer: React.FC<GraphContainerProps> = (props: GraphContainerProps) => {
  const { selected = false, active = true } = props;
  return <div className={css('msla-graph-container', selected && 'selected', !active && 'msla-card-inactive')} />;
};
