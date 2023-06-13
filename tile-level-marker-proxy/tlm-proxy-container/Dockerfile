# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

FROM public.ecr.aws/docker/library/node:18-bullseye-slim
# Set working directory
WORKDIR /tlm-proxy
# Add NodeJS dependencies
COPY package*.json ./
# Install dependencies
RUN npm ci --omit=dev
# Add remaining files
COPY . .
# Use the 'node' user
USER node

HEALTHCHECK CMD curl --fail http://localhost:8080 || exit 1
EXPOSE 8080
CMD node index.js