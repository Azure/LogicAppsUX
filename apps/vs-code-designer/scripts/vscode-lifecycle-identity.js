/* global module, process */
// FILETIME and Linux boot-relative clock ticks are different identity domains.
// Never convert one into the other or infer Linux identity from a PID alone.
function validOriginalIdentity(record, platform = process.platform) {
  if (!record || !/^[0-9]{1,24}$/.test(record.startTimeTicks)) return false;
  const identity = record.identity;
  if (platform === 'linux') {
    return (
      identity?.platform === 'linux' &&
      identity.kind === 'linux-proc-start' &&
      identity.startTimeTicks === record.startTimeTicks &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(identity.bootId) &&
      Number.isSafeInteger(identity.clockTicksPerSecond) &&
      identity.clockTicksPerSecond > 0
    );
  }
  // Read compatibility for previously retained Windows FILETIME receipts.
  return (
    platform === 'win32' &&
    (!identity ||
      (identity.platform === 'win32' && identity.kind === 'windows-filetime' && identity.startTimeTicks === record.startTimeTicks))
  );
}

function sameOriginalIdentity(a, b, platform = a?.identity?.platform || b?.identity?.platform || process.platform) {
  return (
    validOriginalIdentity(a, platform) &&
    validOriginalIdentity(b, platform) &&
    a.pid === b.pid &&
    a.startTimeTicks === b.startTimeTicks &&
    (platform !== 'linux' || (a.identity.bootId === b.identity.bootId && a.identity.clockTicksPerSecond === b.identity.clockTicksPerSecond))
  );
}

function originalProcessReleased(original, current) {
  if (!original || current?.pid !== original.pid) return false;
  if (current.metadataStatus === 'exited-before-inspection') return true;
  if (current.metadataStatus === 'exited') {
    return (
      sameOriginalIdentity(original, current) &&
      current.exitProof?.source === 'GetProcessTimes' &&
      /^[0-9]{1,24}$/.test(current.exitProof.exitTimeTicks) &&
      BigInt(current.exitProof.exitTimeTicks) > BigInt(current.startTimeTicks)
    );
  }
  const platform = original.identity?.platform || process.platform;
  return (
    current.metadataStatus === 'captured' &&
    validOriginalIdentity(current, platform) &&
    validOriginalIdentity(original, platform) &&
    !sameOriginalIdentity(original, current, platform)
  );
}

module.exports = { validOriginalIdentity, sameOriginalIdentity, originalProcessReleased };
