pipeline {
    agent any

    tools {
        nodejs 'NodeJS-24'
    }

    environment {
        SCANNER_HOME = tool 'SonarScanner'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

    stage('Install dependencies') {
        steps {
            sh 'node -v'
            sh 'npm -v'
            // 1. Instalar las dependencias de las librerías locales en tigo/
            sh 'npm install --prefix tigo/tigo.lib.logger'
            sh 'npm install --prefix tigo/tigo.lib.errorcodes'
            sh 'npm install --prefix tigo/tigo.lib.postgres'

            // 2. Instalar y vincular todas las dependencias del proyecto principal
            sh 'npm install'
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
    }
}