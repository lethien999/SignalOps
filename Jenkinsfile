pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = credentials('docker-registry')
        NODE_VERSION    = '18'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo "Branch: ${env.BRANCH_NAME}"
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'node --version'
                sh 'npm ci'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Lint') {
            steps {
                sh 'npm run lint || true'
            }
        }

        stage('Test') {
            steps {
                sh 'npm run test || true'
            }
        }

        stage('Docker Build') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                script {
                    def tag = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
                    sh """
                        docker compose -f infrastructure/docker-compose.yml build
                        echo "Images built with tag: ${tag}"
                    """
                }
            }
        }

        stage('API Health Check') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                script {
                    sh 'docker compose --env-file .env -f infrastructure/docker-compose.yml up -d'
                    sleep(time: 15, unit: 'SECONDS')
                    sh 'curl -sf http://localhost:3000/api/health || exit 1'
                    sh 'docker compose --env-file .env -f infrastructure/docker-compose.yml down'
                }
            }
        }
    }

    post {
        always {
            sh 'docker compose --env-file .env -f infrastructure/docker-compose.yml down || true'
        }
        success {
            echo 'Pipeline hoan thanh thanh cong!'
        }
        failure {
            echo 'Pipeline that bai. Kiem tra logs.'
        }
    }
}
