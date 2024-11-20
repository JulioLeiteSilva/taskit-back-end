import * as functions from "firebase-functions";
import { firestore } from "../config/firebaseConfig";
import {Account} from "../models/accountModel"




export const createAccount = async (
  request: functions.https.CallableRequest<{
    account: Omit<Account, 'id' | 'expenses' | 'incomes'>;
  }>
) => {
  // Verifica se o usuário está autenticado
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'O usuário não está autenticado');
  }

  const uid = request.auth.uid;
  const { account } = request.data;
  console.log(account)

  // Valida os dados da conta recebidos
  if (!account || !account.acc_name || !account.acc_type || !account.bank || account.balance === undefined) {
    throw new functions.https.HttpsError('invalid-argument', 'Dados da conta inválidos');
  }

  try {
    // Referência ao documento do usuário no Firestore
    const userDocRef = firestore.collection('users').doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Usuário não encontrado');
    }

    const userData = userDoc.data();
    if (!userData || !Array.isArray(userData.accounts)) {
      throw new functions.https.HttpsError('not-found', 'Dados do usuário não encontrados ou sem contas associadas');
    }

    // Gera um ID único para a nova conta
    const accountId = firestore.collection('users').doc().id;
    const newAccount: Account = {
      id: accountId,
      acc_name: account.acc_name,
      acc_type: account.acc_type,
      bank: account.bank,
      balance: account.balance,
      expenses: [],
      incomes: []
    };

    // Adiciona a nova conta ao array de contas do usuário
    const updatedAccounts = [...userData.accounts, newAccount];

    // Atualiza o array de contas no Firestore
    await userDocRef.update({
      accounts: updatedAccounts,
    });

    return { message: 'Conta criada com sucesso', account: newAccount };
  } catch (error) {
    console.error('Erro ao criar conta:', error);
    throw new functions.https.HttpsError('internal', 'Erro ao criar a conta', error);
  }
};

export const updateAccount = async (
  request: functions.https.CallableRequest<{
    accountId: string;
    account: Partial<Omit<Account, 'id' | 'expenses' | 'incomes'>>;
  }>
) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'O usuário não está autenticado');
  }

  const uid = request.auth.uid;
  const { accountId, account } = request.data;

  // Verificar se os dados necessários foram enviados
  if (!accountId || !account) {
    throw new functions.https.HttpsError('invalid-argument', 'Dados de conta inválidos');
  }

  try {
    // Referência ao documento do usuário no Firestore
    const userDocRef = firestore.collection('users').doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Usuário não encontrado');
    }

    const userData = userDoc.data();
    if (!userData || !Array.isArray(userData.accounts)) {
      throw new functions.https.HttpsError('not-found', 'Dados do usuário não encontrados ou sem contas associadas');
    }

    // Flag para rastrear se a conta foi encontrada
    let accountFound = false;

    // Atualizar a conta no array de contas do usuário
    const updatedAccounts = userData.accounts.map((existingAccount: Account) => {
      if (existingAccount.id === accountId) {
        accountFound = true;
        return {
          ...existingAccount,
          ...account, // Sobrescreve apenas os campos enviados
        };
      }
      return existingAccount;
    });

    // Verificar se a conta foi encontrada
    if (!accountFound) {
      throw new functions.https.HttpsError('not-found', 'Conta não encontrada');
    }

    // Atualizar o array de contas no Firestore
    await userDocRef.update({
      accounts: updatedAccounts,
    });

    return { message: 'Conta atualizada com sucesso', account: { id: accountId, ...account } };
  } catch (error) {
    console.error('Erro ao atualizar conta:', error);
    throw new functions.https.HttpsError('internal', 'Erro ao atualizar a conta', error);
  }
};

export const deleteAccount = async (
  request: functions.https.CallableRequest<{ accountId: string }>
) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'O usuário não está autenticado');
  }

  const uid = request.auth.uid;
  const { accountId } = request.data;

  // Verificar se o ID da conta foi fornecido
  if (!accountId) {
    throw new functions.https.HttpsError('invalid-argument', 'ID da conta é obrigatório');
  }

  try {
    // Referência ao documento do usuário no Firestore
    const userDocRef = firestore.collection('users').doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Usuário não encontrado');
    }

    const userData = userDoc.data();
    if (!userData || !Array.isArray(userData.accounts)) {
      throw new functions.https.HttpsError('not-found', 'Dados do usuário não encontrados ou sem contas associadas');
    }

    // Remover a conta do array de contas do usuário
    const updatedAccounts = userData.accounts.filter((account: Account) => account.id !== accountId);

    // Verificar se alguma conta foi removida
    if (updatedAccounts.length === userData.accounts.length) {
      throw new functions.https.HttpsError('not-found', 'Conta não encontrada');
    }

    // Atualizar o array de contas no Firestore
    await userDocRef.update({
      accounts: updatedAccounts,
    });

    return { message: 'Conta removida com sucesso', accountId };
  } catch (error) {
    console.error('Erro ao remover conta:', error);
    throw new functions.https.HttpsError('internal', 'Erro ao remover a conta', error);
  }
};

export const getAccount = async (
  request: functions.https.CallableRequest<{ accountId: string }>
) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'O usuário não está autenticado');
  }

  const uid = request.auth.uid;
  const { accountId } = request.data;

  // Verificar se o ID da conta foi fornecido
  if (!accountId) {
    throw new functions.https.HttpsError('invalid-argument', 'ID da conta é obrigatório');
  }

  try {
    // Referência ao documento do usuário no Firestore
    const userDocRef = firestore.collection('users').doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Usuário não encontrado');
    }

    const userData = userDoc.data();
    if (!userData || !Array.isArray(userData.accounts)) {
      throw new functions.https.HttpsError('not-found', 'Dados do usuário não encontrados ou sem contas associadas');
    }

    // Procurar a conta pelo ID
    const account = userData.accounts.find((account: Account) => account.id === accountId);

    if (!account) {
      throw new functions.https.HttpsError('not-found', 'Conta não encontrada');
    }

    return { message: 'Conta encontrada com sucesso', account };
  } catch (error) {
    console.error('Erro ao obter conta:', error);
    throw new functions.https.HttpsError('internal', 'Erro ao obter a conta', error);
  }
};

export const getAllAccounts = async (
  request: functions.https.CallableRequest<{}> // Sem parâmetros específicos
) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'O usuário não está autenticado');
  }

  const uid = request.auth.uid;

  try {
    // Referência ao documento do usuário no Firestore
    const userDocRef = firestore.collection('users').doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Usuário não encontrado');
    }

    const userData = userDoc.data();
    if (!userData || !Array.isArray(userData.accounts)) {
      throw new functions.https.HttpsError('not-found', 'Dados do usuário não encontrados ou sem contas associadas');
    }

    // Retornar todas as contas
    const accounts = userData.accounts;

    return { message: 'Contas encontradas com sucesso', accounts };
  } catch (error) {
    console.error('Erro ao obter contas:', error);
    throw new functions.https.HttpsError('internal', 'Erro ao obter as contas', error);
  }
};
