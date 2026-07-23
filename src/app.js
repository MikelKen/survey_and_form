import ultimateExpress from "ultimate-express";
import routes from "./routes/index.routes.js";

const app = ultimateExpress();

app.use(ultimateExpress.json());

app.get("/", (req, res) => {
  res.status(200).send("Welcome Surver From");
});

app.use("/api/v1", routes);

export default app;
