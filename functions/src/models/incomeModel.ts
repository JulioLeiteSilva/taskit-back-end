export interface Income {
    inc_name: string;
    category: string;
    value: number;
    date: string;// Ex: "10/10/2024"
    fixed: boolean;// Se é uma receita fixa
}
