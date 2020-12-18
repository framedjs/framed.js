# ----------------
# Build stage
# ----------------
FROM node:15-alpine as build-stage
WORKDIR /app

# Installs pnpm
RUN npm i -g pnpm

# Copies pnpm deps
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# Installs top-level monorepo modules
RUN pnpm install

# Copy the rest of the files
COPY . /app

# Installs, builds, and prunes
# NOTE: Currently doesn't build front-end
RUN pnpm recursive install
RUN pnpm build --filter shared
RUN pnpm build --filter back-end 
RUN pnpm build --filter test-app 
	# & pnpm build --filter front-end \

# ----------------
# Production stage
# ----------------
FROM node:15-alpine as production-stage
WORKDIR /app

# Installs pnpm
RUN npm i -g pnpm

# Copies base
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
# COPY --from=build-stage /app/node_modules/ 			 /app/node_modules/
# For some reason, -P doesn't work.
RUN pnpm install 

# Copies workspace package.json files and built files
# COPY --from=build-stage /app/packages/shared/node_modules 		/app/packages/shared/node_modules 
COPY --from=build-stage /app/packages/shared/package.json 		/app/packages/shared/package.json
COPY --from=build-stage /app/packages/shared/dist/ 	 			/app/packages/shared/dist/
RUN pnpm install --filter shared

# COPY --from=build-stage /app/packages/back-end/node_modules 	/app/packages/back-end/node_modules 
COPY --from=build-stage /app/packages/back-end/package.json 	/app/packages/back-end/package.json
COPY --from=build-stage /app/packages/back-end/dist/ 			/app/packages/back-end/dist/
RUN pnpm install --filter back-end

# COPY --from=build-stage /app/packages/test-app/node_modules 	/app/packages/test-app/node_modules 
COPY --from=build-stage /app/packages/test-app/package.json		/app/packages/test-app/package.json
COPY --from=build-stage /app/packages/test-app/dist/ 			/app/packages/test-app/dist/
RUN pnpm install --filter test-app

# NOTE: Currently doesn't copy front-end
# COPY --from=build-stage /app/packages/front-end/package.json	/app/packages/front-end/package.json
# COPY --from=build-stage /app/packages/front-end/build/ 	/app/packages/front-end/build/

# Starts the test app
EXPOSE 42069
CMD ["pnpm", "ta:start"]