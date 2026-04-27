pipeline {
  agent any

  options {
    timestamps()
    timeout(time: 45, unit: 'MINUTES')
    disableConcurrentBuilds()
  }

  environment {
    CI = 'true'
    COMPOSE_FILE = 'infrastructure/docker-compose.yml'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install') {
      steps {
        bat 'npm install'
      }
    }

    stage('Build') {
      steps {
        bat 'npm run build'
      }
    }

    stage('Lint') {
      steps {
        bat 'npm run lint -w api-gateway'
        bat 'npm run lint -w worker-service'
      }
    }

    stage('Test') {
      steps {
        bat 'npm run test -w worker-service'
      }
    }

    stage('Phase4 Verify') {
      steps {
        bat 'npm run docker:up'
        bat 'npm run verify:phase4 > phase4-verify.log'
      }
    }

    stage('Critical Log Gate') {
      steps {
        bat '''powershell -NoProfile -ExecutionPolicy Bypass -Command "$logs = docker compose --env-file .env -f infrastructure/docker-compose.yml logs --no-color api-gateway event-broker worker; $logs | Out-File -Encoding utf8 pipeline-service-logs.log; if ($logs -match '(?im)(FATAL|CRITICAL|UnhandledPromiseRejection|OutOfMemory|Segmentation fault)') { Write-Error 'Critical runtime errors detected in service logs.'; exit 1 }"'''
      }
    }

    stage('Docker Build & Tag') {
      when {
        anyOf {
          branch 'main'
          branch 'master'
        }
      }
      steps {
        bat 'npm run docker:build'
        bat '''powershell -NoProfile -ExecutionPolicy Bypass -Command "$short = git rev-parse --short HEAD; $images = @('infrastructure-api-gateway','infrastructure-event-broker','infrastructure-worker','infrastructure-simulator'); foreach ($img in $images) { docker image inspect \"${img}:latest\" *> $null; if ($LASTEXITCODE -eq 0) { docker tag \"${img}:latest\" \"${img}:$short\" } }"'''
      }
    }

    stage('PR Summary') {
      when {
        changeRequest()
      }
      steps {
        echo 'PR pipeline path executed: build + lint + tests + phase4 verification + log gate.'
      }
    }

    stage('Main Summary') {
      when {
        anyOf {
          branch 'main'
          branch 'master'
        }
      }
      steps {
        echo 'Main pipeline path executed: build + lint + tests + phase4 verification + log gate + docker build/tag.'
      }
    }
  }

  post {
    always {
      bat 'npm run docker:down'
      archiveArtifacts artifacts: 'phase4-verify.log,pipeline-service-logs.log', allowEmptyArchive: true
    }
  }
}
