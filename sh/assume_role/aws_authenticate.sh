#!/bin/bash

# AWS Authentication Script
# This script configures the necessary environment variables for AWS authentication
# based on the specified environment argument. It uses the
# ---------------------    aws_assume_role.sh    ---------------------
# script, which is downloaded at runtime, to assume a role in the target AWS account via the AWS CLI.
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
# - ROLE_NAME: The username for DevOps-related tasks.
# - AWS_PROFILE_<environment>: The AWS CLI profile for the specified environment.
# - ACCOUNT_ID_<environment>: The AWS account ID for the specified environment.
# - AWS_USER_ID_FILE_NAME: The name of the file that stores the AWS user ID.
# - USER_IDENTIFIER_PREFIX: A prefix used for identifying users.
#

# Only one of the following two variables should be set
# - Array of valid user prefixes
USER_IDENTIFIER_PREFIX=("XXX" "YYY" "ZZZ")
# - Array of valid user suffixes
USER_IDENTIFIER_PREFIX=("@google.com" "@apple.com" "@microsoft.com")

# Define constants for AWS profiles and account IDs
ROLE_NAME=""
AWS_PROFILE_TEST=""
ACCOUNT_ID_TEST=""
AWS_PROFILE_STAGE=""
ACCOUNT_ID_STAGE=""
AWS_PROFILE_PROD=""
ACCOUNT_ID_PROD=""
AWS_PROFILE_LOCAL=""
ACCOUNT_ID_LOCAL=""
AWS_USER_ID_FILE_NAME="aws_user_identifier.json"
DIR="$(dirname "${BASH_SOURCE[0]}")"

# Source the AWS assume role script from a remote URL
curl -s -o $(dirname "${BASH_SOURCE[0]}")/aws_assume_role.sh https://raw.githubusercontent.com/alecmestroni/cypress-aws-secrets-manager/main/sh/assume_role/aws_assume_role.sh

source "$(dirname "${BASH_SOURCE[0]}")/aws_assume_role.sh"

# Then you can xecute the command with AWS credentials
$2
