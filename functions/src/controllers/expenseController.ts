import * as functions from "firebase-functions";
import { firestore } from "../config/firebaseConfig";
import { Expense } from "../models/expenseModel";
import { updateAccountBalance } from "./accountController";
import { Account } from "../models/accountModel";

interface InternalCreateExpense {
  accountId: string;
  expenses: Omit<Expense, "id"> | Array<Omit<Expense, "id">>;
}

interface InternalDeleteExpense {
  accountId: string;
  expenseId: string;
}

const generateFixedExpenses = (
  expense: Omit<Expense, "id">,
  startDate: string
): Expense[] => {
  if (!startDate) {
    throw new Error("Despesas fixas devem ter uma data de início válida.");
  }

  const expenseDate = new Date(startDate);
  const generatedExpenses: Expense[] = [];

  let isFirst = true; // Flag para a primeira instância

  // Garantir que gere despesas para os próximos 12 meses
  for (let i = 0; i < 12; i++) {
    // Adiciona despesa com o mesmo dia original
    generatedExpenses.push({
      ...expense,
      id: `${firestore.collection("users").doc().id}-${
        expenseDate.getMonth() + 1
      }-${expenseDate.getFullYear()}`,
      date: `${expenseDate.getFullYear()}-${(expenseDate.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${expenseDate
        .getDate()
        .toString()
        .padStart(2, "0")}`,
      paid: isFirst ? expense.paid : false, // Apenas a primeira mantém o status original
    });

    isFirst = false; // Todas as próximas instâncias terão `paid: false`

    // Incrementa para o próximo mês
    expenseDate.setMonth(expenseDate.getMonth() + 1);
  }

  return generatedExpenses;
};

export const createExpense = async (
  request:
    | functions.https.CallableRequest<InternalCreateExpense>
    | InternalCreateExpense,
  uidFromFunction?: string
) => {
  const uid =
    "auth" in request && request.auth?.uid // Chamadas externas
      ? request.auth.uid
      : uidFromFunction; // Chamadas internas

  if (!uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "O usuário não está autenticado"
    );
  }

  const { accountId, expenses } = "data" in request ? request.data : request; // Verifica se é chamada externa ou interna

  if (!accountId || !expenses) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Dados de despesa inválidos"
    );
  }

  const expenseArray = Array.isArray(expenses) ? expenses : [expenses];

  if (expenseArray.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Nenhuma despesa fornecida"
    );
  }

  try {
    const userDocRef = firestore.collection("users").doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Usuário não encontrado"
      );
    }

    const userData = userDoc.data();
    if (!userData || !Array.isArray(userData.accounts)) {
      throw new functions.https.HttpsError(
        "not-found",
        "Dados do usuário não encontrados ou sem contas associadas"
      );
    }

    const newExpenses = expenseArray.flatMap((expense) => {
      if (expense.fixed) {
        if (!expense.startDate) {
          throw new functions.https.HttpsError(
            "invalid-argument",
            "Despesas fixas devem ter uma data de início."
          );
        }
        return generateFixedExpenses(expense, expense.startDate); // Gera instâncias para despesas fixas
      }
      return {
        ...expense,
        id: firestore.collection("users").doc().id,
      };
    });

    let totalPaidExpenses = 0; // Acumula o valor total das despesas pagas
    const updatedAccounts = userData.accounts.map((account: Account) => {
      if (account.id === accountId) {
        const updatedExpenses = [...(account.expenses || []), ...newExpenses];

        newExpenses.forEach((expense) => {
          if (expense.paid) {
            totalPaidExpenses += expense.value;
          }
        });

        return {
          ...account,
          expenses: updatedExpenses,
        };
      }
      return account; // Mantém as outras contas inalteradas
    });

    if (!updatedAccounts.some((account: Account) => account.id === accountId)) {
      throw new functions.https.HttpsError(
        "not-found",
        "Conta especificada não encontrada"
      );
    }

    // Atualizar o array de contas no Firestore
    await userDocRef.update({
      accounts: updatedAccounts,
    });

    // Atualizar o saldo no Firestore se houver despesas pagas
    if (totalPaidExpenses > 0) {
      await updateAccountBalance(uid, accountId, totalPaidExpenses, "subtract");
    }

    return { message: "Despesas criadas com sucesso", expenses: newExpenses };
  } catch (error) {
    console.error("Erro ao criar despesa:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erro ao criar a despesa",
      error
    );
  }
};

export const deleteExpense = async (
  request:
    | functions.https.CallableRequest<
        InternalDeleteExpense & { expenseIds?: string[] }
      >
    | (InternalDeleteExpense & { expenseIds?: string[] }), // Suporte para múltiplos IDs
  uidFromFunction?: string // UID opcional para chamadas internas
) => {
  const uid =
    "auth" in request && request.auth?.uid // Chamadas externas
      ? request.auth.uid
      : uidFromFunction; // Chamadas internas

  if (!uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "O usuário não está autenticado"
    );
  }

  const { accountId, expenseId, expenseIds } =
    "data" in request ? request.data : request; // Verifica se é chamada externa ou interna

  if (!accountId || (!expenseId && (!expenseIds || expenseIds.length === 0))) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Dados inválidos fornecidos para exclusão de despesa"
    );
  }

  try {
    const userDocRef = firestore.collection("users").doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Usuário não encontrado"
      );
    }

    const userData = userDoc.data();
    if (!userData || !Array.isArray(userData.accounts)) {
      throw new functions.https.HttpsError(
        "not-found",
        "Dados do usuário inválidos ou sem contas associadas"
      );
    }

    let totalBalanceAdjustment = 0; // Para ajustar o saldo das contas

    const updatedAccounts = userData.accounts.map((account: Account) => {
      if (account.id === accountId) {
        const idsToDelete = expenseIds || [expenseId]; // Suporte para múltiplos IDs ou único

        const updatedExpenses = account.expenses.filter((expense: Expense) => {
          if (idsToDelete.includes(expense.id)) {
            // Atualiza o saldo, se necessário
            if (expense.paid) {
              totalBalanceAdjustment += expense.value; // Reverte o saldo
            }
            return false; // Exclui a despesa
          }
          return true; // Mantém a despesa
        });

        return {
          ...account,
          expenses: updatedExpenses,
        };
      }
      return account; // Outras contas permanecem inalteradas
    });

    // Verifica se a conta foi encontrada
    if (!updatedAccounts.some((account: Account) => account.id === accountId)) {
      throw new functions.https.HttpsError(
        "not-found",
        "Conta especificada não encontrada"
      );
    }

    // Atualizar o Firestore
    await userDocRef.update({ accounts: updatedAccounts });

    // Atualizar o saldo no Firestore
    if (totalBalanceAdjustment > 0) {
      await updateAccountBalance(uid, accountId, totalBalanceAdjustment, "add");
    }

    return {
      message: `Despesas removidas com sucesso: ${expenseIds || [expenseId]}`,
    };
  } catch (error) {
    console.error("Erro ao remover despesa:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erro ao remover a despesa",
      error
    );
  }
};

export const updateExpense = async (
  request: functions.https.CallableRequest<{
    oldAccountId?: string; // ID da conta antiga (se a conta foi alterada)
    newAccountId: string; // ID da conta nova (ou atual)
    expense: Expense; // Dados atualizados da despesa
  }>
) => {
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "O usuário não está autenticado"
    );
  }

  const uid = request.auth.uid;
  const { oldAccountId, newAccountId, expense } = request.data;

  if (!newAccountId || !expense || !expense.id || expense.value === undefined) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Dados de despesa inválidos"
    );
  }

  try {
    // Caso a conta tenha sido alterada
    if (oldAccountId && oldAccountId !== newAccountId) {
      // 1. Deletar a despesa da conta antiga
      await deleteExpense(
        {
          accountId: oldAccountId,
          expenseId: expense.id,
        },
        uid // Passa o UID explicitamente
      );

      // 2. Criar a despesa na nova conta
      await createExpense(
        {
          accountId: newAccountId,
          expenses: expense,
        },
        uid // Passar o UID explicitamente
      );

      return { message: "Despesa movida para outra conta com sucesso" };
    }

    // Caso a despesa permaneça na mesma conta
    const userDocRef = firestore.collection("users").doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Usuário não encontrado"
      );
    }

    const userData = userDoc.data();
    if (!userData || !Array.isArray(userData.accounts)) {
      throw new functions.https.HttpsError(
        "not-found",
        "Dados do usuário inválidos ou sem contas associadas"
      );
    }

    let totalBalanceAdjustment = 0; // Para rastrear os ajustes no saldo
    let updatedAccounts = userData.accounts.map((account: Account) => {
      if (account.id === newAccountId) {
        const existingExpenseIndex = account.expenses.findIndex(
          (e: Expense) => e.id === expense.id
        );

        if (existingExpenseIndex >= 0) {
          const oldExpense = account.expenses[existingExpenseIndex];

          // Ajustar saldo conforme mudanças
          if (
            oldExpense.paid !== expense.paid ||
            oldExpense.value !== expense.value
          ) {
            // Reverter o saldo do valor antigo, se pago
            if (oldExpense.paid) {
              totalBalanceAdjustment += oldExpense.value;
            }

            // Subtrair o novo valor, se pago
            if (expense.paid) {
              totalBalanceAdjustment -= expense.value;
            }
          }

          // Atualizar a despesa no array
          account.expenses[existingExpenseIndex] = {
            ...oldExpense,
            ...expense,
          };
        } else {
          throw new functions.https.HttpsError(
            "not-found",
            "Despesa não encontrada na conta"
          );
        }

        return account;
      }

      return account; // Outras contas permanecem inalteradas
    });

    // Atualizar o Firestore
    await userDocRef.update({ accounts: updatedAccounts });

    // Ajustar o saldo da conta, se necessário
    if (totalBalanceAdjustment !== 0) {
      await updateAccountBalance(
        uid,
        newAccountId,
        Math.abs(totalBalanceAdjustment),
        totalBalanceAdjustment > 0 ? "add" : "subtract"
      );
    }

    return { message: "Despesa atualizada com sucesso" };
  } catch (error) {
    console.error("Erro ao atualizar despesa:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erro ao atualizar a despesa",
      error
    );
  }
};

export const getExpense = async (
  request: functions.https.CallableRequest<{
    expenseId: string;
  }>
) => {
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "O usuário não está autenticado"
    );
  }

  const uid = request.auth.uid;
  const { expenseId } = request.data;

  if (!expenseId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "O ID da despesa não foi fornecido"
    );
  }

  try {
    const userDocRef = firestore.collection("users").doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Usuário não encontrado"
      );
    }

    const userData = userDoc.data();
    if (!userData || !Array.isArray(userData.accounts)) {
      throw new functions.https.HttpsError(
        "not-found",
        "Dados do usuário inválidos ou sem contas associadas"
      );
    }

    // Procurar a despesa em todas as contas
    for (const account of userData.accounts) {
      const expense = account.expenses.find((e: Expense) => e.id === expenseId);
      if (expense) {
        return {
          expense,
          accountId: account.id, // Retorna o ID da conta onde a despesa está
        };
      }
    }

    throw new functions.https.HttpsError("not-found", "Despesa não encontrada");
  } catch (error) {
    console.error("Erro ao buscar a despesa:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erro ao buscar a despesa",
      error
    );
  }
};

export const getAllExpenses = async (
  request: functions.https.CallableRequest<null>
) => {
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "O usuário não está autenticado"
    );
  }

  const uid = request.auth.uid;

  try {
    const userDocRef = firestore.collection("users").doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Usuário não encontrado"
      );
    }

    const userData = userDoc.data();
    if (!userData || !Array.isArray(userData.accounts)) {
      throw new functions.https.HttpsError(
        "not-found",
        "Dados do usuário inválidos ou sem contas associadas"
      );
    }

    // Extrair todas as despesas por conta
    const expensesByAccount = userData.accounts.map((account: Account) => ({
      accountId: account.id,
      accountName: account.acc_name,
      expenses: account.expenses || [],
    }));

    return {
      expensesByAccount,
    };
  } catch (error) {
    console.error("Erro ao buscar todas as despesas:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erro ao buscar todas as despesas",
      error
    );
  }
};
