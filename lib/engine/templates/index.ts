/** topic 名 → Template のレジストリ。 */
import { capacitorEnergy } from "./capacitor-energy.js";
import { demandFactor } from "./demand-factor.js";
import { groundingResistance } from "./grounding-resistance.js";
import { inductionMotorSpeed } from "./induction-motor-speed.js";
import { resistorNetwork } from "./resistor-network.js";
import { threePhasePower } from "./three-phase-power.js";
import { transformerVoltageRegulation } from "./transformer-voltage-regulation.js";
import type { Template } from "./types.js";
import { unitConversion } from "./unit-conversion.js";

const templates: Template[] = [
  threePhasePower,
  inductionMotorSpeed,
  resistorNetwork,
  capacitorEnergy,
  transformerVoltageRegulation,
  groundingResistance,
  demandFactor,
  unitConversion,
];
const registry = new Map<string, Template>(templates.map((t) => [t.topic, t]));

export function getTemplate(topic: string): Template | undefined {
  return registry.get(topic);
}

export function listTopics(): string[] {
  return [...registry.keys()];
}

export type { Template };
export {
  capacitorEnergy,
  demandFactor,
  groundingResistance,
  inductionMotorSpeed,
  resistorNetwork,
  threePhasePower,
  transformerVoltageRegulation,
  unitConversion,
};
