import {Account} from "./accountModel";
import {Task} from "./taskModel";

export interface User {
  id: string;
  name: string;
  email: string;
  cell: string;
  accounts: Account[];// Lista de contas associadas ao usuário
  categories: string[];// Lista de categorias personalizadas
  tasks: Task[];// Lista de tarefas do usuário
}
