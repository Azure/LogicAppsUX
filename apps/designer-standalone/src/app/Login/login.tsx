import { TextField } from '@fluentui/react';

export interface LoginProps {
  setResourceId: (res: string) => void;
  setToken: (res: string) => void;
}

export const Login: React.FC<LoginProps> = (props) => {
  return (
    <div>
      <div>
        <TextField label="Workflow Resource ID" onChange={(e, newValue) => props.setResourceId(newValue ?? '')} />
      </div>
      <div>
        <TextField label="ARM Token" onChange={(e, newValue) => props.setToken(newValue ?? '')} />
      </div>
    </div>
  );
};
