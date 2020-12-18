FROM node:15-alpine

WORKDIR /app

# Installs pnpm
RUN npm i -g pnpm

# Copies package.json
COPY package.json /app
RUN pnpm install

# Copy dependacies
COPY . /app

# Installs, builds, and prunes
RUN pnpm install \
	& pnpm build --filter shared \
	& pnpm build --filter back-end \
	& pnpm build \
	& pnpm prune --production

# Starts the test app
CMD ["pnpm", "ta:start"]