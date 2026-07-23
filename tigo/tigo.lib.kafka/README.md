# @tigo/kafka-connector

Libreria Node.js para gestionar conexiones y envio de mensajes a topicos en Kafka.

## Instalacion
```bash
npm install @tigo/kafka-connector
```

## Configuracion

Crea un archivo `.env` en la raiz de tu proyecto con las siguientes variables de entorno:

```env
KAFKA_HOST=localhost
KAFKA_PORT=9092
KAFKA_CLIENT_ID=tigo.micro.tigosport.provisioning
```

## Metodos disponibles
La libreria expone los siguientes metodos para interactuar con Kafka:

### **1. `publish(topic, message)`**
Deposita el mensaje en el topico indicado.

- **Parametros**:
  - `topic` (string): Nombre del topico en Kafka.
  - `message` (string | object | Buffer): Mensaje a depositar en el topico.

- **Notas de confiabilidad del producer**:
  - Publica con `acks=-1` para confirmar persistencia en replicas (all).
  - Se inicializa con `idempotent=true` para reducir duplicados ante retries.
  - Si `message` es un objeto JSON, la libreria lo serializa internamente con `JSON.stringify`.

- **Ejemplo**:
  Envio de mensaje texto como string.
  ```javascript
  const topic = 'mi-topic-ejemplo'

  await publish(topic, 'Mensaje simple como string')
  ```

  Envio de mensaje como estructura JSON.
  ```javascript
  const topic = 'mi-topic-ejemplo'
  const message = {
    id: Date.now(),
    content: 'Este es un mensaje de prueba',
    timestamp: new Date().toISOString(),
  }

  await publish(topic, message)
  ```

---
