import * as functions from "firebase-functions";
import { firestore } from "../config/firebaseConfig";
import { Task } from "../models/taskModel";
import { SubTask } from "../models/subTaskModel";

export const createTask = async (
  request: functions.https.CallableRequest<{
    task: Omit<Task, "id">;
  }>
) => {
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "O usuário não está autenticado"
    );
  }

  const uid = request.auth.uid;
  const { task } = request.data;

  if (
    !task ||
    !task.title ||
    !task.description ||
    !task.data ||
    ![1, 2, 3].includes(task.priority)
  ) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Dados de tarefa inválidos ou prioridade inválida. Use 1 (Baixa), 2 (Média) ou 3 (Alta)."
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

    const newTask = {
      ...task,
      id: firestore.collection("users").doc().id,
      subTask: task.subTask || [],
      done: task.done || false,
    };

    const userData = userDoc.data();
    if (!userData) {
      throw new functions.https.HttpsError(
        "not-found",
        "Os dados do usuário não foram encontrados"
      );
    }
    const updatedTasks = [...(userData.tasks || []), newTask];

    await userDocRef.update({ tasks: updatedTasks });

    return { message: "Tarefa criada com sucesso", task: newTask };
  } catch (error) {
    console.error("Erro ao criar tarefa:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erro ao criar a tarefa",
      error
    );
  }
};

export const updateTask = async (
  request: functions.https.CallableRequest<{
    taskId: string;
    task: Partial<Omit<Task, "id">>;
  }>
) => {
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "O usuário não está autenticado"
    );
  }

  const uid = request.auth.uid;
  const { taskId, task } = request.data;

  if (!taskId || !task) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Dados de atualização inválidos"
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

    if (!userData) {
      throw new functions.https.HttpsError(
        "not-found",
        "Os dados do usuário não foram encontrados"
      );
    }

    const updatedTasks = userData.tasks.map((existingTask: Task) => {
      if (existingTask.id === taskId) {
        return {
          ...existingTask,
          ...task,
          subTask: task.subTask || existingTask.subTask, // Atualiza subtarefas, se fornecidas
        };
      }
      return existingTask;
    });

    await userDocRef.update({ tasks: updatedTasks });

    return { message: "Tarefa atualizada com sucesso" };
  } catch (error) {
    console.error("Erro ao atualizar tarefa:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erro ao atualizar a tarefa",
      error
    );
  }
};

export const deleteTask = async (
  request: functions.https.CallableRequest<{
    taskId: string;
  }>
) => {
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "O usuário não está autenticado"
    );
  }

  const uid = request.auth.uid;
  const { taskId } = request.data;

  if (!taskId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "O ID da tarefa não foi fornecido"
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

    if (!userData) {
      throw new functions.https.HttpsError(
        "not-found",
        "Os dados do usuário não foram encontrados"
      );
    }

    const updatedTasks = userData.tasks.filter(
      (task: Task) => task.id !== taskId
    );

    await userDocRef.update({ tasks: updatedTasks });

    return { message: "Tarefa excluída com sucesso" };
  } catch (error) {
    console.error("Erro ao excluir tarefa:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erro ao excluir a tarefa",
      error
    );
  }
};

export const getTask = async (
  request: functions.https.CallableRequest<{
    taskId: string;
  }>
) => {
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "O usuário não está autenticado"
    );
  }

  const uid = request.auth.uid;
  const { taskId } = request.data;

  if (!taskId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "O ID da tarefa não foi fornecido"
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

    if (!userData) {
      throw new functions.https.HttpsError(
        "not-found",
        "Os dados do usuário não foram encontrados"
      );
    }

    const task = userData.tasks.find((task: Task) => task.id === taskId);

    if (!task) {
      throw new functions.https.HttpsError(
        "not-found",
        "Tarefa não encontrada"
      );
    }

    return { task };
  } catch (error) {
    console.error("Erro ao buscar tarefa:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erro ao buscar a tarefa",
      error
    );
  }
};

export const getAllTasks = async (
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

    if (!userData) {
      throw new functions.https.HttpsError(
        "not-found",
        "Os dados do usuário não foram encontrados"
      );
    }

    const tasks = userData.tasks || [];

    return { tasks };
  } catch (error) {
    console.error("Erro ao buscar todas as tarefas:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erro ao buscar as tarefas",
      error
    );
  }
};

export const toggleTaskStatus = async (
  request: functions.https.CallableRequest<{
    taskId: string;
  }>
) => {
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "O usuário não está autenticado"
    );
  }

  const uid = request.auth.uid;
  const { taskId } = request.data;

  if (!taskId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "O ID da tarefa não foi fornecido"
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
    if (!userData) {
      throw new functions.https.HttpsError(
        "not-found",
        "Dados do usuário não foram encontrados"
      );
    }

    const updatedTasks = userData.tasks.map((task: Task) => {
      if (task.id === taskId) {
        const newDoneStatus = !task.done; // Alterna o status da tarefa
        const updatedSubTasks = task.subTask.map((subTask: SubTask) => ({
          ...subTask,
          done: newDoneStatus, // Alinha o status das subtarefas
        }));

        return {
          ...task,
          done: newDoneStatus,
          subTask: updatedSubTasks,
        };
      }
      return task;
    });

    await userDocRef.update({ tasks: updatedTasks });

    return { message: "Status da tarefa alternado com sucesso", taskId };
  } catch (error) {
    console.error("Erro ao alternar o status da tarefa:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erro ao alternar o status da tarefa",
      error
    );
  }
};

export const toggleSubTaskStatus = async (
  request: functions.https.CallableRequest<{
    taskId: string;
    subTaskTitles: string[]; // Alterado para um array de títulos
  }>
) => {
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "O usuário não está autenticado"
    );
  }

  const uid = request.auth.uid;
  const { taskId, subTaskTitles } = request.data;

  if (!taskId || !subTaskTitles || subTaskTitles.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "O ID da tarefa ou os títulos das subtarefas não foram fornecidos"
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
    if (!userData) {
      throw new functions.https.HttpsError(
        "not-found",
        "Dados do usuário não foram encontrados"
      );
    }

    const updatedTasks = userData.tasks.map((task: Task) => {
      if (task.id === taskId) {
        const updatedSubTasks = task.subTask.map((subTask: SubTask) => {
          if (subTaskTitles.includes(subTask.title)) {
            return { ...subTask, done: !subTask.done }; // Alterna o status das subtarefas especificadas
          }
          return subTask;
        });

        return { ...task, subTask: updatedSubTasks };
      }
      return task;
    });

    await userDocRef.update({ tasks: updatedTasks });

    return {
      message: "Status das subtarefas alternado com sucesso",
      taskId,
      subTaskTitles,
    };
  } catch (error) {
    console.error("Erro ao alternar o status das subtarefas:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erro ao alternar o status das subtarefas",
      error
    );
  }
};