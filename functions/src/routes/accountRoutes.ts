/* eslint-disable max-len */
import * as functions from "firebase-functions";
import { createExpense, updateExpense } from "../controllers/expenseController";
import { createAccount, deleteAccount, getAccount, getAllAccounts, updateAccount } from "../controllers/accountController";


// Exporta as rotas de contas (Account)
export const accountRoutes = {
  createExpense: functions.https.onCall(
    async (request) => await createExpense(request)
  ),
  updateExpense: functions.https.onCall(
    async (request) => await updateExpense(request)
  ),
  createAccount: functions.https.onCall(
    async (request) => await createAccount(request)
  ),
  updateAccount: functions.https.onCall(
    async (request) => await updateAccount(request)
  ),
  deleteAccount: functions.https.onCall(
    async (request) => await deleteAccount(request)
  ),
  getAccount: functions.https.onCall(
    async (request) => await getAccount(request)
  ),
  getAllAccounts: functions.https.onCall(
    async (request) => await getAllAccounts(request)
  ),
};
