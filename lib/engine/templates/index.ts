/** topic 名 → Template のレジストリ。 */
import { capacitorEnergy } from "./capacitor-energy.js";
import { inductionMotorSpeed } from "./induction-motor-speed.js";
import { resistorNetwork } from "./resistor-network.js";
import { threePhasePower } from "./three-phase-power.js";
import type { Template } from "./types.js";

const templates: Template[] = [threePhasePower, inductionMotorSpeed, resistorNetwork, capacitorEnergy];
const registry = new Map<string, Template>(templates.map((t) => [t.topic, t]));

export function getTemplate(topic: string): Template | undefined {
  return registry.get(topic);
}

export function listTopics(): string[] {
  return [...registry.keys()];
}

export type { Template };
export { capacitorEnergy, inductionMotorSpeed, resistorNetwork, threePhasePower };
