import { css } from '@fluentui/react';
import { mergeClasses } from '@fluentui/react-components';
import { replaceWhiteSpaceWithUnderscore } from '@microsoft/logic-apps-shared';
import { useGraphContainerStyles } from './graphContainer.styles';

interface GraphContainerProps {
  id: string;
  selected?: boolean;
  active?: boolean;
}

export const GraphContainer: React.FC<GraphContainerProps> = (props: GraphContainerProps) => {
  const { selected = false, active = true, id } = props;
  const styles = useGraphContainerStyles();

  return (
    <div
      data-automation-id={`msla-graph-container-${replaceWhiteSpaceWithUnderscore(id)}`}
      className={mergeClasses(styles.root, css(selected && 'selected', !active && 'msla-card-inactive'))}
    />
  );
};
