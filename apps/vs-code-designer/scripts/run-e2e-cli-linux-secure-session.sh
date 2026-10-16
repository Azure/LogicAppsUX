#!/usr/bin/env bash
set +x
set -euo pipefail
umask 077

fail() {
  printf '[linux-secure-session] %s\n' "$1" >&2
  exit 1
}

[[ "${TF_BUILD:-}" == "True" || "${TF_BUILD:-}" == "true" ]] ||
  fail 'This preparation is restricted to the existing isolated Azure Pipelines Linux job.'
[[ -n "${AGENT_TEMPDIRECTORY:-}" && -d "$AGENT_TEMPDIRECTORY" && "$#" -gt 0 ]] ||
  fail 'Existing job temp directory and original test command are required.'

if [[ "${1:-}" != "--inside-dbus" ]]; then
  for tool in dbus-run-session gnome-keyring-daemon gdbus secret-tool timeout node; do
    command -v "$tool" >/dev/null || fail "Required secure OS prerequisite is missing: $tool"
  done
  session_root="$(mktemp -d "$AGENT_TEMPDIRECTORY/la-keyring.XXXXXX")"
  export XDG_DATA_HOME="$session_root/data"
  export XDG_RUNTIME_DIR="$session_root/runtime"
  export GNOME_KEYRING_CONTROL="$XDG_RUNTIME_DIR/keyring"
  mkdir -m 700 "$XDG_DATA_HOME" "$XDG_RUNTIME_DIR" "$GNOME_KEYRING_CONTROL"
  exec dbus-run-session -- bash "${BASH_SOURCE[0]}" --inside-dbus "$@"
fi

shift
[[ -n "${DBUS_SESSION_BUS_ADDRESS:-}" && -n "${GNOME_KEYRING_CONTROL:-}" && "$#" -gt 0 ]] ||
  fail 'The new job-scoped D-Bus session and original test command are required.'

provider_started=0
finish() {
  original_status=$?
  trap - EXIT
  if [[ "$provider_started" == 1 ]]; then
    provider_status=0
    if [[ -n "$(jobs -pr)" ]]; then
      # Only this shell's sole foreground-provider job; never Code or a name/PID sweep.
      kill -TERM %1 || {
        printf '[linux-secure-session] Original provider shutdown request failed.\n' >&2
        if [[ "$original_status" == 0 ]]; then original_status=1; fi
      }
      wait %1 || provider_status=$?
      if [[ "$provider_status" != 0 && "$provider_status" != 143 ]]; then
        printf '[linux-secure-session] Original provider shutdown failed: %s\n' "$provider_status" >&2
        if [[ "$original_status" == 0 ]]; then original_status=1; fi
      fi
    else
      wait %1 || provider_status=$?
      printf '[linux-secure-session] Original secure provider exited before session completion: %s\n' "$provider_status" >&2
      if [[ "$original_status" == 0 ]]; then original_status=1; fi
    fi
  fi
  exit "$original_status"
}
trap finish EXIT

password="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))')"
[[ "$password" =~ ^[a-f0-9]{64}$ ]] || fail 'Nonempty cryptographic job-only keyring password generation failed.'
gnome-keyring-daemon --foreground --unlock --components=secrets \
  --control-directory="$GNOME_KEYRING_CONTROL" <<< "$password" &
provider_started=1
unset password

gdbus wait --session --timeout=15 org.freedesktop.secrets
collection="$(gdbus call --session --dest org.freedesktop.secrets --object-path /org/freedesktop/secrets \
  --method org.freedesktop.Secret.Service.ReadAlias default)"
[[ "$collection" =~ ^\(objectpath\ \'(/org/freedesktop/secrets/collection/[A-Za-z0-9_]+)\'\,\)$ ]] ||
  fail 'The real default Secret Service collection is unavailable.'
collection_path="${BASH_REMATCH[1]}"
locked="$(gdbus call --session --dest org.freedesktop.secrets --object-path "$collection_path" \
  --method org.freedesktop.DBus.Properties.Get org.freedesktop.Secret.Collection Locked)"
[[ "$locked" == "(<false>,)" ]] || fail 'The real default Secret Service collection is locked.'

probe="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))')"
[[ "$probe" =~ ^[a-f0-9]{64}$ ]] || fail 'Job-only secure-store probe generation failed.'
printf '%s' "$probe" | timeout 15s secret-tool store --label='Logic Apps E2E secure OS prerequisite' \
  application logic-apps-e2e prerequisite secure-session
stored="$(timeout 15s secret-tool lookup application logic-apps-e2e prerequisite secure-session)"
[[ "$stored" == "$probe" ]] || fail 'The real Secret Service store/lookup round trip failed.'
unset probe stored
node -e '
  const fs = require("node:fs");
  const path = require("node:path");
  const file = path.join(process.env.XDG_DATA_HOME, "keyrings", "login.keyring");
  if (!fs.lstatSync(file).isFile() || !fs.readFileSync(file).subarray(0, 16).equals(Buffer.from("GnomeKeyring\n\r\0\n"))) {
    throw new Error("The fresh login keyring is not the encrypted GNOME keyring format");
  }
'
timeout 15s secret-tool clear application logic-apps-e2e prerequisite secure-session
printf '[linux-secure-session] Real unlocked Secret Service and encrypted login keyring verified; original test command follows.\n'
status=0
"$@" || status=$?
exit "$status"
