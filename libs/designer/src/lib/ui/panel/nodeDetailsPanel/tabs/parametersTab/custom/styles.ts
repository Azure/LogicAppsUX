import { makeStyles } from '@fluentui/react-components';
import type { CSSProperties } from 'react';

export const useDeploymentModelResourceStyles = makeStyles({
  rowContainer: {
    minWidth: '150px',
    maxWidth: '100%',
    marginTop: '10px',
  },
  containerTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '10px',
    justifyContent: 'center',
  },
  buttonContainer: {
    marginTop: '40px',
    display: 'inline-flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: '10px',
    alignItems: 'center',
  },
});

export const deploymentModelNameStyle: CSSProperties = {
  marginTop: '5px',
};
