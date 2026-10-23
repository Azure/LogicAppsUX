import { useEffect, useRef, useState } from 'react';
import {
  standardManagementOperations,
  standardManagementScenarios,
  SyntheticStandardManagementHost,
  type SyntheticManagementEvent,
  type SyntheticManagementIdentity,
  type SyntheticManagementOperation,
  type SyntheticManagementScenario,
} from './standardManagementHost';

/** Explicit offline test route; it never imports the Azure-connected host or its credentials. */
export const StandardManagementTestHost = () => {
  const [host, setHost] = useState<SyntheticStandardManagementHost>();
  const ownerRef = useRef<SyntheticStandardManagementHost>();
  const [events, setEvents] = useState<SyntheticManagementEvent[]>([]);
  const [status, setStatus] = useState('Direct management disabled');
  const [enabled, setEnabled] = useState(false);
  const [signedIn, setSignedIn] = useState(true);
  const [identity, setIdentity] = useState<SyntheticManagementIdentity>({
    app: 'one',
    tenant: 'one',
    account: 'one',
    authority: 'one',
  });

  useEffect(() => {
    const owner = new SyntheticStandardManagementHost((event) => setEvents((previous) => [...previous, event]));
    ownerRef.current = owner;
    setHost(owner);
    return () => {
      ownerRef.current = undefined;
      owner.dispose();
    };
  }, []);

  const execute = async (operation: SyntheticManagementOperation): Promise<void> => {
    setStatus(`${operation}: running`);
    try {
      await host!.execute(operation);
      if (ownerRef.current === host) {
        setStatus(`${operation}: succeeded`);
      }
    } catch (error) {
      if (ownerRef.current === host) {
        setStatus(`${operation}: failed — ${error instanceof Error ? error.message : 'Synthetic request failed'}`);
      }
    }
  };

  const changeIdentity = (field: keyof SyntheticManagementIdentity, value: 'one' | 'two'): void => {
    const next = { ...identity, [field]: value };
    if (signedIn) {
      host!.setIdentity(next);
    }
    setIdentity(next);
    setStatus('Synthetic context changed');
  };

  return (
    <main>
      <h1>Standard management library test host</h1>
      <p>Synthetic fixtures only. No production credentials, network calls, or real subscription mutations.</p>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          disabled={!host}
          onChange={async (event) => {
            const selected = event.target.checked;
            try {
              await host!.setEnabled(selected);
              if (ownerRef.current === host) {
                setEnabled(selected);
                setStatus(`Direct management ${selected ? 'enabled' : 'disabled'}`);
              }
            } catch (error) {
              if (ownerRef.current === host) {
                setStatus(error instanceof Error ? error.message : 'Synthetic enablement failed');
              }
            }
          }}
        />
        Enable synthetic direct management
      </label>
      {(['app', 'tenant', 'account', 'authority'] as const).map((field) => (
        <label key={field}>
          {field.charAt(0).toUpperCase() + field.slice(1)}
          <select value={identity[field]} disabled={!host} onChange={(event) => changeIdentity(field, event.target.value as 'one' | 'two')}>
            <option value="one">Synthetic {field} one</option>
            <option value="two">Synthetic {field} two</option>
          </select>
        </label>
      ))}
      <label>
        Scenario
        <select
          disabled={!host}
          onChange={(event) => {
            host!.scenario = event.target.value as SyntheticManagementScenario;
          }}
        >
          {standardManagementScenarios.map((scenario) => (
            <option key={scenario} value={scenario}>
              {scenario}
            </option>
          ))}
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          disabled={!host}
          onChange={(event) => {
            host!.holdIssuance = event.target.checked;
          }}
        />
        Hold issuance
      </label>
      <button type="button" disabled={!host} onClick={() => host!.releaseIssuance()}>
        Release issuance
      </button>
      <button
        type="button"
        disabled={!host}
        onClick={() => {
          if (signedIn) {
            host!.signOut();
          } else {
            host!.setIdentity(identity);
          }
          setSignedIn(!signedIn);
          setStatus(signedIn ? 'Synthetic context signed out' : 'Synthetic context signed in');
        }}
      >
        {signedIn ? 'Sign out' : 'Sign in'}
      </button>
      <section aria-label="Standard service operations">
        {standardManagementOperations.map((operation) => (
          <button key={operation} type="button" disabled={!host || !signedIn} onClick={() => execute(operation)}>
            {operation}
          </button>
        ))}
      </section>
      <p role="status">{status}</p>
      <p data-testid="transport-counts">
        {`issuer: ${events.filter((event) => event.channel === 'issuer').length}; ARM: ${events.filter((event) => event.channel === 'ARM').length}; direct: ${events.filter((event) => event.channel === 'direct').length}`}
      </p>
      <ol data-testid="transport-trace">
        {events.map((event, index) => (
          <li key={index}>
            {event.channel} {event.method} {event.path}
          </li>
        ))}
      </ol>
    </main>
  );
};
