export type Project = {
    id: string;
    name: string;
    ideaDescription: string;
    guidedQuestions?: {
        question: string,
        answer: string
    }[],
    prototypeCode?: string,
    projectFiles?: {
        filename: string;
        content: Buffer;
        path: string;
    }[];
    createdAt?: string,
    updatedAt?: string;
};
