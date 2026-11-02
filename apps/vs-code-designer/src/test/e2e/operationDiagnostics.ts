import { createDiagnosticProducer, diagnosticBinding } from '../../../scripts/e2e-cli-diagnostics';

// Existing native stdout/code.log stream, not analytics or a new result gate.
export let operationDiagnostics = createDiagnosticProducer({
  producer: 'native-test-operations',
  binding: diagnosticBinding(),
  sink: (line) => console.log(`[e2e-operation] ${line.trim()}`),
});

export function setOperationDiagnosticScope(binding: Record<string, string | null>): void {
  operationDiagnostics = createDiagnosticProducer({
    producer: 'native-test-operations',
    binding: { ...diagnosticBinding(), ...binding },
    sink: (line) => console.log(`[e2e-operation] ${line.trim()}`),
  });
}
