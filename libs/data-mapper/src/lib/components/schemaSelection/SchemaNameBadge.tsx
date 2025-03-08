import { Badge, makeStyles, shorthands } from '@fluentui/react-components';
import { useViewport } from 'reactflow';

export const schemaNameBadgeDistanceAboveNodes = 24;

const useStyles = makeStyles({
  schemaNameBadge: {
    ...shorthands.overflow('hidden'),
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
});

interface SchemaNameBadgeProps {
  schemaName: string;
  schemaTreeRootXPos?: number;
}

export const SchemaNameBadge = ({ schemaName, schemaTreeRootXPos }: SchemaNameBadgeProps) => {
  const styles = useStyles();
  const reactFlowViewport = useViewport();

  // NOTE: Must account for, and scale based on, canvas zoom with *ANY* values/distances/etc
  const scaledBadgeDistanceAboveNodes = schemaNameBadgeDistanceAboveNodes * reactFlowViewport.zoom;
  const schemaNameBadgeCoords = {
    x: reactFlowViewport.x,
    y: reactFlowViewport.y - scaledBadgeDistanceAboveNodes,
  };

  if (schemaTreeRootXPos) {
    schemaNameBadgeCoords.x += reactFlowViewport.zoom * schemaTreeRootXPos;
  }

  return (
    <Badge
      className={styles.schemaNameBadge}
      appearance="tint"
      shape="rounded"
      color="informative"
      style={{
        position: 'absolute',
        top: schemaNameBadgeCoords.y,
        left: schemaNameBadgeCoords.x,
        transform: `scale(${reactFlowViewport.zoom})`,
        transformOrigin: 'top left',
        zIndex: 3,
      }}
    >
      {schemaName}
    </Badge>
  );
};
