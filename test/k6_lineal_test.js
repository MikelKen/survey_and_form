import http from "k6/http";
import { check, group, sleep } from "k6";
import exec from "k6/execution";
import { uuidv4 } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

// Aceptamos estados HTTP de 200 a 404 como no colapso
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 404 }));

// -----------------------------------------------------------------
// RAMPA LINEAL CONTINUA:
// Sube de 0 a 200 VUs de forma 100% constante durante 2 minutos.
// Cada 12 segundos se suman exactamente 20 usuarios virtuales.
// -----------------------------------------------------------------
export const options = {
  scenarios: {
    rampa_lineal_pura: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 200 }, // Rampa lineal pura (0 -> 200 VUs)
        { duration: "30s", target: 200 }, // Sostenido en el pico máximo
        { duration: "15s", target: 0 }, // Cierre ordenado
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"], // Umbral: menos del 5% de fallos
    http_req_duration: ["p(95)<500"], // Umbral: p(95) < 500ms
  },
};

const BASE_URL = "http://localhost:3000/api/v1";

// -----------------------------------------------------------------
// SETUP: Configuración inicial (1 sola ejecución)
// -----------------------------------------------------------------
export function setup() {
  const commonHeaders = { "Content-Type": "application/json" };

  // 1. Crear Usuario Creador
  const email = `loadtest_${uuidv4().substring(0, 8)}@test.com`;
  const userPayload = JSON.stringify({
    name: "Load Test User",
    email: email,
    password: "Password123!",
    role: "creator",
  });

  const userRes = http.post(`${BASE_URL}/users`, userPayload, {
    headers: commonHeaders,
  });
  const userData = userRes.json();
  const token = userData ? userData.token : null;
  const userId = userData ? userData.id : null;

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // 2. Crear Formulario en estado DRAFT
  const formPayload = JSON.stringify({
    title: "Formulario Evaluacion Lineal k6",
  });
  const formRes = http.post(`${BASE_URL}/forms`, formPayload, {
    headers: authHeaders,
  });
  const formData = formRes.json();
  const formId = formData ? formData.id : null;

  // 3. Crear Pregunta vinculada al Formulario
  let questionId = null;
  if (formId) {
    const questionPayload = JSON.stringify({
      form_id: formId,
      question_text: "¿Cómo evalúas el servicio?",
      type: "TEXT",
      required: false,
      order_index: 1,
    });
    const questionRes = http.post(`${BASE_URL}/questions`, questionPayload, {
      headers: authHeaders,
    });
    const questionData = questionRes.json();
    questionId = questionData ? questionData.id : null;

    // 4. Publicar el Formulario
    http.post(
      `${BASE_URL}/forms/${formId}/publish`,
      JSON.stringify({ id: formId }),
      { headers: authHeaders },
    );
  }

  return { token, userId, formId, questionId };
}

// -----------------------------------------------------------------
// VUs (Usuarios Virtuales)
// -----------------------------------------------------------------
export default function (data) {
  const { token, userId, formId, questionId } = data;

  const vuId = exec.vu.idInTest;
  const iter = exec.vu.iterationInInstance;

  // Cliente e iteración única por cada solicitud
  const headers = {
    "Content-Type": "application/json",
    "x-clientid": `client-vu-${vuId}-iter-${iter}`,
    "x-traceid": `trace-${vuId}-${iter}`,
  };

  const authHeaders = {
    ...headers,
    Authorization: `Bearer ${token}`,
  };

  // 1. Grupo Usuarios
  group("Users", function () {
    if (userId) {
      const resGetUser = http.get(`${BASE_URL}/users/${userId}`, {
        headers: authHeaders,
      });
      check(resGetUser, { "GET /users/:id ok": (r) => r.status < 500 });
    }

    const resListUsers = http.get(`${BASE_URL}/users`, {
      headers: authHeaders,
    });
    check(resListUsers, { "GET /users ok": (r) => r.status < 500 });
  });

  sleep(0.5);

  // 2. Grupo Formularios
  group("Forms", function () {
    if (formId) {
      const resGetForm = http.get(`${BASE_URL}/forms/${formId}`, { headers });
      check(resGetForm, { "GET /forms/:id ok": (r) => r.status < 500 });
    }

    const resListForms = http.get(`${BASE_URL}/forms`, {
      headers: authHeaders,
    });
    check(resListForms, { "GET /forms ok": (r) => r.status < 500 });
  });

  sleep(0.5);

  // 3. Grupo Preguntas
  group("Questions", function () {
    if (questionId) {
      const resGetQuestion = http.get(`${BASE_URL}/questions/${questionId}`, {
        headers,
      });
      check(resGetQuestion, { "GET /questions/:id ok": (r) => r.status < 500 });
    }
  });

  sleep(0.5);

  // 4. Grupo Envío de Respuestas (Escritura en PostgreSQL)
  group("Answers - POST", function () {
    if (formId && questionId) {
      const payload = JSON.stringify({
        form_id: formId,
        answers: [
          {
            questionId: questionId,
            value: `Respuesta lineal k6 - VU ${vuId}`,
          },
        ],
      });

      const resSubmit = http.post(
        `${BASE_URL}/forms/${formId}/responses`,
        payload,
        { headers },
      );

      check(resSubmit, {
        "POST /responses status ok": (r) => r.status === 201,
        "POST /responses latencia ok": (r) => r.timings.duration < 500,
      });
    }
  });

  sleep(1.5); // Reposo simulado de usuario real
}
