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
                sh 'npm run coverage'
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

        stage('Trivy Security Scan') {
            steps {
                script {
                    echo "Ejecutando escaneo de vulnerabilidades con Trivy a ${IMAGE_NAME}..."
                    
                    sh "trivy image --severity HIGH,CRITICAL ${IMAGE_NAME}"
                    sh "trivy image --format json --output trivy-report.json ${IMAGE_NAME}"
                    sh "trivy image --format table --output trivy-report.txt ${IMAGE_NAME}"
                }
            }
        }

        stage('Deploy Local DEV') {
            steps {
                script {
                    echo "Levantando el contenedor de la app en entorno DEV..."
                    sh 'docker network create survey_from_project_default || true'
                    sh 'docker stop survey-app-dev || true'
                    sh 'docker rm survey-app-dev || true'

                    // 1. Crear el archivo .env completo con Postgres y Redis
                    sh '''
                        cat <<EOF > .env
                        PORT=3000
                        API_BASE_PATH=/v1
                        
                        P_DB_HOST=db_survey_form
                        P_DB_PORT=5432
                        P_DB_NAME=mydatabase
                        P_DB_USER=postgres
                        P_DB_PASSWORD=postgres123
                        P_DB_MAX_CONNECTIONS=10
                        
                        JWT_SECRET=burveyform
                        
                        REDIS_HOST=redis_survey_form
                        REDIS_PORT=6379
                        REDIS_PASSWORD=redis123
                        EOF
                    '''

                    // 2. Levantar el contenedor cargando el .env actualizado
                    sh '''
                        docker run -d \
                          --name survey-app-dev \
                          --network survey_from_project_default \
                          --env-file .env \
                          -p 3000:3000 \
                          --restart unless-stopped \
                          survey-app:dev
                    '''
                }
            }
        }
    }
    
    post {
        always {
            archiveArtifacts artifacts: 'trivy-report.json, trivy-report.txt', allowEmptyArchive: true
        }
    }
}