export interface ConnectionWrapperProps {
  connectorId: string;
}

export const CreateTemplateConnectionWrapper = (props: ConnectionWrapperProps) => {
  const { connectorId } = props;

  return <div>this is the connectorId: {connectorId}</div>;
};
