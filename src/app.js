import ultimateExpress from "ultimate-express";
import routes from "./routes/index.routes.js";
import helmet from "helmet";
import cors from "cors";

const app = ultimateExpress();

app.use(helmet());

app.use(
  cors({
    origin: ["*"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-traceid",
      "x-clientid",
    ],
  }),
);

app.use(ultimateExpress.json());

app.get("/", (req, res) => {
  res.status(200).send("Welcome Surver and From API");
});

app.use("/api/v1", routes);

export default app;
