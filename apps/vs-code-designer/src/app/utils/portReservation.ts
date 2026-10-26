/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as portfinder from 'portfinder';

/**
 * Ports handed out by {@link reserveFreePort} that have not yet been released.
 *
 * `portfinder.getPortPromise()` only checks whether a port is currently *bound*.
 * When several design-time / runtime hosts are launched concurrently (e.g.
 * `startAllDesignTimeApis` runs every project through `Promise.all`), none of
 * them has bound its port yet, so each independent call resolves to the *same*
 * "free" port and they collide the moment func.exe starts. Tracking the ports
 * we have already promised lets concurrent callers skip past a sibling's port.
 */
const reservedPorts = new Set<number>();

/**
 * Serializes reservations. Each `reserveFreePort` call chains onto the previous
 * one so two concurrent callers can never observe the reserved set in the same
 * state and pick the same port.
 */
let allocationChain: Promise<unknown> = Promise.resolve();

/**
 * Safety cap so a misbehaving `portfinder` (e.g. a test mock that always returns
 * the same value) can never spin forever. On overflow we return the last
 * candidate as a best effort rather than throwing during host startup.
 */
const maxReservationAttempts = 100;

async function reserveFreePortInternal(): Promise<number> {
  let candidate = await portfinder.getPortPromise();
  let attempts = 0;
  while (reservedPorts.has(candidate) && attempts < maxReservationAttempts) {
    candidate = await portfinder.getPortPromise({ port: candidate + 1 });
    attempts++;
  }
  reservedPorts.add(candidate);
  return candidate;
}

/**
 * Reserves a free TCP port that no other in-process caller currently holds.
 *
 * Allocations are serialized and de-duplicated against {@link reservedPorts},
 * so concurrent callers always receive distinct ports even before any of them
 * binds. Call {@link releaseReservedPort} when the owning host stops so the port
 * can be reused.
 */
export async function reserveFreePort(): Promise<number> {
  const run = allocationChain.then(() => reserveFreePortInternal());
  // Keep the chain alive regardless of this allocation's outcome so a rejected
  // allocation never wedges subsequent callers.
  allocationChain = run.catch(() => undefined);
  return run;
}

/**
 * Releases a previously reserved port so it can be handed out again. No-op when
 * `port` is undefined (e.g. an instance that never finished acquiring one).
 */
export function releaseReservedPort(port?: number): void {
  if (typeof port === 'number') {
    reservedPorts.delete(port);
  }
}

/**
 * Clears all reservation state. Intended for test teardown.
 */
export function resetReservedPorts(): void {
  reservedPorts.clear();
  allocationChain = Promise.resolve();
}
