import type { DesignerOptionsContext } from '../index';
import { BJSWorkflowProvider, Designer, DesignerProvider } from '../index';
import BigWorkflow from './simpleBigworkflow.json';
import SimpleWorkflow from './simpleSmallWorkflow.json';

export default {
  component: DesignerProvider,
  subcomponents: { BJSWorkflowProvider, Designer },
  title: 'Designer/Designer Composition',
};

interface ComponentProps {
  workflow: any;
  options?: Partial<DesignerOptionsContext>;
}

const RenderedComponent = (props: ComponentProps) => (
  <div style={{ height: '100vh' }}>
    <DesignerProvider
      locale="en-US"
      options={{
        ...props.options,
        services: {
          httpClient: {
            dispose: () => Promise.resolve({} as any),
            get: () => Promise.resolve({} as any),
            post: () => Promise.resolve({} as any),
          },
        },
      }}
    >
      <BJSWorkflowProvider workflow={props.workflow.definition}>
        <Designer></Designer>
      </BJSWorkflowProvider>
    </DesignerProvider>
  </div>
);

export const SimpleButBigDefinition = () => <RenderedComponent workflow={BigWorkflow} options={{}} />;

export const ReadOnlyExample = () => <RenderedComponent workflow={SimpleWorkflow} options={{ readOnly: true }} />;

export const MonitoringViewExample = () => (
  <RenderedComponent workflow={SimpleWorkflow} options={{ readOnly: true, isMonitoringView: true }} />
);
