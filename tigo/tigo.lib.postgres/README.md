## Instalación

Instala la librería en tu proyecto:

```sh
npm install @tigo/postgres-connector
```

## Configuración de la conexión a Postgres

Configura las variables de entorno en **tu aplicación** (por ejemplo, en un archivo `.env`):

### Opción 1: Variables de entorno individuales

```env
P_DB_USER=usuario
P_DB_PASSWORD=contraseña
P_DB_HOST=localhost
P_DB_PORT=5432
P_DB_NAME=nombre_base
P_DB_MAX_CONNECTIONS=5
```

### Opción 2: Cadena de conexión

```env
P_DB_CONNECTION_STRING=postgresql://usuario:contraseña@localhost:5432/nombre_base
```

> Si defines ambas opciones, la cadena de conexión (`P_DB_CONNECTION_STRING`) tendrá prioridad.

## Uso recomendado

En el archivo principal de tu proyecto (por ejemplo, `index.js`):

```js
import 'dotenv/config';
import app from './src/app.js';
import { initializeDB } from '@tigo/postgres-connector';

// Inicializa la conexión a la base de datos al arrancar la app
await initializeDB();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
```

Luego, en cualquier parte de tu aplicación donde necesites acceder a la base de datos, puedes importar y usar los métodos:

```js
import { executeQuery, executeStoreProcedure } from '@tigo/postgres-connector';

const rows = await executeQuery('SELECT * FROM clientes');
```

---

**Nota:**  
Solo necesitas llamar a `initializeDB()` una vez al inicio de tu aplicación. Asegúrate de tener configuradas las variables de entorno antes de arrancar tu app.