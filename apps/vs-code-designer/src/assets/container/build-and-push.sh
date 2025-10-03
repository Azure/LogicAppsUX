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

# Build the Docker image
echo "🔨 Building Docker image for linux/amd64 platform..."
echo "Command: docker build --platform linux/amd64 -t ${DOCKER_IMAGE}:${VERSION} ${SCRIPT_DIR}"
docker build --platform linux/amd64 -t "${DOCKER_IMAGE}:${VERSION}" "${SCRIPT_DIR}"

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed!"
    exit 1
fi

echo "✅ Docker image built successfully"
echo ""

# Tag as latest if version is not "latest"
if [ "${VERSION}" != "latest" ]; then
    echo "🏷️  Tagging as latest..."
    docker tag "${DOCKER_IMAGE}:${VERSION}" "${DOCKER_IMAGE}:latest"
    echo "✅ Tagged as latest"
    echo ""
fi

# Show image info
echo "📦 Image information:"
docker images "${DOCKER_IMAGE}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
echo ""

# Push to Docker Hub
echo "🚀 Pushing to Docker Hub..."
echo "Pushing ${DOCKER_IMAGE}:${VERSION}..."
docker push "${DOCKER_IMAGE}:${VERSION}"

if [ "${VERSION}" != "latest" ]; then
    echo "Pushing ${DOCKER_IMAGE}:latest..."
    docker push "${DOCKER_IMAGE}:latest"
fi

if [ $? -ne 0 ]; then
    echo "❌ Docker push failed!"
    exit 1
fi

echo ""
echo "=================================="
echo "✅ Successfully pushed to Docker Hub!"
echo "=================================="
echo ""
echo "Your image is now available at:"
echo "  - ${DOCKER_IMAGE}:${VERSION}"
if [ "${VERSION}" != "latest" ]; then
    echo "  - ${DOCKER_IMAGE}:latest"
fi
echo ""
echo "Others can pull it with:"
echo "  docker pull ${DOCKER_IMAGE}:${VERSION}"
if [ "${VERSION}" != "latest" ]; then
    echo "  docker pull ${DOCKER_IMAGE}:latest"
fi
echo ""
echo "To use in devcontainer.json, update the 'image' field:"
echo "  \"image\": \"${DOCKER_IMAGE}:${VERSION}\""
echo "=================================="
