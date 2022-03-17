import { InitializeServices as BJSInitializeService } from './bjsworkflow/initialize';

export const initializeServices = (spec: string): Record<string, any> => {
    if (spec === undefined) {
        throw new Error('Trying to import workflow without specifying the workflow type');
    }
    if (spec === 'BJS') {
        return BJSInitializeService();
    } else if (spec === 'CNCF') {
        throw new Error('Spec not implemented.');
    }

    throw new Error('Invalid Workflow Spec');
};
