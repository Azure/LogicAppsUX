FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm

ARG EXTENSION_BUNDLE_VERSION=1.131.9
ARG EXTENSION_BUNDLE_CDN_URL=https://functionscdn.azureedge.net/public
ARG EXTENSION_BUNDLE_FOLDER_PATH=.azure-functions-core-tools/Functions/ExtensionBundles

RUN apt-get update && apt-get install -y curl jq gnupg wget unzip
RUN echo "Using version: $EXTENSION_BUNDLE_VERSION" && \
    EXTENSION_BUNDLE_FILENAME_V4=Microsoft.Azure.Functions.ExtensionBundle.Workflows.${EXTENSION_BUNDLE_VERSION}_any-any.zip && \
    wget $EXTENSION_BUNDLE_CDN_URL/ExtensionBundles/Microsoft.Azure.Functions.ExtensionBundle.Workflows/$EXTENSION_BUNDLE_VERSION/$EXTENSION_BUNDLE_FILENAME_V4 && \
    mkdir -p /.${EXTENSION_BUNDLE_FOLDER_PATH}/Microsoft.Azure.Functions.ExtensionBundle.Workflows/$EXTENSION_BUNDLE_VERSION && \
    unzip /$EXTENSION_BUNDLE_FILENAME_V4 -d /.${EXTENSION_BUNDLE_FOLDER_PATH}/Microsoft.Azure.Functions.ExtensionBundle.Workflows/$EXTENSION_BUNDLE_VERSION && \
    rm -f /$EXTENSION_BUNDLE_FILENAME_V4

RUN find /.${EXTENSION_BUNDLE_FOLDER_PATH}/ -type f -exec chmod 644 {} \;