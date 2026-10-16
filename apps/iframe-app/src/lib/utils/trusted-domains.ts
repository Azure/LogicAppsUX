/**
 * Trusted Microsoft Logic Apps domain suffixes shared across the iframe app.
 *
 * This is the single source of truth for the domain allowlist used by the
 * security-sensitive checks in this app:
 * - Agent card URL validation (`config-parser.ts`)
 * - EasyAuth login popup URL validation (`authHandler.ts`)
 *
 * Keep both consumers pointed at this constant so the allowlists can never
 * drift apart (which could reintroduce a security gap or break login).
 */
export const ALLOWED_LOGIC_APPS_DOMAINS = ['.logic.azure.com', '.logic-apps.azure.com'];
