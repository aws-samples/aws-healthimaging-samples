#!/bin/bash

stackName=$(aws amplify get-backend-environment --app-id ${AWS_APP_ID} --environment-name ${AWS_BRANCH} | jq -r '.backendEnvironment.stackName')
if [ -z ${stackName} ]; then exit 1; fi

authIamName=$(aws cloudformation describe-stacks --stack-name ${stackName} | jq -r '.Stacks[0].Outputs[] | select(.OutputKey == "AuthRoleName") | .OutputValue')
if [ -z ${authIamName} ]; then exit 1; fi

policyName=$(aws iam list-role-policies --role-name ${authIamName} | jq -r '.PolicyNames[] | select("medical-imaging-read-only")')
if [ -z ${policyName} ]; then exit 1; fi

exit 0
