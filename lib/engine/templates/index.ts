/** topic 名 → Template のレジストリ。 */
import { capacitorEnergy } from "./capacitor-energy.js";
import { dcMotorEmf } from "./dc-motor-emf.js";
import { demandFactor } from "./demand-factor.js";
import { groundingResistance } from "./grounding-resistance.js";
import { inductionMotorSpeed } from "./induction-motor-speed.js";
import { insulationResistance } from "./insulation-resistance.js";
import { lineVoltageDrop } from "./line-voltage-drop.js";
import { resistorNetwork } from "./resistor-network.js";
import { shortCircuitCapacity } from "./short-circuit-capacity.js";
import { threePhasePower } from "./three-phase-power.js";
import { transformerVoltageRegulation } from "./transformer-voltage-regulation.js";
import type { Template } from "./types.js";

const templates: Template[] = [
  threePhasePower,
  inductionMotorSpeed,
  resistorNetwork,
  capacitorEnergy,
  transformerVoltageRegulation,
  groundingResistance,
  demandFactor,
  shortCircuitCapacity,
  lineVoltageDrop,
  dcMotorEmf,
  insulationResistance,
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
  dcMotorEmf,
  demandFactor,
  groundingResistance,
  inductionMotorSpeed,
  insulationResistance,
  lineVoltageDrop,
  resistorNetwork,
  shortCircuitCapacity,
  threePhasePower,
  transformerVoltageRegulation,
};
