import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

// Root teardown runs while ExTester's browser is still alive. The extension
// recorder calls/awaits the actual exported deactivation in its own host.
after(async function () {
  this.timeout(45_000);
  const directory = process.env.LA_E2E_LIFECYCLE_DIR;
  assert.ok(directory, 'ExTester lifecycle owner directory is required');
  const baseline = new Map(
    fs
      .readdirSync(directory)
      .filter((file) => file.endsWith('.observer.jsonl'))
      .map((file) => [file, fs.statSync(path.join(directory, file)).size])
  );
  fs.writeFileSync(path.join(directory, 'shutdown.trigger'), '', { flag: 'wx' });
  const deadline = Date.now() + 40_000;
  while (Date.now() < deadline) {
    for (const file of fs.readdirSync(directory).filter((entry) => entry.endsWith('.observer.jsonl'))) {
      const text = fs.readFileSync(path.join(directory, file), 'utf8').slice(baseline.get(file) ?? 0);
      const records = text
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as { kind: string; reason?: string; productDeactivationFailed?: boolean });
      assert.ok(
        !records.some((record) => record.kind === 'error' && record.productDeactivationFailed),
        'Actual original product deactivation failed'
      );
      if (records.some((record) => record.kind === 'shutdown' || record.kind === 'error')) {
        // Observation failures remain in the policy evidence and block any
        // exception. Ordinary native closure needs no new heavy proof gate.
        return;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const binding = JSON.parse(fs.readFileSync(path.join(directory, 'binding.json'), 'utf8'));
  fs.writeFileSync(
    path.join(directory, 'boundary-error.observer.jsonl'),
    `${JSON.stringify({
      schemaVersion: 1,
      ...binding,
      kind: 'error',
      observedAt: Date.now(),
      reason: 'supported-recorder-deactivation-acknowledgement-unavailable',
    })}\n`,
    { flag: 'wx' }
  );
  // Missing observation blocks an exception, not ordinary functional closure.
});
