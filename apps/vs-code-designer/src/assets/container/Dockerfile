FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm

# -----------------------------
# Extension bundle (Workflows)
# -----------------------------
ARG EXTENSION_BUNDLE_VERSION=1.131.9
ARG EXTENSION_BUNDLE_CDN_URL=https://functionscdn.azureedge.net/public
# NOTE: this folder name intentionally begins with a dot; don't prefix with "/."
ARG EXTENSION_BUNDLE_FOLDER_PATH=.azure-functions-core-tools/Functions/ExtensionBundles

# -----------------------------
# Azure Functions Core Tools
# -----------------------------
ARG FUNCTIONS_CORE_TOOLS_VERSION=4.2.2
ARG FUNCTIONS_CORE_TOOLS_OS_PLATFORM=linux
ARG FUNCTIONS_CORE_TOOLS_ARCH=x64
ARG FUNCTIONS_CORE_TOOLS_FOLDER_PATH=.azurelogicapps/dependencies/FuncCoreTools

# -----------------------------
# OS deps + install everything
# -----------------------------
RUN set -eux; \
    apt-get update; \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      ca-certificates curl jq gnupg wget unzip \
      libc6 libicu72 libgssapi-krb5-2 libkrb5-3 zlib1g; \
    rm -rf /var/lib/apt/lists/*

# -----------------------------
# Download & unpack extension bundle
# -----------------------------
RUN set -eux; \
    echo "Using extension bundle version: ${EXTENSION_BUNDLE_VERSION}"; \
    EXTENSION_BUNDLE_FILENAME="Microsoft.Azure.Functions.ExtensionBundle.Workflows.${EXTENSION_BUNDLE_VERSION}_any-any.zip"; \
    wget "${EXTENSION_BUNDLE_CDN_URL}/ExtensionBundles/Microsoft.Azure.Functions.ExtensionBundle.Workflows/${EXTENSION_BUNDLE_VERSION}/${EXTENSION_BUNDLE_FILENAME}" -O "/tmp/${EXTENSION_BUNDLE_FILENAME}"; \
    mkdir -p "/${EXTENSION_BUNDLE_FOLDER_PATH}/Microsoft.Azure.Functions.ExtensionBundle.Workflows/${EXTENSION_BUNDLE_VERSION}"; \
    unzip -q "/tmp/${EXTENSION_BUNDLE_FILENAME}" -d "/${EXTENSION_BUNDLE_FOLDER_PATH}/Microsoft.Azure.Functions.ExtensionBundle.Workflows/${EXTENSION_BUNDLE_VERSION}"; \
    rm -f "/tmp/${EXTENSION_BUNDLE_FILENAME}"; \
    find "/${EXTENSION_BUNDLE_FOLDER_PATH}/" -type f -exec chmod 644 {} \; ; \
    # ensure scripts/binaries inside the bundle stay executable if any
    find "/${EXTENSION_BUNDLE_FOLDER_PATH}/" -type f -name "*.sh" -exec chmod 755 {} \; || true

# -----------------------------
# Download & install Core Tools (func)
# -----------------------------
RUN set -eux; \
    echo "Downloading Azure Functions Core Tools version: ${FUNCTIONS_CORE_TOOLS_VERSION} for ${TARGETOS}/${TARGETARCH}"; \
    case "${TARGETARCH}" in \
      amd64) FUNC_ARCH="x64" ;; \
      arm64) FUNC_ARCH="arm64" ;; \
      *) echo "Unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    FILENAME="Azure.Functions.Cli.${TARGETOS}-${FUNC_ARCH}.${FUNCTIONS_CORE_TOOLS_VERSION}.zip"; \
    wget "https://github.com/Azure/azure-functions-core-tools/releases/download/${FUNCTIONS_CORE_TOOLS_VERSION}/${FILENAME}" -O "/tmp/${FILENAME}"; \
    mkdir -p "/${FUNCTIONS_CORE_TOOLS_FOLDER_PATH}"; \
    unzip -q "/tmp/${FILENAME}" -d "/${FUNCTIONS_CORE_TOOLS_FOLDER_PATH}"; \
    rm -f "/tmp/${FILENAME}"; \
    chmod -R a+rX "/${FUNCTIONS_CORE_TOOLS_FOLDER_PATH}"; \
    for executable in func gozip in-proc8/func in-proc6/func; do \
      if [ -f "/${FUNCTIONS_CORE_TOOLS_FOLDER_PATH}/${executable}" ]; then chmod 755 "/${FUNCTIONS_CORE_TOOLS_FOLDER_PATH}/${executable}"; fi; \
    done; \
    ln -sf "/${FUNCTIONS_CORE_TOOLS_FOLDER_PATH}/func" /usr/local/bin/func; \
    ln -sf "/${FUNCTIONS_CORE_TOOLS_FOLDER_PATH}/func" /usr/bin/func

# -----------------------------
# Verify CLI is on PATH
# -----------------------------
RUN set -eux; \
    which func; \
    func --version

# Ensure Core Tools are discoverable for all users
ENV PATH=/${FUNCTIONS_CORE_TOOLS_FOLDER_PATH}:$PATH
