# Docker Container Build & Push Guide

This directory contains the Docker configuration for the Logic Apps Standard Development container.

## 📦 Repository Information

- **Docker Hub Repository**: `carloscastrotrejo/logicapps-dev`
- **Public URL**: https://hub.docker.com/r/carloscastrotrejo/logicapps-dev

## 🚀 Quick Start - Build & Push

### Prerequisites

1. Docker Desktop installed and running
2. Docker Hub account (carloscastrotrejo)
3. Logged into Docker Hub:
   ```bash
   docker login
   ```

### Build and Push with Script

Use the provided script to build and push in one command:

```bash
# Push as latest
./build-and-push.sh

# Push with a specific version tag
./build-and-push.sh v1.0.0

# Push with semantic version
./build-and-push.sh 1.131.9
```

The script will:
1. ✅ Verify Docker is running
2. ✅ Check Docker Hub authentication
3. 🔨 Build the Docker image
4. 🏷️ Tag the image (both version + latest)
5. 🚀 Push to Docker Hub

## 📝 Manual Build & Push (Alternative)

If you prefer to run commands manually:

```bash
# Navigate to the container directory
cd apps/vs-code-designer/src/assets/container/

# Build the image
docker build -t carloscastrotrejo/logicapps-dev:v1.0.0 .

# Tag as latest
docker tag carloscastrotrejo/logicapps-dev:v1.0.0 carloscastrotrejo/logicapps-dev:latest

# Push both tags
docker push carloscastrotrejo/logicapps-dev:v1.0.0
docker push carloscastrotrejo/logicapps-dev:latest
```

## 🔢 Version Management

### Recommended Versioning Strategy

Use semantic versioning aligned with the Extension Bundle version:

```bash
# Format: MAJOR.MINOR.PATCH
./build-and-push.sh 1.131.9   # Matches EXTENSION_BUNDLE_VERSION

# Alternative formats:
./build-and-push.sh v1.131.9  # With 'v' prefix
./build-and-push.sh 1.0.0     # Simple semantic version
./build-and-push.sh latest    # Latest tag only
```

### Version Tracking

Current image configuration:
- **Extension Bundle Version**: 1.131.9
- **Functions Core Tools Version**: 4.2.2
- **Node Version**: 22 (bookworm)
- **Base Image**: `mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm`

When you update versions in the Dockerfile, update the image tag accordingly.

## 👥 For Team Members - Pulling the Image

Team members can pull and use the image in several ways:

### Option 1: Pull Directly

```bash
# Pull latest version
docker pull carloscastrotrejo/logicapps-dev:latest

# Pull specific version
docker pull carloscastrotrejo/logicapps-dev:v1.0.0
```

### Option 2: Use in devcontainer.json

Update your `devcontainer.json` to use the pre-built image instead of building locally:

**Before (building locally):**
```json
{
  "name": "Logic Apps Standard Development",
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/workspaces/${localWorkspaceFolderBasename}"
}
```

**After (using pre-built image):**
```json
{
  "name": "Logic Apps Standard Development",
  "image": "carloscastrotrejo/logicapps-dev:latest",
  "workspaceFolder": "/workspaces/${localWorkspaceFolderBasename}",
  "features": {
    // ... same features as before
  }
}
```

### Option 3: Update docker-compose.yml

Modify `docker-compose.yml` to use the pre-built image:

**Before:**
```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
```

**After:**
```yaml
services:
  app:
    image: carloscastrotrejo/logicapps-dev:latest
    # or use a specific version:
    # image: carloscastrotrejo/logicapps-dev:v1.0.0
```

## 🔍 Verify Published Image

Check your image on Docker Hub:

```bash
# View local images
docker images carloscastrotrejo/logicapps-dev

# Inspect image details
docker inspect carloscastrotrejo/logicapps-dev:latest

# View image history
docker history carloscastrotrejo/logicapps-dev:latest
```

Or visit: https://hub.docker.com/r/carloscastrotrejo/logicapps-dev/tags

## 🛠️ Troubleshooting

### Not Logged In
```bash
docker login
# Enter your Docker Hub credentials
```

### Build Fails
```bash
# Check Docker is running
docker info

# Clean up old images
docker system prune -a

# Rebuild without cache
docker build --no-cache -t carloscastrotrejo/logicapps-dev:v1.0.0 .
```

### Push Fails
```bash
# Verify authentication
docker login

# Check image exists locally
docker images carloscastrotrejo/logicapps-dev

# Try pushing again
docker push carloscastrotrejo/logicapps-dev:latest
```

## 📋 What's Included in the Image

- ✅ **Node.js 22** (Bookworm base)
- ✅ **Azure Functions Core Tools v4.2.2**
- ✅ **Extension Bundle for Workflows v1.131.9**
- ✅ **System dependencies**: ca-certificates, curl, jq, gnupg, wget, unzip
- ✅ **Runtime libraries**: libc6, libicu72, libgssapi-krb5-2, libkrb5-3, zlib1g
- ✅ **Configured paths** for `func` CLI

## 🔄 Updating the Image

When you need to update the image:

1. **Update the Dockerfile** with new versions (Extension Bundle, Core Tools, etc.)
2. **Increment the version** number
3. **Build and push**:
   ```bash
   ./build-and-push.sh 1.132.0  # New version
   ```
4. **Update documentation** (this README) with new version numbers
5. **Notify team** to pull the latest image

## 📊 Image Size Optimization Tips

- Current build uses multi-stage patterns where possible
- Cleans up apt cache to reduce size
- Combines RUN commands to minimize layers
- Consider using `.dockerignore` if building from a larger context

## 🔐 Security Notes

- Image is based on official Microsoft DevContainer images
- Uses official Azure Functions Core Tools releases
- Extension bundles are downloaded from official Azure CDN
- Keep versions updated for security patches
