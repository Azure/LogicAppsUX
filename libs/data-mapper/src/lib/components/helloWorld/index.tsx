export interface HelloWorldProps {
  name: string;
}
export const HelloWorld = ({ name }: HelloWorldProps) => {
  return <div>Hello {name ?? 'World'}</div>;
};
