pipeline {
    agent any

    environment {
        NODE_VERSION    = '18'
        REGISTRY        = 'ghcr.io/signalops'
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

        stage('Setup Environment') {
            steps {
                sh '''
                    if [ ! -f .env ]; then
                      cp .env.example .env
                    fi
                '''
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
                sh 'npm run lint'
            }
        }

        stage('Test') {
            steps {
                sh 'npm run test'
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
                        docker build -f infrastructure/Dockerfile.api -t ${REGISTRY}/signalops-api-gateway:${tag} -t ${REGISTRY}/signalops-api-gateway:latest .
                        docker build -f infrastructure/Dockerfile.worker -t ${REGISTRY}/signalops-worker-service:${tag} -t ${REGISTRY}/signalops-worker-service:latest .
                        docker build -f infrastructure/Dockerfile.simulator -t ${REGISTRY}/signalops-simulator:${tag} -t ${REGISTRY}/signalops-simulator:latest .
                        docker build -f infrastructure/Dockerfile.dashboard -t ${REGISTRY}/signalops-dashboard:${tag} -t ${REGISTRY}/signalops-dashboard:latest .
                        echo "Images built with tag: ${tag}"
                    """
                }
            }
        }

        stage('Docker Push') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([usernamePassword(credentialsId: 'docker-registry', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    script {
                        def tag = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
                        sh """
                            echo "$DOCKER_PASS" | docker login ${REGISTRY} -u "$DOCKER_USER" --password-stdin
                            docker push ${REGISTRY}/signalops-api-gateway:${tag}
                            docker push ${REGISTRY}/signalops-api-gateway:latest
                            docker push ${REGISTRY}/signalops-worker-service:${tag}
                            docker push ${REGISTRY}/signalops-worker-service:latest
                            docker push ${REGISTRY}/signalops-simulator:${tag}
                            docker push ${REGISTRY}/signalops-simulator:latest
                            docker push ${REGISTRY}/signalops-dashboard:${tag}
                            docker push ${REGISTRY}/signalops-dashboard:latest
                        """
                    }
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
                    sh 'npm run test:integration'
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
