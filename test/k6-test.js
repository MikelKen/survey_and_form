import http from "k6/http";
import { check, group, sleep } from "k6";
import { uuidv4 } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

// Aceptamos 200-404 como "no crash", solo 5xx cuenta como fallo real
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 404 }));

export const options = {
  scenarios: {
    carga_normal: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "15s", target: 20 },
        { duration: "30s", target: 50 },
        { duration: "30s", target: 80 },
        { duration: "15s", target: 0 },
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

// -----------------------------------------------------------------
// setup(): se ejecuta UNA sola vez antes de arrancar las VUs.
// Crea datos reales (usuario, formulario, pregunta) para que las
// peticiones de lectura/escritura tengan algo consistente que golpear,
// en vez de usar solo IDs fijos que siempre devuelven 404.
// -----------------------------------------------------------------
export function setup() {
  const userPayload = JSON.stringify({
    name: "Load Test User",
    email: `loadtest_${uuidv4()}@test.com`,
    password: "Password123!",
  });
  const userRes = http.post(`${BASE_URL}/users`, userPayload, { headers });
  const userId = userRes.json("id") || userRes.json("data.id");

  const formPayload = JSON.stringify({
    title: "Formulario de carga k6",
    creator_id: userId,
  });
  const formRes = http.post(`${BASE_URL}/forms`, formPayload, { headers });
  const formId = formRes.json("id") || formRes.json("data.id");

  const questionPayload = JSON.stringify({
    form_id: formId,
    text: "Pregunta de carga",
    type: "text",
  });
  const questionRes = http.post(`${BASE_URL}/questions`, questionPayload, {
    headers,
  });
  const questionId = questionRes.json("id") || questionRes.json("data.id");

  // Publicamos el formulario para que /responses funcione si valida estado
  if (formId) {
    http.post(`${BASE_URL}/forms/${formId}/publish`, null, { headers });
  }

  return { userId, formId, questionId };
}

// -----------------------------------------------------------------
// default(): esto es lo que ejecuta cada VU en bucle. Ahora cubre
// las 4 rutas completas del proyecto, no solo answers.
// -----------------------------------------------------------------
export default function (data) {
  const { userId, formId, questionId } = data;

  group("Users", function () {
    const resGetUser = http.get(`${BASE_URL}/users/${userId}`, { headers });
    check(resGetUser, { "GET /users/:id ok": (r) => r.status < 500 });

    const resListUsers = http.get(`${BASE_URL}/users`, { headers });
    check(resListUsers, { "GET /users ok": (r) => r.status < 500 });

    const loginPayload = JSON.stringify({
      email: `loadtest_${uuidv4()}@test.com`, // no existe, valida rechazo controlado
      password: "wrongpass",
    });
    const resLogin = http.post(`${BASE_URL}/users/login`, loginPayload, {
      headers,
    });
    check(resLogin, { "POST /users/login responde": (r) => r.status < 500 });
  });

  sleep(0.5);

  group("Forms", function () {
    const resGetForm = http.get(`${BASE_URL}/forms/${formId}`, { headers });
    check(resGetForm, { "GET /forms/:id ok": (r) => r.status < 500 });

    const resListForms = http.get(`${BASE_URL}/forms`, { headers });
    check(resListForms, { "GET /forms ok": (r) => r.status < 500 });

    const resUpdateForm = http.put(
      `${BASE_URL}/forms/${formId}`,
      JSON.stringify({ title: `Formulario actualizado ${uuidv4()}` }),
      { headers },
    );
    check(resUpdateForm, { "PUT /forms/:id ok": (r) => r.status < 500 });
  });

  sleep(0.5);

  group("Questions", function () {
    const resListQuestions = http.get(`${BASE_URL}/forms/${formId}/questions`, {
      headers,
    });
    check(resListQuestions, {
      "GET /forms/:id/questions ok": (r) => r.status < 500,
    });

    const resGetQuestion = http.get(`${BASE_URL}/questions/${questionId}`, {
      headers,
    });
    check(resGetQuestion, { "GET /questions/:id ok": (r) => r.status < 500 });

    const resUpdateQuestion = http.put(
      `${BASE_URL}/questions/${questionId}`,
      JSON.stringify({ text: `Pregunta editada ${uuidv4()}` }),
      { headers },
    );
    check(resUpdateQuestion, {
      "PUT /questions/:id ok": (r) => r.status < 500,
    });
  });

  sleep(0.5);

  group("Answers - GET", function () {
    const resResults = http.get(`${BASE_URL}/forms/${formId}/results`, {
      headers,
    });
    check(resResults, { "GET /results ok": (r) => r.status < 500 });

    const resSubmissions = http.get(`${BASE_URL}/forms/${formId}/submissions`, {
      headers,
    });
    check(resSubmissions, { "GET /submissions ok": (r) => r.status < 500 });
  });

  sleep(0.5);

  group("Answers - POST", function () {
    const payload = JSON.stringify({
      respondent_id: uuidv4(),
      answers: [
        {
          question_id: questionId,
          value: `Respuesta de carga ${uuidv4()}`,
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

    // Si la respuesta trae un submission id, consultamos su detalle también
    const submissionId =
      resSubmit.json("id") || resSubmit.json("data.id") || null;
    if (submissionId) {
      const resDetail = http.get(`${BASE_URL}/submissions/${submissionId}`, {
        headers,
      });
      check(resDetail, {
        "GET /submissions/:id ok": (r) => r.status < 500,
      });
    }
  });

  sleep(1);
}
