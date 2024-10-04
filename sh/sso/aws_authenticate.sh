#!/bin/bash

# AWS Authentication Script
# This script configures the necessary environment variables for AWS authentication
# based on the specified environment argument. It uses the
# ---------------------    aws_soo.sh    ---------------------
# script, which is downloaded at runtime, to SSO in the target AWS account via the AWS CLI.
#
# Usage:
# Execute the script with the following command:
# bash aws_authenticate.sh <ENVIRONMENT> <COMMAND>
# Where `<ENVIRONMENT>` corresponds to one of the configured AWS_PROFILE and ACCOUNT_ID values.
#
# Important: Ensure the environment configurations are set correctly within the script
# before execution.
#
# Requirements:
# - AWS_PROFILE_<environment>: The AWS CLI profile for the specified environment.
# - ACCOUNT_ID_<environment>: The AWS account ID for the specified environment.
#

# Define constants for AWS profiles and account IDs
AWS_PROFILE_TEST=""
ACCOUNT_ID_TEST=""
AWS_PROFILE_STAGE=""
ACCOUNT_ID_STAGE=""
AWS_PROFILE_PROD=""
ACCOUNT_ID_PROD=""
AWS_PROFILE_LOCAL=""
ACCOUNT_ID_LOCAL=""

# Source the AWS assume role script from a remote URL
curl -s -o $(dirname "${BASH_SOURCE[0]}")/aws_assume_role.sh https://raw.githubusercontent.com/alecmestroni/cypress-aws-secrets-manager/main/sh/sso/aws_sso.sh

source "$(dirname "${BASH_SOURCE[0]}")/aws_assume_role.sh"

# Then you can xecute the command with AWS credentials
$2
