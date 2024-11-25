import * as functions from "firebase-functions";
import {
  createTask,
  deleteTask,
  getAllTasks,
  getTask,
  toggleSubTaskStatus,
  toggleTaskStatus,
  updateTask,
} from "../controllers/taskController";

export const taskRoutes = {
  createTask: functions.https.onCall(
    async (request) => await createTask(request)
  ),
  updateTask: functions.https.onCall(
    async (request) => await updateTask(request)
  ),
  deleteTask: functions.https.onCall(
    async (request) => await deleteTask(request)
  ),
  getTask: functions.https.onCall(async (request) => await getTask(request)),
  getAllTasks: functions.https.onCall(
    async (request) => await getAllTasks(request)
  ),
  toggleTaskStatus: functions.https.onCall(
    async (request) => await toggleTaskStatus(request)
  ),
  toggleSubTaskStatus: functions.https.onCall(
    async (request) => await toggleSubTaskStatus(request)
  ),
};
