import { ProblemListSchema, type Problem, type Subject } from "@/domain/content/schema";
import { theoryProblems } from "./theory";
import { powerProblems } from "./power";
import { machineryProblems } from "./machinery";
import { lawProblems } from "./law";

const raw: Problem[] = [
  ...theoryProblems,
  ...powerProblems,
  ...machineryProblems,
  ...lawProblems,
];

/** 起動時に全シードを Zod 検証する(不正データは即時に例外)。 */
export const problems: Problem[] = ProblemListSchema.parse(raw);

export function problemsBySubject(subject: Subject): Problem[] {
  return problems.filter((p) => p.subject === subject);
}

export function problemById(id: string): Problem | undefined {
  return problems.find((p) => p.id === id);
}

export const problemSubjectMap: Record<string, Subject> = Object.fromEntries(
  problems.map((p) => [p.id, p.subject]),
);
