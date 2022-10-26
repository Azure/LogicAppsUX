import { SchemaType } from '../../models/';
import type { SchemaExtended } from '../../models/';
import { SelectSchemaCard } from '../schemaSelection/SelectSchemaCard';
import { ReactFlowSchemaOverview } from './ReactFlowSchemaOverview';
import { Stack } from '@fluentui/react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
// eslint-disable-next-line import/no-named-as-default
import { ReactFlowProvider } from 'reactflow';

const useStyles = makeStyles({
  mapOverviewStyles: {
    height: '100%',
    width: '100%',
    backgroundColor: '#edebe9',
    minHeight: 0,
    ...shorthands.overflow('hidden'),
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  schemaCardStackStyles: {
    height: '100%',
    width: '50%',
  },
});

export interface MapOverviewProps {
  sourceSchema?: SchemaExtended;
  targetSchema?: SchemaExtended;
}

export const MapOverview = ({ sourceSchema, targetSchema }: MapOverviewProps) => {
  const styles = useStyles();

  return (
    <div className={styles.mapOverviewStyles}>
      <Stack verticalAlign="center" className={styles.schemaCardStackStyles}>
        {sourceSchema ? (
          <ReactFlowProvider>
            <ReactFlowSchemaOverview schema={sourceSchema} schemaType={SchemaType.Source} />
          </ReactFlowProvider>
        ) : (
          <SelectSchemaCard schemaType={SchemaType.Source} />
        )}
      </Stack>

      <Stack verticalAlign="center" className={styles.schemaCardStackStyles}>
        {targetSchema ? (
          <ReactFlowProvider>
            <ReactFlowSchemaOverview schema={targetSchema} schemaType={SchemaType.Target} />
          </ReactFlowProvider>
        ) : (
          <SelectSchemaCard schemaType={SchemaType.Target} />
        )}
      </Stack>
    </div>
  );
};
