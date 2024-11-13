import * as functions from "firebase-functions";
import { firestore } from "../config/firebaseConfig";
import { Expense } from "../models/expenseModel";

export const createExpense = async (request: functions.https.CallableRequest<{ 
    accountId: string; 
    expense: Omit<Expense, 'id'>;
  }>) => {
    if (!request.auth) {
      throw new functions.https.HttpsError("unauthenticated", "O usuário não está autenticado");
    }
  
    const uid = request.auth.uid;
    const { accountId, expense } = request.data;
  
    if (!accountId || !expense || !expense.exp_name || expense.value === undefined || !expense.date) {
      throw new functions.https.HttpsError("invalid-argument", "Dados de despesa inválidos");
    }
  
    try {
      const userDocRef = firestore.collection("users").doc(uid);
      const userDoc = await userDocRef.get();
  
      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Usuário não encontrado");
      }
  
      const userData = userDoc.data();
      if (!userData || !Array.isArray(userData.accounts)) {
        throw new functions.https.HttpsError("not-found", "Dados do usuário não encontrados ou sem contas associadas");
      }
  
      // Gerar um ID único para a nova despesa
      const expenseId = firestore.collection("users").doc().id;
      const newExpense = { ...expense, id: expenseId };
  
      // Adicionar a despesa ao array da conta especificada
      const updatedAccounts = userData.accounts.map((account: any) => {
        if (account.id === accountId) {
          return {
            ...account,
            expenses: [...(account.expenses || []), newExpense],
          };
        } else {
            throw new functions.https.HttpsError("not-found", "Dados do usuário não encontrados ou sem contas associadas");
        }
      });
  
      // Atualizar o array de contas no Firestore
      await userDocRef.update({
        accounts: updatedAccounts,
      });
  
      return { message: "Despesa criada com sucesso", expense: newExpense };
    } catch (error) {
      console.error("Erro ao criar despesa:", error);
      throw new functions.https.HttpsError("internal", "Erro ao criar a despesa", error);
    }
  };

  export const updateExpense = async (request: functions.https.CallableRequest<{ 
    accountId: string; 
    expense: Expense;
  }>) => {
    if (!request.auth) {
      throw new functions.https.HttpsError("unauthenticated", "O usuário não está autenticado");
    }
  
    const uid = request.auth.uid;
    const { accountId, expense } = request.data;
  
    // Verificar se todos os dados necessários foram enviados
    if (!accountId || !expense || !expense.id) {
      throw new functions.https.HttpsError("invalid-argument", "Dados de despesa inválidos");
    }
  
    try {
      const userDocRef = firestore.collection("users").doc(uid);
      const userDoc = await userDocRef.get();
  
      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Usuário não encontrado");
      }
  
      const userData = userDoc.data();
      if (!userData || !Array.isArray(userData.accounts)) {
        throw new functions.https.HttpsError("not-found", "Dados do usuário não encontrados ou sem contas associadas");
      }
  
      // Flag para rastrear se a despesa foi encontrada
    let expenseFound = false;

    // Mapear o array de contas e encontrar a despesa a ser atualizada
    const updatedAccounts = userData.accounts.map((account: any) => {
      if (account.id === accountId) {
        const updatedExpenses = account.expenses.map((existingExpense: Expense) => {
          if (existingExpense.id === expense.id) {
            expenseFound = true;
            return { ...expense, id: existingExpense.id };
          }
          return existingExpense;
        });
        return { ...account, expenses: updatedExpenses };
      }
      return account;
    });

    // Verificar se a despesa foi encontrada
    if (!expenseFound) {
      throw new functions.https.HttpsError("not-found", "Despesa não encontrada");
    }
  
      // Atualizar o array de contas completo no Firestore
      await userDocRef.update({
        accounts: updatedAccounts,
      });
  
      return { message: "Despesa atualizada com sucesso", expense };
    } catch (error) {
      console.error("Erro ao atualizar despesa:", error);
      throw new functions.https.HttpsError("internal", "Erro ao atualizar a despesa", error);
    }
  };