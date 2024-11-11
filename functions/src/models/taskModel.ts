import {SubTask} from "./subTaskModel";

export interface Task {
    title: string;// Título da tarefa principal
    description: string;// Descrição da tarefa principal
    data: string;// Data da tarefa (ex: "31/10/2024")
    priority: number;// Prioridade da tarefa
    subTask: SubTask[];// Lista de subtarefas
    done: boolean;// Status de conclusão (true se concluída)
}
