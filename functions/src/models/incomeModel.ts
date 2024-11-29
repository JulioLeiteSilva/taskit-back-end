export interface Income {
  id: string;
  inc_name: string;
  category: string;
  value: number;
  date: string; // Ex: "10/10/2024"
  fixed?: boolean;
  startDate?: string; // Se é uma receita fixa
  paid: boolean;
}
