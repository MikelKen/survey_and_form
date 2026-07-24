import http from "k6/http";
import { check, group, sleep } from "k6";
import { uuidv4 } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

// Aceptamos 200-404 como "no crash", solo 5xx cuenta como fallo real
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 404 }));

// -----------------------------------------------------------------
// LINEAR RAMP TEST: sube de forma constante y gradual, en pasos
// pequeños e iguales, hasta un techo alto. La idea es ver en qué
// nivel de VUs exactamente empieza a subir el error rate o la
// latencia p(95) — ese es tu "punto de quiebre" real.
//
// Al terminar, revisa en el dashboard de k6 EN QUÉ MARCA DE TIEMPO
// (y por lo tanto en qué nivel de VUs) empezó a degradarse el
// servicio. Como la subida es lineal, puedes mapear tiempo -> VUs
// directamente.
// -----------------------------------------------------------------
export const options = {
  scenarios: {
    rampa_lineal: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 200 },
        { duration: "30s", target: 250 },
        { duration: "30s", target: 200 },
        { duration: "30s", target: 250 },
        { duration: "30s", target: 200 },
        { duration: "30s", target: 250 },
        { duration: "30s", target: 200 },
        { duration: "30s", target: 250 },
        { duration: "30s", target: 200 },
        { duration: "30s", target: 250 },
        { duration: "20s", target: 200 }, // bajada final para cerrar limpio
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<500"],
  },
};

const BASE_URL = "http://localhost:3000/api/v1";
const headers = { "Content-Type": "application/json" };

export function setup() {
  const userPayload = JSON.stringify({
    name: "Load Test User",
    email: `loadtest_${uuidv4()}@test.com`,
    password: "Password123!",
  });
  const userRes = http.post(`${BASE_URL}/users`, userPayload, { headers });
  const userId = userRes.json("id") || userRes.json("data.id");

  const formPayload = JSON.stringify({
    title: "Formulario rampa lineal k6",
    creator_id: userId,
  });
  const formRes = http.post(`${BASE_URL}/forms`, formPayload, { headers });
  const formId = formRes.json("id") || formRes.json("data.id");

  const questionPayload = JSON.stringify({
    form_id: formId,
    text: "Pregunta de rampa lineal",
    type: "text",
  });
  const questionRes = http.post(`${BASE_URL}/questions`, questionPayload, {
    headers,
  });
  const questionId = questionRes.json("id") || questionRes.json("data.id");

  if (formId) {
    http.post(`${BASE_URL}/forms/${formId}/publish`, null, { headers });
  }

  return { userId, formId, questionId };
}

export default function (data) {
  const { userId, formId, questionId } = data;

  group("Users", function () {
    const resGetUser = http.get(`${BASE_URL}/users/${userId}`, { headers });
    check(resGetUser, { "GET /users/:id ok": (r) => r.status < 500 });

    const resListUsers = http.get(`${BASE_URL}/users`, { headers });
    check(resListUsers, { "GET /users ok": (r) => r.status < 500 });
  });

  sleep(0.5);

  group("Forms", function () {
    const resGetForm = http.get(`${BASE_URL}/forms/${formId}`, { headers });
    check(resGetForm, { "GET /forms/:id ok": (r) => r.status < 500 });

    const resListForms = http.get(`${BASE_URL}/forms`, { headers });
    check(resListForms, { "GET /forms ok": (r) => r.status < 500 });
  });

  sleep(0.5);

  group("Questions", function () {
    const resGetQuestion = http.get(`${BASE_URL}/questions/${questionId}`, {
      headers,
    });
    check(resGetQuestion, { "GET /questions/:id ok": (r) => r.status < 500 });
  });

  sleep(0.5);

  group("Answers - POST", function () {
    const payload = JSON.stringify({
      respondent_id: uuidv4(),
      answers: [
        {
          question_id: questionId,
          value: `Respuesta rampa lineal ${uuidv4()}`,
        },
      ],
    });

    const resSubmit = http.post(
      `${BASE_URL}/forms/${formId}/responses`,
      payload,
      { headers },
    );
    check(resSubmit, {
      "POST /responses status ok": (r) => r.status < 500,
      "POST /responses latencia ok": (r) => r.timings.duration < 500,
    });
  });

  sleep(1);
}
