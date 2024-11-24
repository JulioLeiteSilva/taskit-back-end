/* eslint-disable max-len */
import * as functions from "firebase-functions";
import {
  createExpense,
  deleteExpense,
  getAllExpenses,
  getExpense,
  updateExpense,
} from "../controllers/expenseController";
import {
  createAccount,
  deleteAccount,
  getAccount,
  getAllAccounts,
  updateAccount,
} from "../controllers/accountController";
import {
  createIncome,
  deleteIncome,
  getAllIncomes,
  getIncome,
  updateIncome,
} from "../controllers/incomeController";

export const accountRoutes = {
  // Expenses
  createExpense: functions.https.onCall(
    async (request) => await createExpense(request)
  ),
  updateExpense: functions.https.onCall(
    async (request) => await updateExpense(request)
  ),
  deleteExpense: functions.https.onCall(
    async (request) => await deleteExpense(request)
  ),
  getExpense: functions.https.onCall(
    async (request) => await getExpense(request)
  ),
  getAllExpenses: functions.https.onCall(
    async (request) => await getAllExpenses(request)
  ),
  // Incomes
  createIncome: functions.https.onCall(
    async (request) => await createIncome(request)
  ),
  updateIncome: functions.https.onCall(
    async (request) => await updateIncome(request)
  ),
  deleteIncome: functions.https.onCall(
    async (request) => await deleteIncome(request)
  ),
  getIncome: functions.https.onCall(
    async (request) => await getIncome(request)
  ),
  getAllIncomes: functions.https.onCall(
    async (request) => await getAllIncomes(request)
  ),
  // Account
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
