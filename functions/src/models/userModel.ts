export interface Expense {
  exp_name: string;
  category: string;
  value: number;
  date: string;
  fixed: boolean;
  paid: boolean;
}

export interface Income {
  inc_name: string;
  category: string;
  value: number;
  date: string;
  fixed: boolean;
}

export interface Account {
  id: string;
  acc_name: string;
  bank: string;
  expenses: Expense[];
  incomes: Income[];
  balance: number;
}

export interface SubTask {
  title: string;
  description: string;
  priority: number;
  done: boolean;
}

export interface Task {
  title: string;
  description: string;
  data: string;
  priority: number;
  subTask: SubTask[];
  done: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  cell: string;
  accounts: Account[];
  categories: string[];
  tasks: Task[];
}
