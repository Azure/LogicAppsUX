/**
 * Azure built-in role definition IDs, matched by ID rather than display name: the Foundry roles were
 * renamed ("Azure AI User" -> "Foundry User") without changing their IDs, and Microsoft recommends
 * referencing them by ID so the rename rollout does not break lookups.
 *
 * @see https://learn.microsoft.com/azure/ai-foundry/concepts/rbac-azure-ai-foundry
 */
export const AGENT_ROLE_DEFINITION_IDS = {
  /** "Foundry User", previously named "Azure AI User". Grants `Microsoft.CognitiveServices/*` data actions. */
  foundryUser: '53ca6127-db72-4b80-b1b0-d745d6d5456d',
  /** "Cognitive Services OpenAI User". Grants the Azure OpenAI data actions, including `deployments/chat/completions/action`. */
  cognitiveServicesOpenAIUser: '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd',
} as const;

/**
 * Data-plane roles the workflow app's managed identity needs on the Cognitive Services account (or
 * Foundry project) backing an agent connection that authenticates with managed identity.
 *
 * These are **preference-ordered alternatives, not a set that is all required** — the identity only
 * needs one, so the first entry that exists in the tenant is assigned.
 *
 * The runtime only issues data-plane requests against the model endpoint and never calls the ARM
 * control plane for the account, so control-plane roles such as "Azure AI Administrator" and
 * "Cognitive Services Contributor" declare no `dataActions` and grant nothing at inference time.
 *
 * The fallback covers clouds where the Foundry roles have not rolled out yet; without it those clouds
 * would get no data-plane grant at all.
 */
export const AGENT_MSI_REQUIRED_ROLE_DEFINITION_IDS: string[] = [
  AGENT_ROLE_DEFINITION_IDS.foundryUser,
  AGENT_ROLE_DEFINITION_IDS.cognitiveServicesOpenAIUser,
];
