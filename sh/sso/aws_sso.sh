#!/bin/bash

# This script needs some necessary environment variables for AWS authentication
# based on the specified environment argument. Ensure that the environments are
# properly configured within the script before running it.
#
# If the provided argument does not match any supported environments, an error
# message will be printed and the script will exit with status 1.
#
# Required environment variables:
# - AWS_PROFILE_<environment>: The AWS CLI profile for the specified environment.
# - ACCOUNT_ID_<environment>: The AWS account ID for the specified environment.

# Check to see if we are already logged in
ACCOUNT_ID_TEMP=$(aws sts get-caller-identity --query "Account" --profile $AWS_PROFILE | tr -d '"')

# If response is "533223568588" we are already logged in
if [ "$ACCOUNT_ID_TEMP" = "$AWS_USER" ]; then
    echo "AWS SSO session still valid, no login needed"

# Else we login with "aws sso login"
else
    echo ""
    echo "AWS SSO session expired, login needed"
    echo ""
    aws sso login --profile onboarding-noprod
fi
