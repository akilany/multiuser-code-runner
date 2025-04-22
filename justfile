default:
    just --list

hasura-apply:
    cd ./hasura-server && hasura metadata apply && hasura migrate apply --all-databases && hasura metadata apply

dev:
    docker-compose --profile=dev up -d

docker-login:
    aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin 687253468904.dkr.ecr.us-west-2.amazonaws.com

prod-all:
    source ./.env.prod.sh && docker-compose --profile=prod up -d

build-beanstalk:
    python3 ./beanstalk/beanstalk_recompose.py -i ./docker-compose.yml -o ./beanstalk/docker-compose.yml
    echo "Changes to the Docker-compose requires redeploying the generated \"beanstalk.zip\" to Elastic Beanstalk."
    rm -f beanstalk.zip
    cd ./beanstalk && zip -r -X -D ../beanstalk.zip . --exclude \*.py

deploy-beanstalk: build-beanstalk
    #!/usr/bin/env bash
    set -euxo pipefail
    export AWS_PAGER=""
    hash=$(sha1sum beanstalk.zip | cut -d ' ' -f 1)
    NOT_EXIST=false
    aws s3api head-object --bucket elasticbeanstalk-us-west-2-687253468904 --key Codebox-env/$hash || NOT_EXIST=true
    if [ $NOT_EXIST == "true" ]; then
        aws s3 cp ./beanstalk.zip s3://elasticbeanstalk-us-west-2-687253468904/Codebox-env/$hash
        aws elasticbeanstalk create-application-version --application-name Codebox-env --version-label $hash --source-bundle="S3Bucket=elasticbeanstalk-us-west-2-687253468904,S3Key=Codebox-env/$hash"
    fi
    aws elasticbeanstalk update-environment --application-name Codebox-env --environment-name Codebox-env-env --version-label $hash
    