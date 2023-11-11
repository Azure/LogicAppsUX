import { css } from '@fluentui/react';

interface GraphContainerProps {
  selected?: boolean;
}

export const GraphContainer: React.FC<GraphContainerProps> = (props: GraphContainerProps) => {
  const { selected = false } = props;
  return <div className={css('msla-graph-container', selected && 'selected')} />;
};
