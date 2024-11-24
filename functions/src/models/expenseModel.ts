export interface Expense {
    id: string;
    exp_name: string;
    category: string;
    value: number;
    date: string;// Ex: "30/10/2024"
    fixed: boolean;// Se é uma despesa fixa
    paid: boolean;// Se a despesa foi paga
}
