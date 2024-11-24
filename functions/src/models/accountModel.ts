import {Expense} from "./expenseModel";
import {Income} from "./incomeModel";

export interface Account {
    id: string;// ID único da conta
    acc_name: string;// Nome da conta (ex: "Conta Corrente")
    acc_type: string;
    bank: string;// Banco da conta (ex: "Nubank")
    expenses: Expense[];// Lista de despesas associadas a esta conta
    incomes: Income[];// Lista de receitas associadas a esta conta
    balance: number;// Saldo atual da conta
}
