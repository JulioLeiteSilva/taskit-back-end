/* eslint-disable max-len */
import * as functions from "firebase-functions";
import { createExpense, updateExpense } from "../controllers/expenseController";

// Exporta as rotas de contas (Account)
export const accountRoutes = {
  createExpense: functions.https.onCall(
    async (request) => await createExpense(request)
  ),
  updateExpense: functions.https.onCall(
    async (request) => await updateExpense(request)
  ),
};
