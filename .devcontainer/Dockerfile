# The Node.js major must match .node-version. The build fails when it
# does not, so a bump of .node-version cannot be forgotten here.
ARG VARIANT="24"
FROM mcr.microsoft.com/devcontainers/typescript-node:4-${VARIANT}-trixie

COPY .node-version /tmp/.node-version
RUN test "$(node --version | cut -d. -f1 | tr -d v)" = "$(cat /tmp/.node-version)"

# pnpm switches itself to the version in packageManager of package.json on
# first use. Installed with npm on purpose: run through Corepack or as the
# standalone binary, pnpm adds itself to pnpm-lock.yaml on every install.
RUN npm install -g pnpm

# The development server and the preview of a build.
EXPOSE 4321
