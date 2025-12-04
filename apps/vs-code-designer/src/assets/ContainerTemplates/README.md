# Logic Apps Development Container

This directory contains the Docker configuration for the Logic Apps Standard Development container.

## 📦 What's Inside

**Current Image Configuration:**
- **Base Image**: `mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm`
- **Node.js**: 22 (Debian Bookworm)
- **.NET SDK**: 8.0 & 6.0
- **Functions Core Tools**: 4.2.2
- **Extension Bundle**: 1.131.9
- **Platforms**: `linux/amd64`, `linux/arm64`

**Docker Hub:**
- **Repository**: `carloscastrotrejo/logicapps-dev`
- **URL**: https://hub.docker.com/r/carloscastrotrejo/logicapps-dev

---

## 🔄 How It Works: Complete Execution Flow

Understanding how Dockerfile,  and devcontainer.json work together:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. BUILD PHASE (One-time or when Dockerfile changes)        │
└─────────────────────────────────────────────────────────────┘
    │
    ├─> Dockerfile executes line by line
    │   ├─> FROM: Pull base image (Node.js 22 Debian)
    │   ├─> RUN: Install OS packages
    │   ├─> RUN: Install .NET SDK 8.0 & 6.0
    │   ├─> RUN: Download Extension Bundle
    │   ├─> RUN: Download & install Functions Core Tools
    │   └─> ENV: Set environment variables (PATH, DOTNET_ROOT)
    │
    └─> Output: Docker image ready to use
        ✅ Node.js 22
        ✅ .NET SDK 8.0 & 6.0
        ✅ Functions Core Tools 4.2.2
        ✅ Extension Bundle 1.131.9

┌─────────────────────────────────────────────────────────────┐
│ 2. DEVCONTAINER PHASE (When VS Code connects)               │
└─────────────────────────────────────────────────────────────┘
    │
    ├─> devcontainer.json applies
    │   ├─> Install features (Azure CLI, PowerShell)
    │   ├─> Install VS Code extensions
    │   ├─> Apply VS Code settings
    │   └─> Run postStartCommand (start Azurite)
    │
    └─> Development environment ready! 🎉
        ✅ All tools from Dockerfile (Node, .NET, func)
        ✅ Azure CLI & PowerShell installed
        ✅ VS Code extensions loaded
        ✅ Azurite running
```

### ⚡ Key Points

- **Dockerfile** = Heavy, slow installations (cached in image)
- **devcontainer.json** = Quick dev tools & VS Code customization

### 📊 What Gets Installed Where

| Component | Where | Why |
|-----------|-------|-----|
| **.NET SDK 8.0 & 6.0** | Dockerfile | Slow to install, rarely changes |
| **Functions Core Tools** | Dockerfile | Core dependency, specific version |
| **Extension Bundle** | Dockerfile | Large download, rarely changes |
| **Azure CLI** | devcontainer.json | Quick install, dev-only tool |
| **PowerShell + Az** | devcontainer.json | Quick install, dev-only tool |
| **VS Code Extensions** | devcontainer.json | User-specific preferences |

---

## 🌐 Multi-Platform Support

The image is built using **Docker buildx** to create multi-platform images that work seamlessly on both Intel/AMD and ARM architectures.

### Benefits

✅ **Automatic Detection** - Docker pulls the correct architecture for your platform  
✅ **Better Performance** - Native execution on both Intel and ARM processors  
✅ **No Platform Warnings** - Eliminates "platform mismatch" warnings  
✅ **Single Image Tag** - One tag works for all platforms

### Platform Detection

- **Intel/AMD Macs & PCs**: Automatically pulls `linux/amd64`
- **Apple Silicon (M1/M2/M3)**: Automatically pulls `linux/arm64`
- **ARM Servers**: Automatically pulls `linux/arm64`

**No need to specify `--platform` - Docker handles it automatically!**

---

## 🚀 For Developers: Using the Image

### Pull the Pre-Built Image

```bash
# Pull latest version (auto-detects your platform)
docker pull carloscastrotrejo/logicapps-dev:latest

# Pull specific version
docker pull carloscastrotrejo/logicapps-dev:v1.0.0

# Verify the platform
docker image inspect carloscastrotrejo/logicapps-dev:latest | grep Architecture
```

### Use with Dev Containers

Your `devcontainer.json` is already configured to build locally. To use the pre-built image instead:

```json
{
  "name": "Logic Apps Standard Development",
  "image": "carloscastrotrejo/logicapps-dev:latest",
  "workspaceFolder": "/workspaces/${localWorkspaceFolderBasename}",
  "features": {
    "ghcr.io/devcontainers/features/azure-cli:1": {
      "version": "latest"
    },
    "ghcr.io/devcontainers/features/powershell:1": {
      "version": "latest",
      "modules": "Az"
    }
  }
  // ... rest of your config
}
```
---

## 🛠️ For Maintainers: Building & Publishing

### Prerequisites

1. Docker Desktop installed and running
2. Docker Hub account
3. Logged in:
   ```bash
   docker login
   ```

### Quick Build & Push

Use the provided script:

```bash
# Push as latest
./build-and-push.sh

# Push with specific version
./build-and-push.sh v1.0.0

# Push matching Extension Bundle version
./build-and-push.sh 1.131.9
```

The script automatically:
1. Verifies Docker is running
2. Checks Docker Hub authentication
3. Sets up Docker buildx for multi-platform builds
4. Builds for **both amd64 and arm64** architectures
5. Pushes to Docker Hub

**Build Time:** 
- First build: ~8-10 minutes (downloading base layers)
- Subsequent builds: ~3-5 minutes (with cache)

### Manual Build (Advanced)

```bash
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

### Single Platform Build (Testing)

For faster local testing:

```bash
# Build only for your current platform
docker build -t carloscastrotrejo/logicapps-dev:test .

# Or specify a platform
docker build --platform linux/amd64 -t carloscastrotrejo/logicapps-dev:test .
```

### Verify Published Image

```bash
# Inspect image details (shows supported platforms)
docker buildx imagetools inspect carloscastrotrejo/logicapps-dev:latest

# Check locally pulled platform
docker image inspect carloscastrotrejo/logicapps-dev:latest | grep -A 3 "Architecture"
```

---

## 🔢 Version Management

### Versioning Strategy

Use semantic versioning aligned with the Extension Bundle version:

```bash
./build-and-push.sh 1.131.9   # Matches EXTENSION_BUNDLE_VERSION
./build-and-push.sh v1.131.9  # With 'v' prefix
./build-and-push.sh latest    # Latest tag only
```

### Updating the Image

When updating versions:

1. **Update `Dockerfile`** with new versions (Extension Bundle, Core Tools, .NET)
2. **Update this README** with new version numbers
3. **Build and push**:
   ```bash
   ./build-and-push.sh 1.132.0
   ```
4. **Notify team** to pull the latest image

---

## 🛠️ Troubleshooting

### Not Logged In
```bash
docker login
```

### "no builder selected" Error
```bash
docker buildx create --name multiplatform-builder --use
docker buildx inspect --bootstrap
```

### Build Fails
```bash
# Check Docker is running
docker info

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

### Can't Find Image Locally After Build
Multi-platform builds don't load locally by default. Pull the image:
```bash
docker pull carloscastrotrejo/logicapps-dev:v1.0.0
```

### Build is Slow
- First build downloads base images for both platforms (8-10 minutes)
- Subsequent builds use cache (3-5 minutes)
- Check internet connection speed

---

## 🎯 Best Practices

### 1. Use Versioned Tags
```bash
./build-and-push.sh v2.0.0  # Good - traceable
./build-and-push.sh 1.131.9 # Good - matches Extension Bundle
./build-and-push.sh latest  # Less traceable
```

### 2. Test Both Platforms
```bash
# Test amd64
docker pull --platform linux/amd64 carloscastrotrejo/logicapps-dev:v2.0.0
docker run --rm -it carloscastrotrejo/logicapps-dev:v2.0.0 func --version
docker run --rm -it carloscastrotrejo/logicapps-dev:v2.0.0 dotnet --version

# Test arm64
docker pull --platform linux/arm64 carloscastrotrejo/logicapps-dev:v2.0.0
docker run --rm -it carloscastrotrejo/logicapps-dev:v2.0.0 func --version
docker run --rm -it carloscastrotrejo/logicapps-dev:v2.0.0 dotnet --version
```

### 3. Keep Builder Updated
Periodically recreate the builder:
```bash
docker buildx rm multiplatform-builder
docker buildx create --name multiplatform-builder --use
docker buildx inspect --bootstrap
```

---

## 📚 References

- [Docker Buildx Documentation](https://docs.docker.com/buildx/working-with-buildx/)
- [Multi-platform Images Guide](https://docs.docker.com/build/building/multi-platform/)
- [Azure Functions Core Tools](https://github.com/Azure/azure-functions-core-tools)
- [Docker Hub Repository](https://hub.docker.com/r/carloscastrotrejo/logicapps-dev)