#!/bin/bash
secretsmanager () {
    aws --region="us-west-2" secretsmanager get-secret-value --secret-id=""$1"" | jq -r ".SecretString | fromjson | ."$2""
}

# write out a .env file, that will be consumed by the docker-compose
# file in this repo. See `env-file: .env` statement in the docker-compose.
touch .env
{
  # DB Env Variables
  printf "DB_HOST=%s\n" "$(secretsmanager prod/database host)"
  printf "DB_USER=%s\n" "$(secretsmanager prod/database user)"
  printf "DB_PASS=%s\n" "$(secretsmanager prod/database pass)"
  printf "DB_PORT=%s\n" "5432"
  
 # Server Env Variables
  printf "NODE_ENV=%s\n" "production"
} > .env