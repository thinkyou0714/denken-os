/** topic 名 → Template のレジストリ。 */
import type { Template } from "./types.js";
import { threePhasePower } from "./three-phase-power.js";

const registry = new Map<string, Template>([[threePhasePower.topic, threePhasePower]]);

export function getTemplate(topic: string): Template | undefined {
  return registry.get(topic);
}

export function listTopics(): string[] {
  return [...registry.keys()];
}

export { threePhasePower };
export type { Template };
