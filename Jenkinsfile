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

        stage('Trivy Security Scan') {
            steps {
                script {
                    echo "Ejecutando escaneo de vulnerabilidades con Trivy a ${IMAGE_NAME}..."
                    
                    // 1. Escaneo en consola (resumen visual)
                    sh "trivy image --severity HIGH,CRITICAL ${IMAGE_NAME}"

                    // 2. Generar reporte JSON guardado en el workspace
                    sh "trivy image --format json --output trivy-report.json ${IMAGE_NAME}"
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

                    // 1. Crear el archivo .env con tus credenciales reales
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
                        EOF
                    '''

                    // 2. Levantar el contenedor cargando el .env generado
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
}