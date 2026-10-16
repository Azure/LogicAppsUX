/* global __dirname, console, process, require */
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const packageRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(packageRoot, '..', '..');
const script = path.join(__dirname, 'run-e2e-cli-linux-secure-session.sh');
const source = fs.readFileSync(script, 'utf8');
const bashPath = process.platform === 'win32' ? path.join(process.env.ProgramFiles || '', 'Git', 'bin', 'bash.exe') : 'bash';
const bash = process.platform === 'win32' && fs.existsSync(bashPath) ? bashPath : 'bash';
const shellPath = (value) => value.replaceAll('\\', '/');

test('secure OS preparation and original handoff capture are wired into both existing Linux routes', () => {
  const setup = fs.readFileSync(path.join(repoRoot, '.azure-pipelines', 'templates', 'vscode-e2e-cli-setup.yml'), 'utf8');
  const suites = fs.readFileSync(path.join(repoRoot, '.config', 'templates', 'vscode-e2e-cli-run-suite.yml'), 'utf8');
  assert.match(setup, /apt-get install -y --no-install-recommends[\s\S]*?gnome-keyring[\s\S]*?libsecret-tools/);
  assert.equal([...suites.matchAll(/bash scripts\/run-e2e-cli-linux-secure-session\.sh/g)].length, 2);
  assert.match(suites, /'invocation\.json', 'wizard-handoff\.json', 'final-result\.json'/);
  assert.doesNotMatch(suites, /Copy-Item.*(?:XDG_DATA_HOME|XDG_RUNTIME_DIR|la-keyring)/);
  assert.match(source, /--foreground --unlock --components=secrets/);
  assert.match(source, /exec dbus-run-session -- bash/);
  assert.doesNotMatch(source, /password-store=basic|use-inmemory-secretstorage|--replace|--components=.*(?:ssh|pkcs11)/);
  execFileSync(bash, ['-n', shellPath(script)], { stdio: 'pipe' });
});

function runFixture(overrides = {}, exitCode = 0) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'linux-secret-unit-'));
  const bin = path.join(root, 'bin');
  fs.mkdirSync(bin);
  const write = (name, body) => {
    const file = path.join(bin, name);
    fs.writeFileSync(file, `#!/usr/bin/env bash\nset -euo pipefail\n${body}\n`, { mode: 0o700 });
    fs.chmodSync(file, 0o700);
    return file;
  };
  // These are unit-owned OS-command fixtures, not real credential providers or UI evidence.
  write(
    'dbus-run-session',
    `
shift
export DBUS_SESSION_BUS_ADDRESS=unix:unit-owned-only
exec "$@"
`
  );
  write(
    'gnome-keyring-daemon',
    `
IFS= read -r password
[[ "$password" =~ ^[a-f0-9]{64}$ ]]
mkdir -p "$XDG_DATA_HOME/keyrings"
if [[ "\${UNIT_PLAINTEXT:-}" == 1 ]]; then
  printf '[keyring]\\n' > "$XDG_DATA_HOME/keyrings/login.keyring"
else
  printf 'GnomeKeyring\\n\\r\\0\\n' > "$XDG_DATA_HOME/keyrings/login.keyring"
fi
printf 'started\\n' > "$UNIT_ROOT/provider-started"
printf '%s\\n' "$BASHPID" > "$UNIT_ROOT/provider-pid"
trap 'printf "stopped\\n" > "$UNIT_ROOT/provider-stopped"; exit 0' TERM
while true; do sleep 0.02; done
`
  );
  write(
    'gdbus',
    `
if [[ "$1" == wait ]]; then
  if [[ "\${UNIT_PROVIDER_UNAVAILABLE:-}" == 1 ]]; then
    echo 'original unit provider unavailable' >&2
    exit 17
  fi
  for ((i=0; i<200; i++)); do
    if [[ -f "$UNIT_ROOT/provider-started" ]]; then exit 0; fi
    sleep 0.01
  done
  exit 18
fi
if [[ "$*" == *ReadAlias* ]]; then
  if [[ "\${UNIT_NO_COLLECTION:-}" == 1 ]]; then printf "(objectpath '/',)"; else
    printf "(objectpath '/org/freedesktop/secrets/collection/login',)"
  fi
else
  if [[ "\${UNIT_LOCKED:-}" == 1 ]]; then printf '(<true>,)'; else printf '(<false>,)'; fi
fi
`
  );
  write(
    'secret-tool',
    `
case "$1" in
  store)
    if [[ "\${UNIT_STORE_FAILED:-}" == 1 ]]; then echo 'original unit store failure' >&2; exit 19; fi
    cat > "$UNIT_ROOT/probe"
    ;;
  lookup)
    if [[ "\${UNIT_WRONG_LOOKUP:-}" == 1 ]]; then printf wrong; else cat "$UNIT_ROOT/probe"; fi
    ;;
  clear)
    if [[ "\${UNIT_CLEAR_FAILED:-}" == 1 ]]; then echo 'original unit clear failure' >&2; exit 20; fi
    rm "$UNIT_ROOT/probe"
    ;;
  *) exit 21 ;;
esac
`
  );
  write(
    'node',
    `
if [[ "\${UNIT_EMPTY_PASSWORD:-}" == 1 && "\${2:-}" == *randomBytes* ]]; then exit 0; fi
if command -v cygpath >/dev/null && [[ -n "\${XDG_DATA_HOME:-}" ]]; then
  export XDG_DATA_HOME="$(cygpath -w "$XDG_DATA_HOME")"
fi
exec "$UNIT_NODE" "$@"
`
  );
  const command = write(
    'original-command',
    `
printf 'original-command\\n' > "$UNIT_ROOT/command-ran"
if [[ "\${UNIT_PROVIDER_DIED:-}" == 1 ]]; then
  kill -TERM "$(cat "$UNIT_ROOT/provider-pid")"
  for ((i=0; i<200; i++)); do
    if [[ -f "$UNIT_ROOT/provider-stopped" ]]; then break; fi
    sleep 0.01
  done
fi
exit ${exitCode}
`
  );
  const launch = `
if command -v cygpath >/dev/null; then
  for variable in UNIT_ROOT UNIT_BIN UNIT_NODE UNIT_SCRIPT UNIT_COMMAND AGENT_TEMPDIRECTORY; do
    if [[ -n "\${!variable}" ]]; then
      printf -v "$variable" '%s' "$(cygpath -u "\${!variable}")"
      export "$variable"
    fi
  done
fi
export PATH="$UNIT_BIN:$PATH"
if [[ "\${UNIT_MISSING_TOOL:-}" == 1 ]]; then
  command() {
    if [[ "\${2:-}" == secret-tool ]]; then return 1; fi
    builtin command "$@"
  }
fi
source "$UNIT_SCRIPT" "$UNIT_COMMAND"
`;
  try {
    const result = spawnSync(bash, ['-c', launch], {
      cwd: packageRoot,
      encoding: 'utf8',
      timeout: 20000,
      env: {
        ...process.env,
        TF_BUILD: 'True',
        AGENT_TEMPDIRECTORY: shellPath(root),
        UNIT_ROOT: shellPath(root),
        UNIT_BIN: shellPath(bin),
        UNIT_NODE: shellPath(process.execPath),
        UNIT_SCRIPT: shellPath(script),
        UNIT_COMMAND: shellPath(command),
        ...overrides,
      },
    });
    assert.equal(result.error, undefined, `Unit-owned shell fixture failed: ${String(result.error)}`);
    const output = `${result.stdout}${result.stderr}`;
    assert.doesNotMatch(output, /\b[a-f0-9]{64}\b/, 'Ephemeral passwords/probes must not appear in diagnostic output');
    return {
      status: result.status,
      output,
      commandRan: fs.existsSync(path.join(root, 'command-ran')),
      providerStarted: fs.existsSync(path.join(root, 'provider-started')),
      providerStopped: fs.existsSync(path.join(root, 'provider-stopped')),
    };
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('unit-owned command fixtures require unlocked encrypted storage and preserve original exit', () => {
  for (const exitCode of [0, 7]) {
    const result = runFixture({}, exitCode);
    assert.equal(result.status, exitCode, result.output);
    assert.equal(result.commandRan, true);
    assert.equal(result.providerStarted, true);
    assert.equal(result.providerStopped, true);
  }
});

test('unit-owned missing, locked, plaintext and preparation failures never run the original command', () => {
  for (const [overrides, expected] of [
    [{ TF_BUILD: '' }, /restricted/],
    [{ AGENT_TEMPDIRECTORY: '' }, /temp directory/],
    [{ UNIT_MISSING_TOOL: '1' }, /missing: secret-tool/],
    [{ UNIT_EMPTY_PASSWORD: '1' }, /password generation failed/],
    [{ UNIT_PROVIDER_UNAVAILABLE: '1' }, /original unit provider unavailable/],
    [{ UNIT_NO_COLLECTION: '1' }, /collection is unavailable/],
    [{ UNIT_LOCKED: '1' }, /collection is locked/],
    [{ UNIT_PLAINTEXT: '1' }, /not the encrypted GNOME/],
    [{ UNIT_STORE_FAILED: '1' }, /original unit store failure/],
    [{ UNIT_WRONG_LOOKUP: '1' }, /round trip failed/],
    [{ UNIT_CLEAR_FAILED: '1' }, /original unit clear failure/],
  ]) {
    const result = runFixture(overrides);
    assert.notEqual(result.status, 0, result.output);
    assert.equal(result.commandRan, false);
    assert.match(result.output, expected);
    if (result.providerStarted) {
      assert.equal(result.providerStopped, true, result.output);
    }
  }
});

test('a unit-owned provider death cannot promote an original command exit zero to success', () => {
  const result = runFixture({ UNIT_PROVIDER_DIED: '1' });
  assert.equal(result.commandRan, true);
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /provider exited before session completion/);
});

console.log('[linux-secure-session.unit] Controlled shell/static checks only; no real provider, auth or GUI coverage.');
