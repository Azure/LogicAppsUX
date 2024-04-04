# Development with standalone


```bash
pnpm turbo run dev
```
The first time this is run, MKCert may ask for your password. This is for SSL setup

Changes in any library should hot reload

## Direct development against live APIs

For this you will need to have Azure CLI install


```bash
pnpm run generateArmToken
pnpm turbo run dev
```