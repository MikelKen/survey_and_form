# @tigo/error-code

Librería Node.js para mapear códigos de error a mensajes legibles.

## Instalación
```bash
npm install @tigo/error-code
```

## Uso

Importa la función principal en tu proyecto:

```javascript
import { getErrorMessage } from '@tigo/error-code';

const mensaje = getErrorMessage('BR001');
console.log(mensaje); 
// {
//  statusHttp: 400,
//  message: "Missing required parameter",
// }
```

## Métodos disponibles

### **1. `getErrorMessage(errCode)`**
Devuelve el mensaje correspondiente al código de error.

- **Parámetros**:
  - `errCode` (string): Código de error, por ejemplo `"BR001"`.

- **Retorna**:
  - (string): Mensaje de error asociado o `"Unknown error"` si el código no existe.

- **Ejemplo**:
  ```javascript
  import { getErrorMessage } from '@tigo/error-code';

  console.log(getErrorMessage('BR001')); // "Missing required parameter"
  console.log(getErrorMessage('BR0099999')); // "Unknown error"
  ```

</br>

## Error Handling Guidelines

- **200 OK – Successful Response:**  
  La operación se completó correctamente sin errores. La respuesta contiene los datos solicitados o la confirmación de la acción completada.

- **4XX – Client / Business Errors:**  
  El servidor recibió la solicitud, pero no pudo procesarla debido a problemas del lado del cliente o infracciones de las reglas comerciales. El cliente es responsable de corregir o ajustar la solicitud antes de volver a intentarlo.

- **5XX – Server / Infrastructure Errors:**  
  La solicitud es válida, pero el servidor ha detectado fallos internos o problemas de infraestructura que le impiden completar la operación. Estos errores no pueden ser resueltos por el cliente y requieren intervención técnica.

</br>

## Error Response
  ```javascript
  {
    error: {
      code: "SYS001",
      message: "Unexpected server error"
    }
  }
  ```

<br/>

## Error Codes

### **4XX – Client / Business Errors**
#### HTTP Status: 400 Bad Request

| ErroCode | Message                                                              | Description                                                                       | Example Usage |
| -------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------- |
| BR001    | Missing required parameter | Required field is empty | Enviar un formulario sin rellenar el campo del correo electrónico |
| BR002    | Invalid data type | Sending string instead of number | Proporcionar «abc» para un campo de precio que espera un número. |
| BR003    | Unsupported format | Exception in the xml to geojson conversion | Envío de un archivo XML con una estructura no válida al convertirlo a GeoJSON |
| BR004    | Unsupported HTTP method | Using PUT instead of POST on endpoint | Usar PUT en un punto final que solo permite POST |

#### HTTP Status: 401 Unauthorized

| ErroCode | Message                                                              | Description                                                                       | Example Usage |
| -------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------- |
| AU001    | Invalid token | Token corrupted or manipulated | Envío de un token con una firma incorrecta |
| AU002    | Token expired | Session expired, refresh token required | Uso de un token después de su fecha de caducidad |
| AU003    | Missing token | Authorization header absent | Solicitud enviada sin el encabezado de autorización. |

#### HTTP Status: 402 Payment Required
| ErroCode | Message                                                              | Description                                                                       | Example Usage |
| -------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------- |
| PM001    | Payment required | Action requires priorpayment | Intento de comprar un paquete sin completar el pago |
| PM002    | Insufficient balance | Insufficient funds to process | El usuario intenta pagar 50 $ con solo 20 $ en la cuenta. |
| PM003    | Payment authorization failed | Error validating the payment method | Tarjeta de crédito rechazada por el banco |
| PM004    | Subscription expired | Subscription has expired | Acceso a un servicio después de la fecha de finalización de la suscripción |
| PM005    | Payment token invalid | Payment token invalid orexpired | Usar un token de pago que ya se ha consumido |

#### HTTP Status: 403 Forbidden
| ErroCode | Message                                                              | Description                                                                       | Example Usage |
| -------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------- |
| FB001    | Access denied | User does not have permission to access the endpoint | Un usuario sin privilegios de administrador intenta acceder a la API para la gestión de paquetes. |

#### HTTP Status: 404 Not found
| ErroCode | Message                                                              | Description                                                                       | Example Usage |
| -------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------- |
| NF001    | Not found | Data not found | Consultar un paquete con un ID inexistente |
| NF002    | MSISDN not found | Querying an MSISDN in SNC | Búsqueda de un MSISDN que no está registrado en el sistema |
#### HTTP Status: 405 Method Not Allowed
| ErroCode | Message                                                              | Description                                                                       | Example Usage |
| -------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------- |
| MA001    | Method not allowed | HTTP method not allowed for this endpoint | Intentar un PUT en un punto final que solo permite POST |
| MA002    | Method not implemented | Method not yet implemented on this resource | Realizar un PATCH en un punto final que aún no lo admite |
#### HTTP Status: 406 Not Acceptable
| ErroCode | Message                                                              | Description                                                                       | Example Usage |
| -------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------- |
| NA001    | Not Acceptable | Server cannot produce a response matching Accept headers | El cliente solicita Accept:application/xml, pero el punto final solo devuelve application/json. |
| NA002    | Unsupported media type | Content type not supported | El cliente envía Content-Type: text/plain a un punto final que solo acepta application/json. |
#### HTTP Status: 409 Conflict
| ErroCode | Message                                                              | Description                                                                       | Example Usage |
| -------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------- |
| CF001    | Resource conflict | Attempting to register a duplicate resource | Intento de registrar un paquete con un ID que ya existe en el sistema. |
#### HTTP Status: 422 Unprocessable Entity
| ErroCode | Message                                                              | Description                                                                       | Example Usage |
| -------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------- |
| UE001    | Invalid document format | Entity cant be processed due to bussiness rules | Subir un documento con campos obligatorios faltantes o estructura no válida |
#### HTTP Status: 429 Too many requests
| ErroCode | Message                                                              | Description                                                                       | Example Usage |
| -------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------- |
| RL001    | Too many requests | Client exceeded allowed requests per minute | Enviar 100 solicitudes en un minuto cuando el límite es de 60. |

<br/>

### **5XX – Server / Infrastructure Errors**
#### HTTP Status: 500 Internal Server Error
| ErroCode | Message                                                              | Description                                                                       | Example Usage |
| -------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------- |
| SE001    | Generic internal server error | Unhandled backend exception | El backend lanza una excepción inesperada al procesar una solicitud de pago. |
#### HTTP Status: 502 Bad Gateway
| ErroCode | Message                                                              | Description                                                                       | Example Usage |
| -------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------- |
| BG001    | Gateway or proxy error | API Gateway cannot reach microservice | La solicitud del cliente falla porque APIGateway no puede conectarse al microservicio descendente. |
#### HTTP Status: 503 Service Unavailable
| ErroCode | Message                                                              | Description                                                                       | Example Usage |
| -------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------- |
| SU001    | Service temporarily unavailable | Database or dependency down | Intento de procesar un pago mientras la base de datos está desconectada. |
#### HTTP Status: 504 Gateway Timeout
| ErroCode | Message                                                              | Description                                                                       | Example Usage |
| -------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------- |
| GT001    | Timeout waiting for upstream service | External service did not respond in time | La solicitud de API falla porque el servicio de pago externo no respondió dentro del período de tiempo de espera. |

<br/>

### **Default error codes**

| Status Family | Default Internal Error Code                                                              | Usage                                                                       |
| -------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 400    | BR001 | Error genérico del lado del cliente o del negocio, si no hay un código más específico que encaje. |
| 500    | SE001 | Error genérico del servidor o de la infraestructura. |

<br/>

## Códigos de error mapeados (DEPRECADO)

| Error      | Mensaje                                                                 | 
|-------------|-------------------------------------------------------------------------|
| BUYP0001    | Payload validation failed or request is malformed                       |
| BUYP0002    | Missing Authorization header or token is invalid                        |
| BUYP0003    | Token is valid but does not grant sufficient permissions for this resource |
| BUYP0004    | Unexpected server error                                                 |
| BUYP0005    | Service is temporarily unavailable (maintenance, overload, etc.)        |
| BUYP0006    | The line does not correspond to a Tigo number.                          |
| BUYP0007    | Catalog not found.                                                      |
| BUYP0008    | Available promos not found.                                             |
| BUYP0009    | Transaction not completed. Please try again.                            |
| BUYP0010    | Amount not available.                                                   |
| BUYP0011    | Movile not found.                                                       |
| BUYP0012    | Payment method not found.                                               |
| BUYP0013    | channel&subchannel not configured.                                      |
| BUYP0014    | The request is invalid. Please check the submitted data.                |
| OAUTH0001   | Invalid client                                                          |
| OAUTH0002   | Unauthorized client                                                     |
| OAUTH0003   | Error generating token                                                  |
| INVOICE0001 | Payload validation failed                                               |
| INVOICE0002 | Unexpected server error                                                 |
| TOPUP0001  | Payload validation failed or request is malformed                       |
| TOPUP0002  | Unexpected server error                                                 |
| TOPUP0003  | Service is temporarily unavailable (maintenance overload etc.)          |
| TOPUP0004  | Loan not available                                                      |
| TOPUP0005  | Token expire MTS                                                        |
| TOPUP0006  | Topup failed                                                            |
| TOPUP0007  | Payment method not found.                                               |
| TOPUP0008  | Channel & subchannel not configured                                     |
| SC001       | Invalid request.                                                        |
| SC002       | File name format not supported.                                         |
| SC003       | KML unzip error.                                                        |
| SC004       | GeoJson conversion error.                                               |
| SC005       | Invalid database credentials.                                           |
| SC006       | Insufficient database permissions.                                      |
| SC007       | The resource does not exist.                                            |
| SC008       | The resource sent already exists.                                       |
| SC009       | Server error.                                                           |
| SC010       | Service unavailable.                                                    |
| SC011       | Gateway timeout. 

## Personalización

Para agregar o modificar mensajes de error, edita el archivo `src/lib/errorMap.js` en el repositorio.

---