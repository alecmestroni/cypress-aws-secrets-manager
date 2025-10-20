#!/bin/bash

# This script needs some necessary environment variables for AWS authentication
# based on the specified environment argument. Ensure that the environments are
# properly configured within the script before running it.
#
# If the provided argument does not match any supported environments, an error
# message will be printed and the script will exit with status 1.
#
# Required environment variables:
# - ROLE_NAME: The username for DevOps-related tasks.
# - AWS_PROFILE_<environment>: The AWS CLI profile for the specified environment.
# - ACCOUNT_ID_<environment>: The AWS account ID for the specified environment.
# - AWS_USER_ID_FILE_NAME: The name of the file that stores the AWS user ID.
# - USER_IDENTIFIER_PREFIX: A prefix used for identifying users (only one is needed).
# - USER_IDENTIFIER_SUFFIX: A suffix used for identifying users (only one is needed).

ENV=$(echo "$1" | tr '[:lower:]' '[:upper:]')

# Logging helpers to unify output format across scripts
function log_info {
    printf "ℹ️  %b\n" "$1"
}

function log_success {
    printf "✅ %b\n" "$1"
}

function log_warning {
    printf "⚠️  %b\n" "$1"
}

function log_error {
    printf "❌ %b\n" "$1"
}

function log_section {
    local title="$1"
    printf "\n==============================================================\n"
    printf "  %s\n" "$title"
    printf "==============================================================\n\n"
}

function check_required_variables {
    # Array of required variables
    required_vars=("ROLE_NAME" "AWS_PROFILE_$ENV" "ACCOUNT_ID_$ENV" "AWS_USER_ID_FILE_NAME")

    # Check if all required variables are defined
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            log_error "The required variable '$var' is not defined. Please ensure it is present in aws_authenticate.sh."
            return 1
        fi
    done

    # Check that exactly one of USER_IDENTIFIER_PREFIX or USER_IDENTIFIER_SUFFIX is set
    if [[ -n "$USER_IDENTIFIER_PREFIX" && -n "$USER_IDENTIFIER_SUFFIX" ]]; then
        log_error "Both USER_IDENTIFIER_PREFIX and USER_IDENTIFIER_SUFFIX are defined. Please ensure only one is set."
        return 1
    elif [[ -z "$USER_IDENTIFIER_PREFIX" && -z "$USER_IDENTIFIER_SUFFIX" ]]; then
        log_error "Neither USER_IDENTIFIER_PREFIX nor USER_IDENTIFIER_SUFFIX is defined. Please define one of them."
        return 1
    fi

    # Assign one of the identifiers to USER_IDENTIFIER
    if [[ -n "$USER_IDENTIFIER_PREFIX" ]]; then
        USER_IDENTIFIER=("${USER_IDENTIFIER_PREFIX[@]}")
    else
        USER_IDENTIFIER=("${USER_IDENTIFIER_SUFFIX[@]}")
    fi
}

# Function to set the environment variables based on the input argument
function set_environment {
    AWS_PROFILE=$(eval echo "\$AWS_PROFILE_${ENV}")
    ACCOUNT_ID=$(eval echo "\$ACCOUNT_ID_${ENV}")

    return 0
}

# Function to check if brew is installed and install it if not
function check_brew {
    # Check if the operating system is macOS or Linux
    if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" =~ "linux"* ]]; then
        # Set environment variables for Homebrew
        export HOMEBREW_NO_AUTO_UPDATE=1
        export HOMEBREW_NO_ENV_HINTS=1
        # Check if brew is installed
        if ! command -v brew &>/dev/null; then
            # If brew is not installed, print an alert message and ask the user if they want to install it
            printf "\n"
            log_warning "'BREW' is either not installed or the installed version is too low."
            printf "The 'BREW' package is required for this script. Would you like to install it using Homebrew? (y/n): "
            read INSTALL_BREW
            if [[ $INSTALL_BREW == "y" ]]; then
                # If the user wants to install brew, print a message and install it
                log_info "Homebrew not found, installing..."
                yes | /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
                # If the operating system is macOS, add the Homebrew path to the .zprofile file
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    (
                        echo
                        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"'
                    ) >>/Users/$(whoami)/.zprofile
                    eval "$(/opt/homebrew/bin/brew shellenv)"
                # If the operating system is Linux, add the Homebrew path to the .bashrc file
                elif [[ "$OSTYPE" =~ "linux"* ]]; then
                    (
                        echo
                        echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"'
                    ) >>/home/$(whoami)/.bashrc
                    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
                fi
            else
                # If the user does not want to install brew, print a message and return 1
                log_warning "Install Homebrew manually and then restart the script."
                return 1
            fi
        fi
    else
        # If the operating system is not recognized, print a message and return 1
        printf "\n"
        log_error "Unsupported operating system. Please install Homebrew manually."
        return 1
    fi
}

# Function to install jq using brew or scoop
function install_jq {
    # Check if the operating system is macOS or Linux
    if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" =~ "linux"* ]]; then
        # Check if brew is installed
        check_brew
        # Print a message and install jq using brew
        log_info "Installing jq with Homebrew..."
        brew install jq
    elif [[ "$OSTYPE" == "msys"* ]] || [[ "$OSTYPE" == "cygwin"* ]] || [[ "$OSTYPE" == "win32"* ]]; then
        # Check if scoop is installed
        if command -v scoop &>/dev/null; then
            # Print a message and install jq using scoop
            log_info "Installing jq with Scoop..."
            scoop install jq
        else
            # If scoop is not installed, print a message with instructions to install jq using PowerShell and return 1
            printf "\n"
            log_warning "'SCOOP' is either not installed or the installed version is too low."
            cat <<'EOF'
Please install SCOOP or use the following commands from PowerShell (Run as Administrator) and try again.

  Invoke-Expression (New-Object System.Net.WebClient).DownloadString('https://get.scoop.sh')
EOF
            exit 1
        fi
    else
        # If the operating system is not recognized, print a message and return 1
        printf "\n"
        log_error "Unsupported operating system. Please install jq manually."
        return 1
    fi
}

# Function to install AWS CLI using brew
function install_aws_cli {
    # Check if the operating system is macOS or Linux
    if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" =~ "linux"* ]]; then
        # Check if brew is installed
        check_brew
        # Print a message and install AWS CLI using brew
        log_info "Installing AWS CLI with Homebrew..."
        brew install awscli
        return
    elif [[ "$OSTYPE" == "msys"* ]] || [[ "$OSTYPE" == "cygwin"* ]] || [[ "$OSTYPE" == "win32"* ]]; then
        # If the operating system is not macOS or Linux, print a message with instructions to install AWS CLI and return 1
        printf "\n"
        log_warning "'AWS CLI' is either not installed or the installed version is too low."
        cat <<'EOF'
Install AWS CLI v2 using the following steps:

  1) Download the Windows MSI installer from:
     https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html#getting-started-install-instructions
  2) Run the downloaded MSI installer.
  3) Follow the installer instructions to completion.
EOF
        exit 1
    else
        # If the operating system is not recognized, print a message and return 1
        printf "\n"
        log_error "Unsupported operating system. Please install the AWS CLI manually."
        return 1
    fi
}

# Function to check if a package is installed and install it if not
function check_package {
    local package=$1
    local install_command=$2
    local INSTALL_PACKAGE

    # Check if the package is installed
    if ! command -v "$package" &>/dev/null; then
        # If the package is not installed, print an alert message
        printf "\n"
        log_warning "'$package' is either not installed or the installed version is too low."

        # Check the operating system type
        if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" =~ "linux"* ]]; then
            printf "The '%s' package is required for this script. Would you like to let me install it? (y/n): " "$package"
        elif [[ "$OSTYPE" == "msys"* ]] || [[ "$OSTYPE" == "cygwin"* ]] || [[ "$OSTYPE" == "win32"* ]]; then

            printf "The '%s' package is required for this script. Would you like me to provide instructions for installation? (y/n): " "$package"
        else
            # If the operating system is not recognized, print a message and return 1
            printf "\n"
            log_error "Unsupported operating system. Please install '$package' manually."
            return 1
        fi

        # Read user input
        read INSTALL_PACKAGE
        if [[ $INSTALL_PACKAGE == "y" ]]; then
            # If the user wants to install the package, run the install command
            eval "$install_command"
        else
            # If the user does not want to install the package, print a message and return 1
            log_warning "Please install '$package' manually and then restart the script."
            return 1
        fi
    fi
}

# Function to install NVM
function install_nvm {
    # Download and install NVM
    if ! curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash -; then
        echo "Failed to download and install NVM"
        return 1
    fi
    # Source the NVM script
    source ~/.nvm/nvm.sh
}

# Function to install Node.js using NVM
function install_node {
    local NVM_DIR="$HOME/.nvm"
    # Check if NVM is installed
    if ! [ -s "$NVM_DIR/nvm.sh" ] || ! \. "$NVM_DIR/nvm.sh"; then
        # If NVM is not installed, install it
        install_nvm
    fi

    # Check if the latest LTS version of Node.js is already installed
    if nvm ls --no-colors | grep -q 'lts/.* ->'; then
        # If it is, use it
        nvm use --lts
    else
        # If it's not, ask the user if they want to install it
        printf "The 'Node.js' package is required for this script. \nWould you like to install it using NVM? (y/n): "
        read -r INSTALL_NODE
        if [[ $INSTALL_NODE == "y" ]]; then
            # If the user wants to install Node.js, install the latest LTS version and set it as the default version
            nvm install --lts
            nvm alias default 'lts/*'
        else
            # If the user does not want to install Node.js, print a message and return 1
            log_warning "Install Node.js manually and then restart the script."
            return 1
        fi
    fi
}

# Function to check if Node.js is installed and install it if not
function check_node {
    # Check if Node.js is installed
    if ! command -v node >/dev/null 2>&1; then
        # If Node.js is not installed, print an alert message and install Node.js
        printf "\n"
        log_warning "'Node.js' is not installed."
        install_node
    else
        # If Node.js is installed, check its version
        NODE_VERSION=$(node -v | tr -d 'v')
        # If the version is less than 20, print an alert message and install Node.js
        if (($(echo "$NODE_VERSION 20.0" | awk '{print ($1 < $2)}'))); then
            printf "\n"
            log_warning "'Node.js' version $NODE_VERSION is not compatible. Version 20 or higher is required."
            install_node
        fi
    fi
}

# Function to check if the operating system is WSL and copy the .aws/config file from the Windows machine if it is
function check_wsl {
    if [[ "$OSTYPE" =~ "linux"* ]] && grep -q microsoft /proc/version; then
        # If the .aws/config file does not exist, copy it from the Windows machine
        if [ ! -s ~/.aws/config ]; then
            my_user=$(basename $(dirname $(dirname $(dirname $(pwd)))))
            if [ -f "/mnt/c/Users/$my_user/.aws/config" ]; then
                mkdir -p ~/.aws
                cp "/mnt/c/Users/$my_user/.aws/config" ~/.aws/
            else
                log_warning "The file .aws/config does not exist on your Windows machine. Create it and try again."
            fi
        fi
    fi
}

# Function to set the PATH variable
function set_path {
    # Check if the OS type is either Darwin (Mac) or Linux
    if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" =~ "linux"* ]]; then
        # Check if /usr/local/bin is not in the PATH
        if [[ ":$PATH:" != *":/usr/local/bin:"* ]]; then
            # Add /usr/local/bin to the PATH in .bashrc file
            echo 'export PATH=/usr/local/bin:$PATH' >>~/.bashrc
            # Source .bashrc to apply the changes
            source ~/.bashrc
        fi
    fi
}

# Function to check prerequisites
function check_prerequisites {
    # Get the AWS CLI version
    aws_version=$(aws --version 2>&1 | cut -d/ -f2 | cut -d. -f1)
    # Check if AWS CLI version is less than 2 or jq command is not available
    if ! [[ "$aws_version" =~ ^[0-9]+$ ]] || [ "$aws_version" -lt 2 ] || ! [ -x "$(command -v jq)" ]; then
        return 1
    fi
}

# Function to set prerequisites
function prerequisites {
    # Controlla se lo script è eseguito in Bash
    if [[ -z "$BASH_VERSION" ]]; then
        log_error "This script must be run with Bash and not with PowerShell or CMD."
        exit 1
    fi
    set_path
    check_wsl
    check_node
    check_package "jq" "install_jq"
    check_package "aws" "install_aws_cli"
    check_prerequisites
}

# Function to set AWS user identifier file
function set_aws_user_identifier_file {
    local SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    AWS_USER_ID_FILE_PATH="$SCRIPT_DIR/$AWS_USER_ID_FILE_NAME"
    if [ ! -r "$AWS_USER_ID_FILE_PATH" ]; then
        mkdir -p "$(dirname "$AWS_USER_ID_FILE_PATH")" && touch "$AWS_USER_ID_FILE_PATH"
    fi

}

# Function to read session user
function read_session_user {
    # Check if USER_IDENTIFIER exists in AWS_USER_ID_FILE_PATH
    if ! jq -e .USER_IDENTIFIER "$AWS_USER_ID_FILE_PATH" >/dev/null 2>&1; then
        # If not, set SESSION_USER to the current user
        local raw_user="$(whoami)"
        # Extract username part after '+' if present
        if [[ "$raw_user" == *"+"* ]]; then
            SESSION_USER="${raw_user##*+}"
        else
            SESSION_USER="$raw_user"
        fi
        # Convert to lowercase for consistency
        SESSION_USER=$(echo "$SESSION_USER" | tr '[:upper:]' '[:lower:]')
    else
        # If yes, set SESSION_USER to the value of USER_IDENTIFIER
        SESSION_USER=$(jq -r .USER_IDENTIFIER "$AWS_USER_ID_FILE_PATH")
    fi
}

# Function to prompt for session user
function prompt_for_session_user {
    # Loop for maximum 5 tries
    for ((tries = 1; tries <= 5; tries++)); do
        printf "\nPlease enter your identifier (${USER_IDENTIFIER[*]})\n"
        read -r identifier

        # Convert identifier to lowercase for case-insensitive matching
        lower_identifier=$(echo "$identifier" | tr '[:upper:]' '[:lower:]')

        # Check if the identifier starts with a valid id
        is_valid=false
        for id in "${USER_IDENTIFIER[@]}"; do
            if [[ $lower_identifier =~ $id ]]; then
                is_valid=true
                break
            fi
        done

        if [[ $is_valid == false ]]; then
            printf "Identifier is not valid. It must start with one of: ${USER_IDENTIFIER[*]}.\n"
            if ((tries == 5)); then
                printf "Maximum number of tries reached. Exiting...\n"
                return 1
            fi
        else
            SESSION_USER="$identifier"
            break
        fi
    done
    return 0
}

# Function to validate session user
function validate_session_user {
    # Validate SESSION_USER against USER_IDENTIFIER
    local lower_session_user=$(echo "$SESSION_USER" | tr '[:upper:]' '[:lower:]')
    local is_valid=false

    for identifier in "${USER_IDENTIFIER[@]}"; do
        if [[ $lower_session_user =~ ^$identifier ]]; then
            is_valid=true
            break
        fi
    done

    if [[ $is_valid == false ]]; then
        return 1
    fi
}

# Function to set session user
function set_session_user {
    read_session_user
    # Check if SESSION_USER is not already set correctly
    if [[ -z "$SESSION_USER" ]] || ! validate_session_user; then
        if ! prompt_for_session_user; then
            return 1
        fi
    fi
    printf "\n"
    log_info "Detected user $SESSION_USER"
    return 0
}

# Function to read AWS method
function read_aws_method {
    # Check if AWS_METHOD exists in AWS_USER_ID_FILE_PATH
    if jq -e .AWS_METHOD "$AWS_USER_ID_FILE_PATH" >/dev/null 2>&1; then
        # If yes, set AWS_METHOD to the value of AWS_METHOD
        AWS_METHOD=$(jq -r .AWS_METHOD "$AWS_USER_ID_FILE_PATH")
    fi
}

# Function to prompt for AWS method
function prompt_for_aws_method {
    # Loop for maximum 5 tries
    for ((tries = 1; tries <= 5; tries++)); do
        printf "\nPlease choose how you want to save the AWS credentials:\n"
        printf "1. 'export' - Temporarily sets AWS credentials as environment variables for the current terminal session.\n"
        printf "   NOTE: Credentials set with 'export' are not persistent and will be lost when the terminal session ends.\n"
        printf "2. 'credentials' - Permanently saves the AWS credentials in the AWS credentials file (~/.aws/credentials) under the [default] profile.\n"
        printf "   NOTE: Using 'credentials' overwrites the file each time, suitable for long-term use or across multiple sessions.\n"
        printf "\nRecommendation: Use 'export' for temporary access, 'credentials' for persistent access.\n"
        printf "Enter your choice ('1' for export or '2' for credentials): "
        read -r method_number
        # Map the numeric choice to the method
        case $method_number in
        1)
            AWS_METHOD="export"
            ;;
        2)
            AWS_METHOD="credentials"
            ;;
        *)
            printf "Choice is not valid. It must be '1' or '2'.\n"
            if ((tries == 5)); then
                printf "Maximum number of tries reached. Exiting...\n"
                return 1
            fi
            continue
            ;;
        esac
        # If valid choice, add AWS_METHOD to AWS_USER_ID_FILE_PATH
        if [[ -f "$AWS_USER_ID_FILE_PATH" ]]; then
            local temp_file="${AWS_USER_ID_FILE_PATH}.tmp"
            jq '. + {"AWS_METHOD": "'"$AWS_METHOD"'"}' "$AWS_USER_ID_FILE_PATH" > "$temp_file" && mv "$temp_file" "$AWS_USER_ID_FILE_PATH"
        else
            printf "File $AWS_USER_ID_FILE_PATH does not exist. Cannot save AWS_METHOD.\n"
            return 1
        fi
        break
    done
    return 0
}

# Function to set AWS method
function set_aws_method {
    read_aws_method
    # Check if AWS_METHOD is not empty
    if [[ ! $AWS_METHOD ]]; then
        if ! prompt_for_aws_method; then
            return 1
        fi
    fi
    return 0
}

# Function to write the file contaning SESSION_USER & AWS_METHOD
function write_user_and_method {
    echo "{\"USER_IDENTIFIER\": \"$SESSION_USER\",\"AWS_METHOD\": \"$AWS_METHOD\"}" >"$AWS_USER_ID_FILE_PATH"
}

# Function to validate AWS credentials
function valid_credentials {
    local CURRENT_MS=$(date -u +"%s")
    local AWS_CREDENTIALS_EXPIRATION
    local AWS_ACCOUNT_ID

    # Check if AWS_METHOD is 'credentials'
    if [[ "$AWS_METHOD" == 'credentials' ]]; then
        # Check if all required AWS credentials exist in ~/.aws/credentials
        if grep -q "\[default\]" ~/.aws/credentials && grep -q "aws_access_key_id = " ~/.aws/credentials && grep -q "aws_secret_access_key = " ~/.aws/credentials && grep -q "aws_session_token = " ~/.aws/credentials && grep -q "aws_credentials_expiration = " ~/.aws/credentials && grep -q "aws_account_id = " ~/.aws/credentials; then
            AWS_CREDENTIALS_EXPIRATION=$(grep -oP 'aws_credentials_expiration = \K\d+' ~/.aws/credentials)
            AWS_ACCOUNT_ID=$(grep -oP 'aws_account_id = \K\d+' ~/.aws/credentials)
        else
            printf "\n"
            log_error "Missing AWS credentials in file."
            return 1
        fi
    # Check if AWS_METHOD is 'export'
    elif [[ "$AWS_METHOD" == 'export' ]]; then
        # Check if all required AWS credentials exist in environment
        if [[ -n "$AWS_ACCESS_KEY_ID" ]] && [[ -n "$AWS_SECRET_ACCESS_KEY" ]] && [[ -n "$AWS_SESSION_TOKEN" ]] && [[ -n "$AWS_CREDENTIALS_EXPIRATION" ]]; then
            AWS_CREDENTIALS_EXPIRATION="$AWS_CREDENTIALS_EXPIRATION"
        else
            printf "\n"
            log_warning "Missing AWS credentials in environment."
            return 1
        fi
    else
        printf "\n"
        log_error 'Invalid AWS method. Use "credentials" or "export".'
        return 1
    fi

    log_info "Credentials found. Verifying..."

    # Check if AWS_CREDENTIALS_EXPIRATION is not empty and is a number
    if [[ -z "$AWS_CREDENTIALS_EXPIRATION" ]] || ! [[ "$AWS_CREDENTIALS_EXPIRATION" =~ ^[0-9]+$ ]]; then
        log_warning "Missing or invalid AWS credentials expiration date."
        return 1
    # Check if AWS_CREDENTIALS_EXPIRATION is not expired and AWS_ACCOUNT_ID is equal to ACCOUNT_ID
    elif [ "$CURRENT_MS" -gt "$AWS_CREDENTIALS_EXPIRATION" ] || [ "$AWS_ACCOUNT_ID" != "$ACCOUNT_ID" ]; then
        log_warning "Incorrect AWS IAM credentials (expired or invalid)."
        return 1
    else
        local difference=$((((AWS_CREDENTIALS_EXPIRATION - CURRENT_MS) % 3600) / 60))
        log_info "Time remaining until credential expiration: $difference minutes"
        return 0
    fi
}

# Function to install WSLU
function install_wslu {
    # Check if BROWSER is not set to wslview
    if [[ "$BROWSER" != "wslview" ]]; then
        # Check if wslu is not installed
        if ! command -v wslu &>/dev/null; then
            printf "\n"
            log_info "WSLU is missing, installing now..."
            # Update the package lists for upgrades and new packages
            sudo apt-get update
            # Install wslu
            sudo apt-get install -y wslu
            # Remove packages that were automatically installed to satisfy dependencies for other packages and are now no longer needed
            sudo apt-get autoremove
        fi
        # Set BROWSER to wslview in .bashrc file
        echo 'export BROWSER=wslview' >>~/.bashrc
        # Source .bashrc to apply the changes
        source ~/.bashrc
        printf "\n"
        log_info "Attempting to re-establish AWS SSO login..."
        login_with_sso
    fi
}

# Function to login with AWS SSO
function login_with_sso {

    # Get the AWS account ID from the AWS profile
    ACCOUNT_ID_TEMP=$(aws sts get-caller-identity --query "Account" --profile "$AWS_PROFILE" | grep -o '[0-9]*')
    # Check if the account ID matches the expected account ID
    if [ "$ACCOUNT_ID_TEMP" != "$ACCOUNT_ID" ]; then
        # Loop through the output of the AWS SSO login command
    log_warning "AWS SSO session expired, login needed."
    printf "\n"
        sleep 0.1
    log_info "Logging in using AWS SSO..."
    printf "\n"
        while IFS= read -r line; do
            echo $line
            # Check if the line contains an error message
            if [[ $line == *"xdg-open: no method available for opening"* ]] || [[ $line =~ gio:\ https://device\.sso\.eu-west-1\.amazonaws\.com/\?user_code=[A-Z]{4}-[A-Z]{4}:\ Operation\ not\ supported ]]; then
                # If an error message is found, install WSLU
                install_wslu
            fi
        done < <(aws sso login --profile "$AWS_PROFILE" 2>&1)
    else
        log_info "Session for account_id: $ACCOUNT_ID still valid..."
    fi
}

# Function to get the expiration date of the AWS credentials
function expiration_date {
    # Check if the operating system is macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # If it is, use the macOS date command syntax
        echo $(date -v+1H -u +"%s")
    else
        # If it's not, use the Linux date command syntax
        echo $(date -d "+1 hour" +"%s")
    fi
}

# Function to export the AWS credentials
function export_credentials {
    # Define the path to the AWS credentials file
    local AWS_CREDENTIALS_FILE=~/.aws/credentials

    # Check the method for storing the AWS credentials
    if [[ "$AWS_METHOD" == 'credentials' ]]; then
        # If the method is 'credentials', write the credentials to the AWS credentials file
        cat >$AWS_CREDENTIALS_FILE <<EOF
[default]
aws_access_key_id = $(echo "$AWS_STS_OUTPUT" | jq -r '.Credentials.AccessKeyId')
aws_secret_access_key = $(echo "$AWS_STS_OUTPUT" | jq -r '.Credentials.SecretAccessKey')
aws_session_token = $(echo "$AWS_STS_OUTPUT" | jq -r '.Credentials.SessionToken')
aws_credentials_expiration = $(expiration_date)
aws_account_id = $(echo "$AWS_STS_OUTPUT" | jq -r '.AssumedRoleUser.Arn | split(":") | .[4]')
EOF
    elif [[ "$AWS_METHOD" == "export" ]]; then
        # If the method is 'export', export the credentials as environment variables
        export AWS_ACCESS_KEY_ID=$(echo "$AWS_STS_OUTPUT" | jq -r '.Credentials.AccessKeyId')
        log_info "AWS_ACCESS_KEY_ID set."
        sleep 0.1
        export AWS_SECRET_ACCESS_KEY=$(echo "$AWS_STS_OUTPUT" | jq -r '.Credentials.SecretAccessKey')
        log_info "AWS_SECRET_ACCESS_KEY set."
        sleep 0.1
        export AWS_SESSION_TOKEN=$(echo "$AWS_STS_OUTPUT" | jq -r '.Credentials.SessionToken')
        log_info "AWS_SESSION_TOKEN set."
        sleep 0.1
        export AWS_CREDENTIALS_EXPIRATION=$(expiration_date)
        export AWS_ACCOUNT_ID=$(echo "$AWS_STS_OUTPUT" | jq -r '.AssumedRoleUser.Arn | split(":") | .[4]')
    else
        # If the method is neither 'credentials' nor 'export', print an error message and return 1
        echo "Invalid AWS_METHOD. It must be 'credentials' or 'export'."
        return 1
    fi
}

# Function to assume an AWS role and save the credentials
function assume_role_and_save_credentials {
    # Assume the AWS role and save the output
    AWS_STS_OUTPUT=$(AWS_PROFILE="$AWS_PROFILE" aws sts assume-role --role-arn arn:aws:iam::"$ACCOUNT_ID":role/$ROLE_NAME --role-session-name $SESSION_USER)
    # Check if the assume-role command was successful
    if [ $? -ne 0 ]; then
        return 1
    fi
    log_info "Updating credentials from assumed role..."
    # Export the credentials
    export_credentials

    # Check if the credentials were successfully set
    if [[ "$AWS_METHOD" == 'credentials' ]]; then
        if grep -q "\[default\]" ~/.aws/credentials && grep -q "aws_access_key_id = " ~/.aws/credentials && grep -q "aws_secret_access_key = " ~/.aws/credentials && grep -q "aws_session_token = " ~/.aws/credentials; then
            log_info "Variables set successfully in ~/.aws/credentials."
        else
            log_error "Cannot set variables in ~/.aws/credentials."
            return 1
        fi
    elif [[ "$AWS_METHOD" == 'export' ]]; then
        if [[ -n "$AWS_ACCESS_KEY_ID" ]] && [[ -n "$AWS_SECRET_ACCESS_KEY" ]] && [[ -n "$AWS_SESSION_TOKEN" ]] && [[ -n "$AWS_CREDENTIALS_EXPIRATION" ]]; then
            log_info "Environment variables set successfully."
        else
            log_error "Cannot set environment variables."
            return 1
        fi
    fi
}

# Function to check if AWS profiles are configured
function check_aws_profiles {
    local env="$1"
    local aws_profile_var="AWS_PROFILE_$env"
    local aws_profile="${!aws_profile_var}"
    
    log_info "Checking AWS profile configuration for environment: $env"
    
    # Check if AWS CLI is available
    if ! command -v aws &>/dev/null; then
        log_error "AWS CLI is not installed or not in PATH."
        return 1
    fi
    
    # Get list of configured profiles
    local configured_profiles
    if ! configured_profiles=$(aws configure list-profiles 2>/dev/null); then
        log_error "Cannot retrieve AWS profiles. Check your AWS configuration."
        printf "Make sure ~/.aws/config exists and is properly configured.\n"
        return 1
    fi
    
    # Check if the required profile exists
    if ! echo "$configured_profiles" | grep -q "^${aws_profile}$"; then
        log_error "AWS profile '$aws_profile' is not configured."
        printf "Available profiles:\n"
        echo "$configured_profiles" | sed 's/^/  - /'
        printf "\nPlease configure the missing profile in ~/.aws/config\n"
        printf "You can use config.example as a reference.\n"
        printf "\nRequired profile for environment '$env': $aws_profile\n"
        return 1
    fi
    
    log_info "AWS profile '$aws_profile' found and configured."
    return 0
}

# Function to set the AWS credentials
function set_aws_credentials {
    local display_env=$(echo "$ENV" | tr '[:upper:]' '[:lower:]')
    log_section "🔐 AWS EASY Authentication"
    log_info "🔐 AWS authentication for environment: ${display_env:-unknown}"
    log_info "🧩 Validating environment configuration..."
    # Check the environment variables
    check_required_variables "$1" || {
        log_error "Unable to validate required environment variables."
        return 1
    }
    # Set the environment
    set_environment "$1" || {
        log_error "Unable to configure AWS environment variables."
        return 1
    }
    # Check if AWS profiles are properly configured
    check_aws_profiles "$ENV" || {
        log_error "AWS profiles not properly configured."
        return 1
    }
    log_info "🧰 AWS profile configuration verified."
    # Install the prerequisites
    prerequisites || {
        log_error "Unable to install prerequisites."
        return 1
    }
    log_info "⚙️  Local prerequisites fulfilled."
    # Set the AWS user identifier file, the session user, and the AWS method
    set_aws_user_identifier_file || {
        log_error "Failed to prepare AWS user identifier file."
        return 1
    }
    set_session_user || {
        log_error "Failed to determine session user."
        return 1
    }
    set_aws_method || {
        log_error "Failed to determine AWS credential storage method."
        return 1
    }
    log_info "🆔 Using session user '$SESSION_USER' with method '$AWS_METHOD'."
    write_user_and_method
    # Check if the credentials are valid
    valid_credentials || {
        # If they're not, login with AWS SSO
        login_with_sso || {
            log_error "AWS SSO login failed."
            return 1
        }
        printf "\n"
        log_info "🔑 Assuming role: $ROLE_NAME"
        # Assume the AWS role and save the credentials
        assume_role_and_save_credentials || {
            log_error "Assuming role '$ROLE_NAME' failed."
            return 1
        }
    }
    sleep 0.1
    printf "\n"
    log_success "Successfully assumed role: $ROLE_NAME, using AWS IAM credentials."
    log_section "Account ID: $ACCOUNT_ID"
}

# Start of the script
# Set the AWS credentials
set_aws_credentials "$1" || {
    log_error "Failed to set AWS credentials."
    exit 1
}
