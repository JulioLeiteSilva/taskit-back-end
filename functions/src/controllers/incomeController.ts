import * as functions from "firebase-functions";
import { firestore } from "../config/firebaseConfig";
import { Income } from "../models/incomeModel";
import { updateAccountBalance } from "./accountController";
import { Account } from "../models/accountModel";

interface InternalCreateIncome {
  accountId: string;
  incomes: Omit<Income, "id"> | Array<Omit<Income, "id">>;
}

interface InternalDeleteIncome {
  accountId: string;
  incomeId: string;
}

const generateFixedIncomes = (
  income: Omit<Income, "id">,
  startDate: string
): Income[] => {
  if (!startDate) {
    throw new Error("Receitas fixas devem ter uma data de início válida.");
  }

  const currentDate = new Date();
  const incomeDate = new Date(startDate);
  const generatedIncomes: Income[] = [];

  let isFirst = true; // Flag para a primeira instância

  while (
    incomeDate.getFullYear() < currentDate.getFullYear() ||
    (incomeDate.getFullYear() === currentDate.getFullYear() &&
      incomeDate.getMonth() <= currentDate.getMonth())
  ) {
    generatedIncomes.push({
      ...income,
      id: `${firestore.collection("users").doc().id}-${
        incomeDate.getMonth() + 1
      }-${incomeDate.getFullYear()}`,
      date: `${incomeDate.getFullYear()}-${(incomeDate.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-01`,
      paid: isFirst ? income.paid : false, // Apenas a primeira mantém o status original
    });

    isFirst = false; // As próximas instâncias terão `paid: false`
    incomeDate.setMonth(incomeDate.getMonth() + 1);
  }

  return generatedIncomes;
};

export const createIncome = async (
  request:
    | functions.https.CallableRequest<InternalCreateIncome>
    | InternalCreateIncome,
  uidFromFunction?: string
) => {
  const uid =
    "auth" in request && request.auth?.uid ? request.auth.uid : uidFromFunction;

  if (!uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "O usuário não está autenticado"
    );
  }

  const { accountId, incomes } = "data" in request ? request.data : request;

  if (!accountId || !incomes) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Dados de receita inválidos"
    );
  }

  const incomeArray = Array.isArray(incomes) ? incomes : [incomes];

  if (incomeArray.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Nenhuma receita fornecida"
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

    const newIncomes = incomeArray.flatMap((income) => {
      if (income.fixed) {
        if (!income.startDate) {
          throw new functions.https.HttpsError(
            "invalid-argument",
            "Receitas fixas devem ter uma data de início."
          );
        }
        return generateFixedIncomes(income, income.startDate);
      }

      return {
        ...income,
        id: firestore.collection("users").doc().id,
      };
    });

    let totalPaidIncomes = 0;
    const updatedAccounts = userData.accounts.map((account: Account) => {
      if (account.id === accountId) {
        const updatedIncomes = [...(account.incomes || []), ...newIncomes];

        newIncomes.forEach((income) => {
          if (income.paid) {
            totalPaidIncomes += income.value;
          }
        });

        return {
          ...account,
          incomes: updatedIncomes,
        };
      }
      return account;
    });

    if (!updatedAccounts.some((account: Account) => account.id === accountId)) {
      throw new functions.https.HttpsError(
        "not-found",
        "Conta especificada não encontrada"
      );
    }

    await userDocRef.update({
      accounts: updatedAccounts,
    });

    if (totalPaidIncomes > 0) {
      await updateAccountBalance(uid, accountId, totalPaidIncomes, "add");
    }

    return { message: "Receitas criadas com sucesso", incomes: newIncomes };
  } catch (error) {
    console.error("Erro ao criar receita:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erro ao criar a receita",
      error
    );
  }
};

export const deleteIncome = async (
  request:
    | functions.https.CallableRequest<
        InternalDeleteIncome & { incomeIds?: string[] }
      >
    | (InternalDeleteIncome & { incomeIds?: string[] }),
  uidFromFunction?: string
) => {
  const uid =
    "auth" in request && request.auth?.uid ? request.auth.uid : uidFromFunction;

  if (!uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "O usuário não está autenticado"
    );
  }

  const { accountId, incomeId, incomeIds } =
    "data" in request ? request.data : request;

  if (!accountId || (!incomeId && (!incomeIds || incomeIds.length === 0))) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Dados inválidos fornecidos para exclusão de receita"
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

    let totalBalanceAdjustment = 0;

    const updatedAccounts = userData.accounts.map((account: Account) => {
      if (account.id === accountId) {
        const idsToDelete = incomeIds || [incomeId];

        const updatedIncomes = account.incomes.filter((income: Income) => {
          if (idsToDelete.includes(income.id)) {
            if (income.paid) {
              totalBalanceAdjustment -= income.value;
            }
            return false;
          }
          return true;
        });

        return {
          ...account,
          incomes: updatedIncomes,
        };
      }
      return account;
    });

    if (!updatedAccounts.some((account: Account) => account.id === accountId)) {
      throw new functions.https.HttpsError(
        "not-found",
        "Conta especificada não encontrada"
      );
    }

    await userDocRef.update({ accounts: updatedAccounts });

    if (totalBalanceAdjustment !== 0) {
      await updateAccountBalance(
        uid,
        accountId,
        Math.abs(totalBalanceAdjustment),
        "subtract"
      );
    }

    return {
      message: `Receitas removidas com sucesso: ${incomeIds || [incomeId]}`,
    };
  } catch (error) {
    console.error("Erro ao remover receita:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erro ao remover a receita",
      error
    );
  }
};

export const updateIncome = async (
  request: functions.https.CallableRequest<{
    oldAccountId?: string;
    newAccountId: string;
    income: Income;
  }>
) => {
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "O usuário não está autenticado"
    );
  }

  const uid = request.auth.uid;
  const { oldAccountId, newAccountId, income } = request.data;

  if (!newAccountId || !income || !income.id || income.value === undefined) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Dados de receita inválidos"
    );
  }

  try {
    // Caso a conta tenha sido alterada
    if (oldAccountId && oldAccountId !== newAccountId) {
      // 1. Deletar a receita da conta antiga
      await deleteIncome(
        {
          accountId: oldAccountId,
          incomeId: income.id,
        },
        uid // Passa o UID explicitamente
      );

      // 2. Criar a receita na nova conta
      await createIncome(
        {
          accountId: newAccountId,
          incomes: income,
        },
        uid // Passar o UID explicitamente
      );

      return { message: "Receita movida para outra conta com sucesso" };
    }

    // Caso a receita permaneça na mesma conta
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
        const existingincomeIndex = account.incomes.findIndex(
          (inc: Income) => inc.id === income.id
        );

        if (existingincomeIndex >= 0) {
          const oldincome = account.incomes[existingincomeIndex];

          // Ajustar saldo conforme mudanças
          if (
            oldincome.paid !== income.paid ||
            oldincome.value !== income.value
          ) {
            // Reverter o saldo do valor antigo, se pago
            if (oldincome.paid) {
              totalBalanceAdjustment += oldincome.value;
            }

            // Subtrair o novo valor, se pago
            if (income.paid) {
              totalBalanceAdjustment -= income.value;
            }
          }

          // Atualizar a receita no array
          account.incomes[existingincomeIndex] = {
            ...oldincome,
            ...income,
          };
        } else {
          throw new functions.https.HttpsError(
            "not-found",
            "Receita não encontrada na conta"
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
        totalBalanceAdjustment < 0 ? "add" : "subtract"
      );
    }

    return { message: "Receita atualizada com sucesso" };
  } catch (error) {
    console.error("Erro ao atualizar receita:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erro ao atualizar a receita",
      error
    );
  }
};

export const getIncome = async (
  request: functions.https.CallableRequest<{
    incomeId: string;
  }>
) => {
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "O usuário não está autenticado"
    );
  }

  const uid = request.auth.uid;
  const { incomeId } = request.data;

  if (!incomeId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "O ID da receita não foi fornecido"
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

    // Procurar a receita em todas as contas
    for (const account of userData.accounts) {
      const income = account.incomes.find((inc: Income) => inc.id === incomeId);
      if (income) {
        return {
          income,
          accountId: account.id, // Retorna o ID da conta onde a receita está
        };
      }
    }

    throw new functions.https.HttpsError("not-found", "Receita não encontrada");
  } catch (error) {
    console.error("Erro ao buscar a receita:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erro ao buscar a receita",
      error
    );
  }
};

export const getAllIncomes = async (
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

    // Extrair todas as receitas por conta
    const IncomesByAccount = userData.accounts.map((account: Account) => ({
      accountId: account.id,
      accountName: account.acc_name,
      incomes: account.incomes || [],
    }));

    return {
      IncomesByAccount,
    };
  } catch (error) {
    console.error("Erro ao buscar todas as receitas:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erro ao buscar todas as receitas",
      error
    );
  }
};
