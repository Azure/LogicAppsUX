#!/bin/bash

# Build and Push Docker Image to Docker Hub
# This script builds the Logic Apps Standard Development container and pushes it to Docker Hub

set -e

# Configuration
DOCKER_USERNAME="carloscastrotrejo"
DOCKER_REPO="logicapps-dev"
DOCKER_IMAGE="${DOCKER_USERNAME}/${DOCKER_REPO}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default version (can be overridden with command line argument)
VERSION="${1:-latest}"

echo "=================================="
echo "Docker Image Build & Push Script"
echo "=================================="
echo "Repository: ${DOCKER_IMAGE}"
echo "Version: ${VERSION}"
echo "Build Context: ${SCRIPT_DIR}"
echo "=================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if logged into Docker Hub
echo "Checking Docker Hub authentication..."
if ! docker info | grep -q "Username: ${DOCKER_USERNAME}"; then
    echo "⚠️  Not logged into Docker Hub. Attempting login..."
    docker login
    if [ $? -ne 0 ]; then
        echo "❌ Docker Hub login failed. Please run 'docker login' manually."
        exit 1
    fi
fi

echo "✅ Docker Hub authentication verified"
echo ""

# Setup buildx for multi-platform builds
echo "🔧 Setting up Docker buildx for multi-platform build..."
# Create a new builder instance if it doesn't exist
if ! docker buildx inspect multiplatform-builder > /dev/null 2>&1; then
    echo "Creating new buildx builder 'multiplatform-builder'..."
    docker buildx create --name multiplatform-builder --use
else
    echo "Using existing buildx builder 'multiplatform-builder'..."
    docker buildx use multiplatform-builder
fi

# Bootstrap the builder (downloads necessary components)
docker buildx inspect --bootstrap

echo "✅ Buildx ready for multi-platform build"
echo ""

# Build and push multi-platform image
echo "🔨 Building multi-platform Docker image (linux/amd64, linux/arm64)..."
echo "Command: docker buildx build --platform linux/amd64,linux/arm64 -t ${DOCKER_IMAGE}:${VERSION} --push ${SCRIPT_DIR}"
echo ""
echo "⏳ This may take several minutes as it builds for multiple architectures..."
echo ""

docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -t "${DOCKER_IMAGE}:${VERSION}" \
    --push \
    "${SCRIPT_DIR}"

if [ $? -ne 0 ]; then
    echo "❌ Docker buildx build failed!"
    exit 1
fi

echo ""
echo "✅ Multi-platform image built and pushed successfully"
echo ""

# Tag as latest if version is not "latest"
if [ "${VERSION}" != "latest" ]; then
    echo "🏷️  Building and pushing 'latest' tag..."
    docker buildx build \
        --platform linux/amd64,linux/arm64 \
        -t "${DOCKER_IMAGE}:latest" \
        --push \
        "${SCRIPT_DIR}"
    echo "✅ Tagged and pushed as latest"
    echo ""
fi

if [ $? -ne 0 ]; then
    echo "❌ Multi-platform build/push failed!"
    exit 1
fi

echo ""
echo "=================================="
echo "✅ Successfully pushed to Docker Hub!"
echo "=================================="
echo ""
echo "Your multi-platform image is now available at:"
echo "  - ${DOCKER_IMAGE}:${VERSION}"
if [ "${VERSION}" != "latest" ]; then
    echo "  - ${DOCKER_IMAGE}:latest"
fi
echo ""
echo "Supported platforms:"
echo "  - linux/amd64 (Intel/AMD processors)"
echo "  - linux/arm64 (Apple Silicon, ARM servers)"
echo ""
echo "Others can pull it with:"
echo "  docker pull ${DOCKER_IMAGE}:${VERSION}"
if [ "${VERSION}" != "latest" ]; then
    echo "  docker pull ${DOCKER_IMAGE}:latest"
fi
echo ""
echo "Docker will automatically pull the correct architecture for their platform!"
echo ""
echo "To use in devcontainer.json, update the 'image' field:"
echo "  \"image\": \"${DOCKER_IMAGE}:${VERSION}\""
echo "=================================="
