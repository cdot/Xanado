# Copyright (C) 2019-2025 The Xanado Project https://github.com/cdot/Xanado
# License MIT. See README.md at the root of this distribution for full copyright
# and license information. Author Crawford Currie http://c-dot.co.uk
#
# Dockerfile to build Xanado

# ---------- Stage 1: build ----------
FROM node:22-alpine AS builder
WORKDIR /xanado
RUN apk update && apk add git
COPY package*.json ./
RUN npm ci || cat /root/.npm/_logs/*.log
COPY audio audio
COPY bin bin
COPY css css
COPY dictionaries/*.dict dictionaries/
COPY dist dist
COPY editions editions
COPY favicon.ico .
COPY games games
COPY html html
COPY i18n i18n
COPY images images
COPY src src

# ---------- Stage 2: runtime ----------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /xanado
# Copy only what we need
COPY --from=builder /xanado /xanado
# Server is run as root so it can bind a port
EXPOSE 9093
CMD [ "node", "bin/server.js" ]