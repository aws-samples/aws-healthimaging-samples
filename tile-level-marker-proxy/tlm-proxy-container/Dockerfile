# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

FROM public.ecr.aws/docker/library/node:18-bullseye-slim
# Use the 'node' user
USER node
# Set working directory
WORKDIR /tlm-proxy
# Add NodeJS dependencies
COPY package*.json ./
# Install dependencies
RUN npm ci --only=production
# Add remaining files
COPY . .

HEALTHCHECK CMD curl --fail http://localhost:8080 || exit 1
EXPOSE 8080
CMD node index.js