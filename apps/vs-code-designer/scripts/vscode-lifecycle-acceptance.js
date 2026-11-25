/* global module, require */
const path = require('node:path');
const { resolveSubsequentStartup } = require('./vscode-lifecycle-producer');
const { validOriginalIdentity, sameOriginalIdentity } = require('./vscode-lifecycle-identity');

// This is a verdict over evidence, not a process-name allowlist. Producers must
// retain their original identities and collect shutdown/resources BEFORE recovery.
// Neither a native capture barrier nor a zero launcher exit proves deactivation.
function evaluateLifecycleAcceptance(closure, evidence) {
  const platform = closure.mechanism === 'linux-subreaper' ? 'linux' : 'win32';
  evidence = resolveSubsequentStartup(evidence);
  if (evidence?.startup && closure.lifecycleEvidence) closure.lifecycleEvidence = evidence;
  const recovered = closure.forcedTerminationAttempted === true;
  const infrastructure = closure.infrastructureCleanupVerified === true ? (recovered ? 'recovered' : 'clean') : 'failed';
  const result = (product, reason, accepted = false) => ({
    schemaVersion: 1,
    product,
    infrastructure,
    recovered,
    accepted,
    reason,
  });
  if (!evidence) {
    return result('unverified', 'product-shutdown-resource-and-startup-proof-unavailable');
  }
  if (
    evidence.schemaVersion !== 1 ||
    typeof evidence.invocation !== 'string' ||
    !evidence.invocation ||
    evidence.rootPid !== closure.rootPid ||
    closure.receiptValidated !== true ||
    closure.hostOutcomeMatches !== true ||
    closure.rootExitCode !== 0 ||
    closure.rootSignal !== null
  ) {
    return result('blocked', 'invalid-or-unbound-product-evidence');
  }
  if (
    recovered &&
    (closure.forcedTerminationSucceeded !== true ||
      closure.postTerminationActiveProcessCount !== 0 ||
      !Array.isArray(closure.escapedDescendants) ||
      closure.escapedDescendants.length !== 0)
  ) {
    return result('blocked', 'original-containment-recovery-not-proven');
  }
  const { shutdown, resources, startup } = evidence;
  const proof = (entry, source) =>
    entry?.source === source &&
    entry.invocation === evidence.invocation &&
    typeof entry.receipt === 'string' &&
    entry.receipt.length > 0 &&
    Number.isFinite(entry.observedAt);
  if (
    !proof(shutdown, 'logicapps-owned-shutdown') ||
    shutdown.verified !== true ||
    !Array.isArray(shutdown.ownedProcesses) ||
    shutdown.ownedProcesses.some(
      (entry) =>
        !Number.isSafeInteger(entry?.pid) ||
        entry.pid <= 0 ||
        !validOriginalIdentity(entry, platform) ||
        (platform === 'linux' && !/^[a-f0-9]{64}$/.test(entry.commandSha256))
    ) ||
    !proof(resources, 'logicapps-resource-probe') ||
    resources.verified !== true ||
    !Array.isArray(resources.checked) ||
    !['runtime', 'design-time', 'ports', 'locks'].every((kind) => resources.checked.includes(kind))
  ) {
    return result('failed', 'logicapps-shutdown-or-resource-release-not-proven');
  }
  if (
    recovered &&
    (!Number.isFinite(evidence.beforeRecoveryAt) ||
      evidence.beforeRecoveryAt !== Date.parse(closure.metadataCapturedAtUtc) ||
      Math.max(shutdown.observedAt, resources.observedAt) >= evidence.beforeRecoveryAt)
  ) {
    return result('blocked', 'recovery-may-have-concealed-product-failure');
  }
  const survivors = closure.activeContainedProcesses;
  const owners = evidence.survivorOwners;
  if (
    !Array.isArray(survivors) ||
    closure.activeContainedProcessesDiagnosticsValid !== true ||
    closure.activeContainedProcessesTruncated === true ||
    closure.activeContainedProcessCount !== survivors.length ||
    !Array.isArray(owners) ||
    owners.length !== survivors.length ||
    new Set(owners.map((owner) => owner.pid)).size !== owners.length
  ) {
    return result('blocked', 'incomplete-original-survivor-identities');
  }
  for (const survivor of survivors) {
    if (shutdown.ownedProcesses.some((entry) => sameOriginalIdentity(entry, survivor, platform))) {
      return result('failed', 'logicapps-owned-or-shared-runtime-survived');
    }
    const owner = owners.find((entry) => entry.pid === survivor.pid);
    // Pin PID + creation identity + full launch command hash. Installation
    // provenance is mandatory; Roslyn.exe/func.exe and dll basenames prove nothing.
    if (
      survivor.metadataStatus !== 'captured' ||
      !validOriginalIdentity(survivor, platform) ||
      !survivor.commandSummary?.sha256 ||
      (platform === 'linux' && survivor.commandSummary.hashEncoding !== 'linux-proc-cmdline-nul-bytes') ||
      !owner ||
      !sameOriginalIdentity(owner, survivor, platform) ||
      owner.commandSha256 !== survivor.commandSummary.sha256 ||
      owner.source !== 'validated-installed-payload' ||
      owner.invocation !== evidence.invocation ||
      typeof owner.receipt !== 'string' ||
      !owner.receipt ||
      typeof owner.extensionId !== 'string' ||
      !owner.extensionId ||
      typeof owner.installationRoot !== 'string' ||
      typeof owner.executable !== 'string' ||
      !path.isAbsolute(owner.installationRoot) ||
      !path.isAbsolute(owner.executable)
    ) {
      return result('blocked', 'unknown-or-ambiguous-survivor-ownership');
    }
    if (
      survivor.executablePath !== owner.executable ||
      owner.extensionId !== 'ms-dotnettools.csharp' ||
      owner.processClass !== 'csharp-roslyn-language-server' ||
      !/^[a-f0-9]{64}$/.test(owner.commandSha256) ||
      !/^[a-f0-9]{64}$/.test(owner.installationSHA256) ||
      !/^[a-f0-9]{64}$/.test(owner.payloadSHA256)
    ) {
      return result('blocked', 'invalid-installed-payload-provenance');
    }
    const relative = path.relative(owner.installationRoot, owner.executable);
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      return result('blocked', 'unbound-extension-launch');
    }
    if (relative.replace(/\\/g, '/') !== `.roslyn/Microsoft.CodeAnalysis.LanguageServer${platform === 'win32' ? '.exe' : ''}`) {
      return result('blocked', 'unbound-installed-roslyn-payload');
    }
    if (owner.productRole !== 'independent-dependency' || /^ms-azuretools\.vscode-(?:azurelogicapps|logicapps)/i.test(owner.extensionId)) {
      return result('failed', 'logicapps-owned-or-shared-runtime-survived');
    }
  }
  if (infrastructure === 'failed') {
    if (!startup) return result('blocked', 'environment-not-contained-for-subsequent-startup');
  }
  if (evidence.startupResolutionError) {
    return result('blocked', 'subsequent-startup-verification-failed');
  }
  if (!startup) {
    return result('pending-startup', 'independent-recovery-awaiting-actual-next-phase');
  }
  if (
    !proof(startup, 'logicapps-subsequent-startup') ||
    startup.verified !== true ||
    typeof startup.launchId !== 'string' ||
    !startup.launchId ||
    typeof startup.actualInvocation !== 'string' ||
    !startup.actualInvocation ||
    startup.actualInvocation === evidence.invocation ||
    !startup.nativeIdentity?.processes?.some(
      (record) =>
        record.pid === startup.extensionHostPid &&
        record.metadataStatus === 'captured' &&
        validOriginalIdentity(record, platform) &&
        (platform !== 'linux' || record.commandSummary?.hashEncoding === 'linux-proc-cmdline-nul-bytes') &&
        /^[a-f0-9]{64}$/.test(record.commandSummary?.sha256)
    ) ||
    !Number.isFinite(Date.parse(startup.nativeIdentity?.observedAtUtc)) ||
    Date.parse(startup.nativeIdentity.observedAtUtc) > startup.observedAt ||
    startup.observedAt <= Math.max(shutdown.observedAt, resources.observedAt) ||
    (evidence.requiredStartupDomain && startup.domain !== evidence.requiredStartupDomain)
  ) {
    return result('failed', 'actual-subsequent-startup-not-proven');
  }
  if (infrastructure === 'failed') {
    return result('passed', 'product-passed-but-environment-not-contained');
  }
  return result('passed', recovered ? 'independent-dependency-recovered' : 'product-and-environment-verified', true);
}

// Preserve old ordinary-closure contracts. A new dependency exception must be
// recomputed from retained evidence; a serialized success-shaped verdict alone
// cannot turn a failed receipt into acceptance.
function isProcessCleanupAccepted(closure) {
  if (!closure) {
    return false;
  }
  if (closure.verified === true && closure.forcedTerminationAttempted !== true) return true;
  if (closure.lifecycleEvidence !== undefined) {
    return evaluateLifecycleAcceptance(closure, closure.lifecycleEvidence).accepted;
  }

  return closure.verified === true && closure.forcedTerminationAttempted !== true;
}

function canContinueAfterProcessCleanup(closure) {
  return (
    isProcessCleanupAccepted(closure) ||
    (closure?.lifecycleEvidence !== undefined &&
      evaluateLifecycleAcceptance(closure, closure.lifecycleEvidence).product === 'pending-startup')
  );
}

function isTerminalProcessClosureAccepted(terminal) {
  if (terminal?.processCleanup?.lifecycleEvidence !== undefined) {
    return isProcessCleanupAccepted(terminal.processCleanup);
  }
  return (
    terminal?.originalProcessClosureVerified === true &&
    terminal.processClosureProof === 'retained-original-identities' &&
    (!terminal.processCleanup || isProcessCleanupAccepted(terminal.processCleanup))
  );
}

module.exports = {
  evaluateLifecycleAcceptance,
  isProcessCleanupAccepted,
  isTerminalProcessClosureAccepted,
  canContinueAfterProcessCleanup,
};
