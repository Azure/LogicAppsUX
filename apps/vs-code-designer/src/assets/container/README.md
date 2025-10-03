# Docker Container Build & Push Guide

This directory contains the Docker configuration for the Logic Apps Standard Development container.

## 📦 Repository Information

- **Docker Hub Repository**: `carloscastrotrejo/logicapps-dev`
- **Public URL**: https://hub.docker.com/r/carloscastrotrejo/logicapps-dev
- **Supported Platforms**: 
  - `linux/amd64` (Intel/AMD processors)
  - `linux/arm64` (Apple Silicon M1/M2/M3, ARM servers)

## 🌐 Multi-Platform Support

The image is built using **Docker buildx** to support multiple architectures in a single image manifest. When users pull the image, Docker automatically downloads the correct architecture for their platform - no manual selection needed!

### Benefits

✅ **Single Image Tag**: One tag (e.g., `v1.0.0`) works for all platforms  
✅ **Automatic Detection**: Docker automatically pulls the right architecture  
✅ **Better Performance**: Native execution on both Intel and ARM processors  
✅ **No Platform Warnings**: Eliminates "platform mismatch" warnings  
✅ **Future-Proof**: Ready for ARM-based cloud infrastructure

### How It Works

When you run:
```bash
docker pull carloscastrotrejo/logicapps-dev:latest
```

Docker:
1. Checks your system architecture
2. Downloads the matching image (amd64 or arm64)
3. No `--platform` flag needed!

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
3. � Setup Docker buildx for multi-platform builds
4. 🔨 Build the image for **both amd64 and arm64** architectures
5. 🚀 Push to Docker Hub with manifest supporting both platforms

**Note**: Multi-platform builds take longer (several minutes) because they build for multiple architectures.

## 📝 Manual Build & Push (Alternative)

If you prefer to run commands manually with multi-platform support:

```bash
# Navigate to the container directory
cd apps/vs-code-designer/src/assets/container/

# Create and use buildx builder (first time only)
docker buildx create --name multiplatform-builder --use
docker buildx inspect --bootstrap

# Build for multiple platforms and push
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t carloscastrotrejo/logicapps-dev:v1.0.0 \
  -t carloscastrotrejo/logicapps-dev:latest \
  --push \
  .
```

### Single Platform Build (Faster for Testing)

For faster local testing, you can build for just your platform:

```bash
# Build only for your current platform
docker build -t carloscastrotrejo/logicapps-dev:test .

# Or specify a platform
docker build --platform linux/amd64 -t carloscastrotrejo/logicapps-dev:test .
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

Team members can pull and use the image in several ways. **Docker automatically detects and pulls the correct architecture** for their platform!

### Option 1: Pull Directly

```bash
# Pull latest version (auto-detects your platform)
docker pull carloscastrotrejo/logicapps-dev:latest

# Pull specific version
docker pull carloscastrotrejo/logicapps-dev:v1.0.0

# Verify the platform
docker image inspect carloscastrotrejo/logicapps-dev:latest | grep Architecture
```

### Platform Detection

- **Intel/AMD Macs & PCs**: Automatically pulls `linux/amd64`
- **Apple Silicon (M1/M2/M3)**: Automatically pulls `linux/arm64`
- **ARM Servers**: Automatically pulls `linux/arm64`

No need to specify `--platform` - Docker handles it automatically!

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

Check your multi-platform image on Docker Hub:

```bash
# View local images
docker images carloscastrotrejo/logicapps-dev

# Inspect image details (shows supported platforms)
docker buildx imagetools inspect carloscastrotrejo/logicapps-dev:latest

# This will show both platforms:
# - linux/amd64
# - linux/arm64

# Check what platform you pulled locally
docker image inspect carloscastrotrejo/logicapps-dev:latest | grep -A 3 "Architecture"
```

Or visit: https://hub.docker.com/r/carloscastrotrejo/logicapps-dev/tags

On Docker Hub, you'll see both architectures listed for each tag.

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

# Ensure buildx is available
docker buildx version

# Clean up and recreate builder
docker buildx rm multiplatform-builder
docker buildx create --name multiplatform-builder --use
docker buildx inspect --bootstrap

# Rebuild without cache
docker buildx build --no-cache \
  --platform linux/amd64,linux/arm64 \
  -t carloscastrotrejo/logicapps-dev:v1.0.0 \
  --push \
  .
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
