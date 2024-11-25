import * as functions from "firebase-functions";
import { firestore } from "../config/firebaseConfig";
import { categoryModel } from "../models/categoryModel";

export const createCategory = async (
  request: functions.https.CallableRequest<{ category: categoryModel }>
) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "O usuário não está autenticado");
  }

  const uid = request.auth.uid;
  const { category } = request.data;

  // Validar os dados da categoria recebida
  if (!category || !category.name || !category.type) {
    throw new functions.https.HttpsError("invalid-argument", "Dados da categoria inválidos");
  }

  try {
    // Referência ao documento do usuário no Firestore
    const userDocRef = firestore.collection("users").doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Usuário não encontrado");
    }

    const userData = userDoc.data();
    if (!userData) {
      throw new functions.https.HttpsError("not-found", "Dados do usuário não encontrados");
    }

    // Normalizar os nomes das categorias para comparação
    const newCategoryName = category.name.toLowerCase();

    // Verificar se a categoria já existe
    if (userData.categories && userData.categories.some((c: categoryModel) => c.name.toLowerCase() === newCategoryName)) {
      throw new functions.https.HttpsError("already-exists", "Categoria já existente");
    }

    // Adicionar a nova categoria ao array
    const updatedCategories = [...(userData.categories || []), category];

    // Atualizar o array de categorias no Firestore
    await userDocRef.update({
      categories: updatedCategories,
    });

    return { message: "Categoria criada com sucesso", category };
  } catch (error) {
    console.error("Erro ao criar categoria:", error);
    throw new functions.https.HttpsError("internal", "Erro ao criar a categoria", error);
  }
};


export const deleteCategory = async (
  request: functions.https.CallableRequest<{ categoryName: string }>
) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "O usuário não está autenticado");
  }

  const uid = request.auth.uid;
  const { categoryName } = request.data;

  // Validar se o nome da categoria foi fornecido
  if (!categoryName) {
    throw new functions.https.HttpsError("invalid-argument", "Nome da categoria é obrigatório");
  }

  try {
    // Referência ao documento do usuário no Firestore
    const userDocRef = firestore.collection("users").doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Usuário não encontrado");
    }

    const userData = userDoc.data();
    if (!userData || !Array.isArray(userData.categories)) {
      throw new functions.https.HttpsError("not-found", "Categorias não encontradas");
    }

    // Filtrar o array para remover a categoria com o nome especificado
    const updatedCategories = userData.categories.filter(
      (category: categoryModel) => category.name !== categoryName
    );

    // Verificar se a categoria existia
    if (updatedCategories.length === userData.categories.length) {
      throw new functions.https.HttpsError("not-found", "Categoria não encontrada");
    }

    // Atualizar o array de categorias no Firestore
    await userDocRef.update({
      categories: updatedCategories,
    });

    return { message: "Categoria removida com sucesso", categoryName };
  } catch (error) {
    console.error("Erro ao remover categoria:", error);
    throw new functions.https.HttpsError("internal", "Erro ao remover a categoria", error);
  }
};


export const getAllCategories = async (
  request: functions.https.CallableRequest<{}>
) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "O usuário não está autenticado");
  }

  const uid = request.auth.uid;

  try {
    // Referência ao documento do usuário no Firestore
    const userDocRef = firestore.collection("users").doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Usuário não encontrado");
    }

    const userData = userDoc.data();
    if (!userData || !Array.isArray(userData.categories)) {
      throw new functions.https.HttpsError("not-found", "Categorias não encontradas");
    }

    // Retornar todas as categorias
    const categories = userData.categories;

    return { message: "Categorias encontradas com sucesso", categories };
  } catch (error) {
    console.error("Erro ao obter categorias:", error);
    throw new functions.https.HttpsError("internal", "Erro ao obter as categorias", error);
  }
};
