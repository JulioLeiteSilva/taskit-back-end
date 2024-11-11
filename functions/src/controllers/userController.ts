/* eslint-disable max-len */
import * as functions from "firebase-functions";
import {firestore} from "../config/firebaseConfig";
import {User} from "../models/userModel";

// Função para criar um novo usuário
export const createUser = async (request: functions.https.CallableRequest<User>) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "O usuário não está autenticado");
  }

  const uid = request.auth.uid;
  const newUser: User = {
    id: uid,
    name: request.data.name,
    email: request.data.email,
    cell: request.data.cell,
    accounts: [], // Usuário inicial sem contas
    categories: [], // Usuário inicial sem categorias personalizadas
    tasks: [], // Usuário inicial sem tarefas
  };

  try {
    await firestore.collection("users").doc(uid).set(newUser);
    return {message: "Usuário criado com sucesso", user: newUser};
  } catch (error) {
    throw new functions.https.HttpsError("internal", "Erro ao criar o usuário");
  }
};

// Função para buscar as informações do usuário
export const getUser = async (request: functions.https.CallableRequest<{ uid: string }>) => {
  const {uid} = request.data;

  if (!uid) {
    throw new functions.https.HttpsError("invalid-argument", "O campo UID é obrigatório");
  }

  try {
    const userDoc = await firestore.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Usuário não encontrado");
    }
    return {user: userDoc.data()};
  } catch (error) {
    throw new functions.https.HttpsError("internal", "Erro ao buscar o usuário");
  }
};


// Função para atualizar as informações do usuário
export const updateUser = async (request: functions.https.CallableRequest<Partial<User>>) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "O usuário não está autenticado");
  }

  const uid = request.auth.uid;

  try {
    await firestore.collection("users").doc(uid).update({
      name: request.data.name,
      email: request.data.email,
      cell: request.data.cell,
    });
    return {message: "Usuário atualizado com sucesso"};
  } catch (error) {
    throw new functions.https.HttpsError("internal", "Erro ao atualizar o usuário");
  }
};

// Função para excluir o usuário
export const deleteUser = async (request: functions.https.CallableRequest<{ uid: string }>) => {
  const {uid} = request.data;

  if (!uid) {
    throw new functions.https.HttpsError("invalid-argument", "O campo UID é obrigatório");
  }

  try {
    await firestore.collection("users").doc(uid).delete();
    return {message: "Usuário excluído com sucesso"};
  } catch (error) {
    throw new functions.https.HttpsError("internal", "Erro ao excluir o usuário");
  }
};

