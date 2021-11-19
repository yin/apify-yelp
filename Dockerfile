FROM apify/actor-node:16

# Second, copy just package.json and package-lock.json since they are the only files
# that affect NPM install in the next step
COPY package*.json ./

# Install NPM packages, skip optional and development dependencies to keep the
# image small. Avoid logging too much and print the dependency tree for debugging
RUN npm --quiet set progress=false \
 && npm install --only=prod --no-optional \
 && echo "Installed NPM packages:" \
 && (npm list --all || true) \
 && echo "Node.js version:" \
 && node --version \
 && echo "NPM version:" \
 && npm --version

COPY . ./

ENV APIFY_DISABLE_OUTDATED_WARNING 1
ENV npm_config_loglevel=silent
