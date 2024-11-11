/* eslint-disable max-len */
import * as functions from "firebase-functions";
import {createUser, getUser, updateUser, deleteUser} from "../controllers/userController";

// Exporta as rotas de usuário
export const userRoutes = {
  createUser: functions.https.onCall(async (request) => await createUser(request)),
  getUser: functions.https.onCall(async (request) => await getUser(request)),
  updateUser: functions.https.onCall(async (request) => await updateUser(request)),
  deleteUser: functions.https.onCall(async (request) => await deleteUser(request)),
};
