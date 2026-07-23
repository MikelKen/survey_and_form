# @tigo/logger

Librería de logging para Node.js basada en [pino](https://getpino.io/), con soporte para middlewares HTTP y contexto asíncrono.

## Instalación

```sh
npm install @tigo/logger
```

## Uso básico

```js
import { logger, httpLoggerMiddleware } from '@tigo/logger';

// Uso directo del logger
logger.info('Mensaje informativo');
logger.error('Mensaje de error');

// Middleware para frameworks como Express
import express from 'ultimate-express';
const app = express();

app.use(httpLoggerMiddleware());


```

## API

### logger

Un logger compatible con los métodos estándar: `info`, `error`, `warn`, `debug`, `trace`, y utilidades para medir tiempos.

```js
logger.info('Mensaje');
logger.startTimer('etiqueta');
// ... código ...
logger.endTimer('etiqueta');
```

### httpLoggerMiddleware

Middleware para logging de peticiones HTTP. Añade un logger a cada request y registra información relevante.

```js
app.use(httpLoggerMiddleware());
```


## Licencia

ISC