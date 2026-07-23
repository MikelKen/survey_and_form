FROM ubuntu:24.04

# Instalar Node.js 22 y dependencias esenciales de sistema
RUN apt-get update && apt-get install -y curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copiar TODO el código fuente primero (incluyendo carpetas locales como 'tigo')
COPY . .

# Instalar dependencias con las librerías locales disponibles
RUN npm install --install-links --omit=dev

EXPOSE 3000

CMD ["npm", "start"]