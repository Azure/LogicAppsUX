import * as path from 'node:path';
import type { CdpEvaluator } from './cdpFormHelpers';
import {
  assertApprovedAzureConnectorFixtureSaved,
  readApprovedAzureConnectorFixture,
  readApprovedExistingResourceGroup,
  readApprovedAzureSubscriptionName,
  selectApprovedAzureConnectorFixturePrompt,
} from './azureConnectorFixture';
import { handleAffirmativeConnectorWorkbenchPrompt } from './workbenchPrompts';

// Real local debugging can request Azure connector context even for a request
// workflow. Reuse only the approved existing WIF fixture and stock UI policy;
// this helper performs no resource creation or local-settings synthesis.
export async function createMultiRootAzureSetup(deadline: number) {
  const fixture = await readApprovedExistingResourceGroup(readApprovedAzureConnectorFixture(), deadline);
  return {
    handle: (cdp: CdpEvaluator, folder: string, phaseDeadline: number) =>
      handleAffirmativeConnectorWorkbenchPrompt(cdp, path.basename(folder), Math.min(deadline, phaseDeadline), (prompt) =>
        selectApprovedAzureConnectorFixturePrompt(cdp, prompt, fixture, Math.min(deadline, phaseDeadline), () =>
          readApprovedAzureSubscriptionName(fixture, Math.min(deadline, phaseDeadline))
        )
      ),
    assertSaved: (folder: string) => assertApprovedAzureConnectorFixtureSaved(folder, fixture),
  };
}
