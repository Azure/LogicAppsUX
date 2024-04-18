import { Buffer } from 'buffer';
import fs from 'fs';
// eslint-disable-next-line no-undef
const pat = process.env.ADO_TOKEN;
const b64Token = Buffer.from(pat.trim()).toString('base64');
const npmrc = `//msazure.pkgs.visualstudio.com/One/_packaging/microsoft-logic-apps/npm/registry/:username=msazure
//msazure.pkgs.visualstudio.com/One/_packaging/microsoft-logic-apps/npm/registry/:_password="${b64Token}"
//msazure.pkgs.visualstudio.com/One/_packaging/microsoft-logic-apps/npm/registry/:email=npm requires email to be set but doesn't use the value
//msazure.pkgs.visualstudio.com/One/_packaging/microsoft-logic-apps/npm/:username=msazure
//msazure.pkgs.visualstudio.com/One/_packaging/microsoft-logic-apps/npm/:_password="${b64Token}"
//msazure.pkgs.visualstudio.com/One/_packaging/microsoft-logic-apps/npm/:email=npm requires email to be set but doesn't use the value
registry=https://msazure.pkgs.visualstudio.com/One/_packaging/microsoft-logic-apps/npm/registry
always-auth=true
auto-install-peers=true
resolution-mode=highest
ignore-workspace-root-check=true`;

fs.writeFileSync('.npmrc', npmrc);
