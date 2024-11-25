import { SubTask } from "./subTaskModel";

export interface Task {
  id: string;
  title: string;
  description: string;
  data: string;
  priority: number;
  subTask: SubTask[];
  done: boolean;
}
