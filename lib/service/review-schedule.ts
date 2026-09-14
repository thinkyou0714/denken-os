import { getScheduler } from "../scheduler/index.js";
import type { Attempt } from "./assessment.js";

export function skillReviewSchedule(attempts: Attempt[], now = Date.now()) {
  const scheduler = getScheduler("fsrs", { desiredRetention: 0.9 });
  const states = new Map<
    string,
    { topic: string; skill: string; card: ReturnType<typeof scheduler.init>; answered: number }
  >();
  for (const a of [...attempts].sort((a, b) => a.finishedAt - b.finishedAt)) {
    if (a.mode === "validation" || a.correct === null) continue;
    const key = `${a.topic}::${a.skill}`;
    const previous = states.get(key) ?? {
      topic: a.topic,
      skill: a.skill,
      card: scheduler.init(new Date(a.finishedAt)),
      answered: 0,
    };
    const rating = !a.correct || a.hints > 0 || a.revealed ? "again" : "good";
    states.set(key, {
      ...previous,
      card: scheduler.review(previous.card, rating, new Date(a.finishedAt)),
      answered: previous.answered + 1,
    });
  }
  return [...states.values()].map((s) => {
    const view = scheduler.view(s.card);
    return { topic: s.topic, skill: s.skill, answered: s.answered, ...view, due: view.dueMs <= now };
  });
}
