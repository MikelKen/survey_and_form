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
                    echo "Levantando el contenedor de la app en entorno DEV..."
                    // 1. Crear red de docker si no existe
                    sh 'docker network create survey_from_project_default || true'
                    
                    // 2. Detener y remover el contenedor anterior si existe
                    sh 'docker stop survey-app-dev || true'
                    sh 'docker rm survey-app-dev || true'

                    // 3. Correr el nuevo contenedor reconstruido en la red con Postgres
                    sh '''
                        docker run -d \
                          --name survey-app-dev \
                          --network survey_from_project_default \
                          -p 3000:3000 \
                          -e P_DB_HOST=db_survey_form \
                          -e POSTGRES_HOST=db_survey_form \
                          -e P_DB_PORT=5432 \
                          -e P_DB_USER=postgres \
                          -e P_DB_PASSWORD=postgres \
                          -e P_DB_NAME=survey_db \
                          --restart unless-stopped \
                          survey-app:dev
                    '''
                }
            }
        }
    }
}