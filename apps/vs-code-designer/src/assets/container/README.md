# Docker Container Build & Push Guide

This directory contains the Docker configuration for the Logic Apps Standard Development container.

## 📦 Repository Information

- **Docker Hub Repository**: `carloscastrotrejo/logicapps-dev`
- **Public URL**: https://hub.docker.com/r/carloscastrotrejo/logicapps-dev
- **Supported Platforms**: 
  - `linux/amd64` (Intel/AMD processors)
  - `linux/arm64` (Apple Silicon M1/M2/M3, ARM servers)

## 🌐 Multi-Platform Support

The image is built using **Docker buildx** to create multi-platform images that work seamlessly on both Intel/AMD and ARM architectures. When users pull the image, Docker automatically downloads the correct architecture for their platform - no manual selection needed!

### Benefits

✅ **Single Image Tag**: One tag (e.g., `v1.0.0`) works for all platforms  
✅ **Automatic Detection**: Docker automatically pulls the right architecture  
✅ **Better Performance**: Native execution on both Intel and ARM processors  
✅ **No Platform Warnings**: Eliminates "platform mismatch" warnings  
✅ **Future-Proof**: Ready for ARM-based cloud infrastructure

### How It Works

Docker buildx creates a **manifest list** containing images for multiple architectures:

```
carloscastrotrejo/logicapps-dev:v2.0.0
├── linux/amd64
│   └── [image layers for Intel/AMD]
└── linux/arm64
    └── [image layers for ARM]
```

When you run:
```bash
docker pull carloscastrotrejo/logicapps-dev:latest
```

Docker:
1. Fetches the manifest list
2. Identifies your system architecture (e.g., `linux/arm64` on Apple Silicon)
3. Downloads only the matching architecture
4. Stores it locally

**The user never needs to specify `--platform`!**

### What Changed from Single Platform?

| Aspect | Before (Single Platform) | After (Multi-Platform) |
|--------|--------------------------|------------------------|
| Platforms | Only `linux/amd64` | Both `amd64` + `arm64` |
| ARM Performance | Emulation (slow) | Native (fast) |
| Warnings | Platform mismatch warnings | No warnings |
| Build time | ~2-3 minutes | ~5-8 minutes |
| Push method | `docker push` | Built into `buildx build --push` |
| Local testing | Image stored locally | Must pull from registry |

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
3. 🔧 Setup Docker buildx for multi-platform builds
4. 🔨 Build the image for **both amd64 and arm64** architectures
5. 🚀 Push to Docker Hub with manifest supporting both platforms

**Note**: Multi-platform builds take longer (5-8 minutes) because they build for multiple architectures. First build may take 8-10 minutes while downloading base layers.

### Understanding Docker Buildx

Docker buildx is a CLI plugin that extends Docker's build capabilities with:
- **Multi-platform image builds** - Build for multiple architectures simultaneously
- **BuildKit backend** - Improved performance and caching
- **Manifest lists** - Single tag supports multiple architectures

### Why `--push` is Required

With multi-platform builds:
- Images are built in the buildx cache, not loaded locally
- You can't use `docker images` to see them immediately
- Must push directly to registry with `--push` flag
- To test locally, pull the image back: `docker pull carloscastrotrejo/logicapps-dev:test`

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

### Build Script Changes Explained

**Old single-platform approach:**
```bash
docker build --platform linux/amd64 -t image:tag .
docker push image:tag
```

**New multi-platform approach:**
```bash
# Setup buildx builder (one-time)
docker buildx create --name multiplatform-builder --use
docker buildx inspect --bootstrap

# Build and push for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t image:tag \
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
```

**Example output showing both platforms:**
```
MediaType: application/vnd.docker.distribution.manifest.list.v2+json
Digest:    sha256:abc123...
  
Manifests:
  Name:      carloscastrotrejo/logicapps-dev:latest@sha256:xyz789...
  MediaType: application/vnd.docker.distribution.manifest.v2+json
  Platform:  linux/amd64
  
  Name:      carloscastrotrejo/logicapps-dev:latest@sha256:def456...
  MediaType: application/vnd.docker.distribution.manifest.v2+json
  Platform:  linux/arm64
```

```bash
# Check what platform you pulled locally
docker image inspect carloscastrotrejo/logicapps-dev:latest | grep -A 3 "Architecture"
```

**Output on Apple Silicon:**
```json
"Architecture": "arm64",
"Os": "linux",
```

Or visit: https://hub.docker.com/r/carloscastrotrejo/logicapps-dev/tags

On Docker Hub, you'll see both architectures listed for each tag.

## 🛠️ Troubleshooting

### Not Logged In
```bash
docker login
# Enter your Docker Hub credentials
```

### "no builder selected" error
```bash
docker buildx create --name multiplatform-builder --use
docker buildx inspect --bootstrap
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

### Build is Very Slow
- First build downloads base images for both platforms (8-10 minutes)
- Subsequent builds use cache (3-5 minutes)
- Enable Docker BuildKit caching
- Check internet connection speed

### Can't Find Image Locally After Build
- Multi-platform builds don't load locally by default
- Pull the image: `docker pull carloscastrotrejo/logicapps-dev:v2.0.0`
- Or build single-platform for testing: `docker build -t test .`

### Push Fails
```bash
# Verify authentication
docker login

# Check image exists locally
docker images carloscastrotrejo/logicapps-dev

# Try pushing again
docker push carloscastrotrejo/logicapps-dev:latest
```

### Platform Mismatch After Multi-Platform Build
- Shouldn't happen! The manifest list handles this automatically
- Verify manifest: `docker buildx imagetools inspect image:tag`
- Re-pull the image: `docker pull --rm image:tag && docker pull image:tag`

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

## 📊 Image Size & Performance Optimization

### Current Optimization
- Multi-stage build patterns where possible
- Combined RUN commands to minimize layers
- Cleaned up apt cache to reduce size
- Consider using `.dockerignore` if building from a larger context

### Cost Considerations

#### Build Time
- ~2x longer due to building twice (once per platform)
- First build: ~8-10 minutes (downloading base layers)
- Subsequent builds: ~3-5 minutes (with cache)
- Can be parallelized in CI/CD with separate jobs

#### Storage
- Docker Hub storage roughly doubles (two platform images)
- Free tier: 1 private repo + unlimited public repos
- Public repos have unlimited storage

#### Bandwidth
- Users only download their platform (same as before)
- Total registry bandwidth: ~2x (but spread across platforms)

## 🎯 Best Practices

### 1. Always Use Versioned Tags
```bash
./build-and-push.sh v2.0.0  # Good - traceable
./build-and-push.sh 1.131.9 # Good - matches Extension Bundle version
./build-and-push.sh latest  # OK but less traceable
```

### 2. Test Both Platforms
After pushing, test on different architectures:
```bash
# On Intel Mac/PC
docker pull --platform linux/amd64 carloscastrotrejo/logicapps-dev:v2.0.0
docker run --rm -it carloscastrotrejo/logicapps-dev:v2.0.0 func --version

# On Apple Silicon
docker pull --platform linux/arm64 carloscastrotrejo/logicapps-dev:v2.0.0
docker run --rm -it carloscastrotrejo/logicapps-dev:v2.0.0 func --version
```

### 3. Monitor Build Times
- Multi-platform builds take longer than single-platform
- Use BuildKit caching for faster subsequent builds
- Consider separating test builds from production builds

### 4. Keep Buildx Builder Updated
Periodically recreate the builder for latest features:
```bash
docker buildx rm multiplatform-builder
docker buildx create --name multiplatform-builder --use
docker buildx inspect --bootstrap
```

## 🔐 Security Notes

- Image is based on official Microsoft DevContainer images
- Uses official Azure Functions Core Tools releases
- Extension bundles are downloaded from official Azure CDN
- Keep versions updated for security patches

## 🚀 Advanced: Adding More Platforms

To support additional platforms beyond amd64 and arm64:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  -t carloscastrotrejo/logicapps-dev:v2.0.0 \
  --push \
  .
```

### Common Platforms

- `linux/amd64` - Intel/AMD 64-bit (most servers, PCs)
- `linux/arm64` - ARM 64-bit (Apple Silicon, ARM servers)
- `linux/arm/v7` - ARM 32-bit (Raspberry Pi, IoT devices)
- `linux/386` - Intel 32-bit (legacy systems)

## 📚 References

- [Docker Buildx Documentation](https://docs.docker.com/buildx/working-with-buildx/)
- [Multi-platform Images Guide](https://docs.docker.com/build/building/multi-platform/)
- [Docker Manifest Lists Specification](https://docs.docker.com/registry/spec/manifest-v2-2/)
- [BuildKit Documentation](https://github.com/moby/buildkit)
- [Azure Functions Core Tools](https://github.com/Azure/azure-functions-core-tools)

---

## 📖 Additional Documentation

For more detailed information about the multi-platform implementation, see the original migration notes in git history.
