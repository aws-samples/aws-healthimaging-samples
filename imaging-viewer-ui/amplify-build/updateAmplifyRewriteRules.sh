#!/bin/bash

# Update the Amplify app's rewrite rule for SPAs, including wasm for openjphjs

if [ ! -z ${AWS_APP_ID} ]; then
  aws amplify update-app \
    --app-id ${AWS_APP_ID} \
    --custom-rules '[{"source":"</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp|wasm)$)([^.]+$)/>","status":"200","target":"/index.html","condition":""}]'
fi