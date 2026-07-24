import http from "k6/http";
import { check, group, sleep } from "k6";
import { uuidv4 } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

// Aceptamos 200-404 como "no crash", solo 5xx cuenta como fallo real
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 404 }));

// -----------------------------------------------------------------
// SPIKE TEST: sube y baja de golpe, sin transición suave.
// Sirve para ver si tu API se recupera bien ante picos repentinos
// de tráfico (ej. una campaña, un enlace viral, etc.), en vez de
// un crecimiento gradual y predecible.
// -----------------------------------------------------------------
export const options = {
  scenarios: {
    spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 10 }, // calentamiento suave
        { duration: "5s", target: 150 }, // SALTO BRUSCO hacia arriba
        { duration: "20s", target: 150 }, // se mantiene arriba (meseta del pico)
        { duration: "5s", target: 10 }, // CAÍDA BRUSCA hacia abajo
        { duration: "15s", target: 10 }, // se mantiene baja (recuperación)
        { duration: "5s", target: 200 }, // SEGUNDO SALTO, más alto
        { duration: "20s", target: 200 }, // meseta más alta
        { duration: "5s", target: 0 }, // caída total a cero
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
    title: "Formulario spike test k6",
    creator_id: userId,
  });
  const formRes = http.post(`${BASE_URL}/forms`, formPayload, { headers });
  const formId = formRes.json("id") || formRes.json("data.id");

  const questionPayload = JSON.stringify({
    form_id: formId,
    text: "Pregunta de spike test",
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

  sleep(0.3);

  group("Forms", function () {
    const resGetForm = http.get(`${BASE_URL}/forms/${formId}`, { headers });
    check(resGetForm, { "GET /forms/:id ok": (r) => r.status < 500 });

    const resListForms = http.get(`${BASE_URL}/forms`, { headers });
    check(resListForms, { "GET /forms ok": (r) => r.status < 500 });
  });

  sleep(0.3);

  group("Questions", function () {
    const resGetQuestion = http.get(`${BASE_URL}/questions/${questionId}`, {
      headers,
    });
    check(resGetQuestion, { "GET /questions/:id ok": (r) => r.status < 500 });
  });

  sleep(0.3);

  group("Answers - POST", function () {
    const payload = JSON.stringify({
      respondent_id: uuidv4(),
      answers: [
        {
          question_id: questionId,
          value: `Respuesta spike test ${uuidv4()}`,
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

  sleep(0.5);
}
