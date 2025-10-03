# Multi-Platform Docker Build Guide

## Overview

This container now uses **Docker buildx** to create multi-platform images that work seamlessly on both Intel/AMD and ARM architectures.

## What Changed?

### Before (Single Platform)
- Built only for `linux/amd64`
- ARM users got platform mismatch warnings
- Slower performance on Apple Silicon due to emulation

### After (Multi-Platform)
- Builds for **both** `linux/amd64` and `linux/arm64`
- Single image tag works everywhere
- Native performance on all platforms
- No platform warnings

## Technical Details

### Docker Buildx

Docker buildx is a CLI plugin that extends Docker's build capabilities with:
- Multi-platform image builds
- BuildKit backend for improved performance
- Manifest lists to support multiple architectures

### Image Manifest

When you build with multiple platforms, Docker creates a **manifest list** containing:
```
carloscastrotrejo/logicapps-dev:v2.0.0
├── linux/amd64
│   └── [image layers for Intel/AMD]
└── linux/arm64
    └── [image layers for ARM]
```

### How Users Pull Images

When someone runs:
```bash
docker pull carloscastrotrejo/logicapps-dev:v2.0.0
```

Docker:
1. Fetches the manifest list
2. Identifies the user's platform (e.g., `linux/arm64` on Apple Silicon)
3. Downloads only the matching architecture
4. Stores it locally

**The user never needs to specify `--platform`!**

## Build Script Changes

### Old Approach
```bash
docker build --platform linux/amd64 -t image:tag .
docker push image:tag
```

### New Approach
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

## Key Differences

| Aspect | Single Platform | Multi-Platform |
|--------|----------------|----------------|
| Build time | ~2-3 minutes | ~5-8 minutes |
| Push method | `docker push` | Built into `buildx build --push` |
| Local testing | Image stored locally | Must pull from registry |
| Platforms | One architecture | Both amd64 + arm64 |
| Tag management | Manual tagging | Can specify multiple tags in one build |

## Why `--push` is Required

With multi-platform builds:
- Images are built in the buildx cache, not loaded locally
- You can't use `docker images` to see them
- Must push directly to registry with `--push` flag
- To test locally, pull the image back: `docker pull carloscastrotrejo/logicapps-dev:test`

## Verification Commands

### Check what platforms are available
```bash
docker buildx imagetools inspect carloscastrotrejo/logicapps-dev:v2.0.0
```

Output shows:
```
MediaType: application/vnd.docker.distribution.manifest.list.v2+json
Digest:    sha256:abc123...
  
Manifests:
  Name:      carloscastrotrejo/logicapps-dev:v2.0.0@sha256:xyz789...
  MediaType: application/vnd.docker.distribution.manifest.v2+json
  Platform:  linux/amd64
  
  Name:      carloscastrotrejo/logicapps-dev:v2.0.0@sha256:def456...
  MediaType: application/vnd.docker.distribution.manifest.v2+json
  Platform:  linux/arm64
```

### Check what platform you pulled locally
```bash
docker image inspect carloscastrotrejo/logicapps-dev:v2.0.0 | grep -A 3 "Architecture"
```

Output on Apple Silicon:
```json
"Architecture": "arm64",
"Os": "linux",
```

## Best Practices

### 1. **Always Use Versioned Tags**
```bash
./build-and-push.sh v2.0.0  # Good
./build-and-push.sh latest  # OK but less traceable
```

### 2. **Test Both Platforms**
After pushing, test on different architectures:
```bash
# On Intel Mac/PC
docker pull --platform linux/amd64 carloscastrotrejo/logicapps-dev:v2.0.0
docker run --rm -it carloscastrotrejo/logicapps-dev:v2.0.0 func --version

# On Apple Silicon
docker pull --platform linux/arm64 carloscastrotrejo/logicapps-dev:v2.0.0
docker run --rm -it carloscastrotrejo/logicapps-dev:v2.0.0 func --version
```

### 3. **Monitor Build Times**
Multi-platform builds take longer:
- First build: ~8-10 minutes (downloading base layers)
- Subsequent builds: ~3-5 minutes (with cache)

### 4. **Keep Buildx Builder Updated**
Periodically recreate the builder for latest features:
```bash
docker buildx rm multiplatform-builder
docker buildx create --name multiplatform-builder --use
docker buildx inspect --bootstrap
```

## Troubleshooting

### "no builder selected" error
```bash
docker buildx create --name multiplatform-builder --use
docker buildx inspect --bootstrap
```

### Build is very slow
- First build downloads base images for both platforms
- Enable Docker BuildKit caching
- Check internet connection speed

### Can't find image locally after build
- Multi-platform builds don't load locally by default
- Pull the image: `docker pull carloscastrotrejo/logicapps-dev:v2.0.0`
- Or build single-platform for testing: `docker build -t test .`

### Platform mismatch after multi-platform build
- Shouldn't happen! The manifest list handles this
- Verify manifest: `docker buildx imagetools inspect image:tag`
- Re-pull the image: `docker pull --rm image:tag && docker pull image:tag`

## Cost Considerations

### Build Time
- ~2x longer due to building twice (once per platform)
- Can be parallelized in CI/CD with separate jobs

### Storage
- Docker Hub storage roughly doubles (two platform images)
- Free tier: 1 private repo + unlimited public repos
- Public repos have unlimited storage

### Bandwidth
- Users only download their platform (same as before)
- Total registry bandwidth: ~2x (but spread across platforms)

## Advanced: Adding More Platforms

To support additional platforms:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  -t image:tag \
  --push \
  .
```

Common platforms:
- `linux/amd64` - Intel/AMD 64-bit (most servers, PCs)
- `linux/arm64` - ARM 64-bit (Apple Silicon, ARM servers)
- `linux/arm/v7` - ARM 32-bit (Raspberry Pi, IoT)
- `linux/386` - Intel 32-bit (legacy)

## References

- [Docker Buildx Documentation](https://docs.docker.com/buildx/working-with-buildx/)
- [Multi-platform Images](https://docs.docker.com/build/building/multi-platform/)
- [Docker Manifest Lists](https://docs.docker.com/registry/spec/manifest-v2-2/)
- [BuildKit](https://github.com/moby/buildkit)
