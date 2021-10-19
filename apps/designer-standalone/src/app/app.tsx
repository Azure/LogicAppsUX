import { useLocalStorage } from 'react-use';
import { useEffect, useState } from 'react';
import { DesignerWrapper } from './Designer/designer';
export function App() {
  const [token, setToken] = useLocalStorage<string | null>('token', null);
  const [resourcePath, setResourcePath] = useLocalStorage<string | null>('resource', null);

  const [workflow, setWorkflow] = useState<any>(null);

  useEffect(() => {
    fetch(`https://management.azure.com/${resourcePath}?api-version=2020-06-01`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((x) => {
        if (x.status === 200) {
          x.json().then((y) => {
            const def = y.properties.files['workflow.json'].definition;
            setWorkflow(def);
          });
        } else {
          setWorkflow(null);
        }
      })
      .catch(() => setWorkflow(null));
  }, [resourcePath, token]);

  return (
    <DesignerWrapper
      workflow={workflow}
      setResourceId={setResourcePath}
      setToken={setToken}
      resourceId={resourcePath}
      token={token}
    ></DesignerWrapper>
  );
}

export default App;
