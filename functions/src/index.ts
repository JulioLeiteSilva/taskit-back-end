import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { userRoutes } from "./routes/userRoutes";
import { accountRoutes } from "./routes/accountRoutes";

exports.user = userRoutes;
exports.account = accountRoutes;
export const helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Firebase!");
});
