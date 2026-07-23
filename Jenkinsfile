pipeline {
    agent any

    tools {
        nodejs 'NodeJS-24'
    }

    environment {
        SCANNER_HOME = tool 'SonarScanner'
        IMAGE_NAME   = 'survey-app:dev'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

    stage('Install dependencies') {
        steps {
            sh 'npm -v'
            sh 'npm install --install-links'
        }
    }

        stage('Run tests + coverage') {
            steps {
                sh 'npm test -- --coverage'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh "${SCANNER_HOME}/bin/sonar-scanner"
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    echo "Construyendo la imagen Docker ${IMAGE_NAME}..."
                    sh "docker build --no-cache -t ${IMAGE_NAME} ."
                }
            }
        }

        stage('Deploy Local DEV') {
            steps {
                script {
                    echo "Levantando el entorno DEV con Docker Compose..."
                    // Detiene y elimina contenedores anteriores para aplicar el nuevo build
                    sh "docker-compose down || true"
                    sh "docker-compose up -d --build"
                }
            }
        }
    }
}