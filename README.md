# Dichroic Glass

A React Three Fiber application that converts an image or webcam stream into a 64x64 mosaic of instanced dichroic glass panels.

## Local development

```bash
npm ci
npm run dev
```

Validate a production build with:

```bash
npm run lint
npm run build
```

## Container image

The public container image is available from the [GitHub Container Registry](https://github.com/AhmetErenLacinbala/dichroic-glass/pkgs/container/dichroic-glass):

```bash
docker pull ghcr.io/ahmeterenlacinbala/dichroic-glass:latest
```

The `.github/workflows/container.yml` workflow builds a multi-platform image after every push to `main` and publishes these tags:

- `ghcr.io/ahmeterenlacinbala/dichroic-glass:latest`
- `ghcr.io/ahmeterenlacinbala/dichroic-glass:main`
- `ghcr.io/ahmeterenlacinbala/dichroic-glass:sha-<commit>`

Pushing a tag such as `v1.2.3` also generates semantic-version tags. Pull requests are built for validation but are not pushed to the registry. Publishing uses GitHub's automatic `GITHUB_TOKEN`, so no additional registry secret is required.

## Server deployment

Requirements:

- The domain's A/AAAA record must point to the Docker server.
- Ports 80 and 443 must be publicly accessible.
- Docker Engine and the Docker Compose plugin must be installed.

Copy the repository to the server and create the environment file:

```bash
cp .env.example .env
```

Set `APP_HOST` and `ACME_EMAIL` to their production values. `IMAGE_NAME` is already configured for this repository. Then start the stack:

```bash
docker compose pull
docker compose up -d
docker compose ps
```

Traefik redirects HTTP traffic to HTTPS and automatically provisions a Let's Encrypt certificate. HTTPS is also required for browser webcam access.

Watchtower checks the registry every 300 seconds by default. Only the application has the Watchtower enable label, so the Traefik and Watchtower containers are not automatically replaced.

### Private GHCR images

The current image is public and does not require authentication. If you make it private, log in with a GitHub personal access token that has the `read:packages` permission:

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

Watchtower reads Docker credentials from `DOCKER_CONFIG_DIR`. If Compose runs as a non-root user, change this value in `.env`, for example to `/home/deploy/.docker`.

> Note: The Watchtower project is archived. `DOCKER_API_VERSION=1.44` is included in the Compose configuration as a compatibility workaround for newer Docker Engine releases.
