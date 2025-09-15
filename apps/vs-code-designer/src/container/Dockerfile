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

RUN find /.${EXTENSION_BUNDLE_FOLDER_PATH}/ -type f -exec chmod 755 {} \;

ARG FUNCTIONS_CORE_TOOLS_VERSION=4.2.2
ARG FUNCTIONS_CORE_TOOLS_OS_PLATFORM=linux
ARG FUNCTIONS_CORE_TOOLS_ARCH=x64
ARG FUNCTIONS_CORE_TOOLS_FOLDER_PATH=.azurelogicapps/dependencies/FuncCoreTools

RUN echo "Downloading Azure Functions Core Tools version: $FUNCTIONS_CORE_TOOLS_VERSION" && \
    FUNCTIONS_CORE_TOOLS_FILENAME=Azure.Functions.Cli.${FUNCTIONS_CORE_TOOLS_OS_PLATFORM}-${FUNCTIONS_CORE_TOOLS_ARCH}.${FUNCTIONS_CORE_TOOLS_VERSION}.zip && \
    wget https://github.com/Azure/azure-functions-core-tools/releases/download/${FUNCTIONS_CORE_TOOLS_VERSION}/$FUNCTIONS_CORE_TOOLS_FILENAME && \
    mkdir -p /.${FUNCTIONS_CORE_TOOLS_FOLDER_PATH}/ && \
    unzip /$FUNCTIONS_CORE_TOOLS_FILENAME -d /.${FUNCTIONS_CORE_TOOLS_FOLDER_PATH}/ && \
    rm -f /$FUNCTIONS_CORE_TOOLS_FILENAME

RUN chmod -R 755 /.${FUNCTIONS_CORE_TOOLS_FOLDER_PATH}/ && \
    chmod 755 /.${FUNCTIONS_CORE_TOOLS_FOLDER_PATH}/func