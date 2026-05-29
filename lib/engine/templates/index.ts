/** topic 名 → Template のレジストリ。 */
import { capacitorEnergy } from "./capacitor-energy.js";
import { dcMotorEmf } from "./dc-motor-emf.js";
import { demandFactor } from "./demand-factor.js";
import { groundingResistance } from "./grounding-resistance.js";
import { inductionMotorSpeed } from "./induction-motor-speed.js";
import { insulationResistance } from "./insulation-resistance.js";
import { lineVoltageDrop } from "./line-voltage-drop.js";
import { powerFactorCorrection } from "./power-factor-correction.js";
import { resistorNetwork } from "./resistor-network.js";
import { resistorPower } from "./resistor-power.js";
import { shortCircuitCapacity } from "./short-circuit-capacity.js";
import { threePhasePower } from "./three-phase-power.js";
import { transformerTurnsRatio } from "./transformer-turns-ratio.js";
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
  resistorPower,
  powerFactorCorrection,
  transformerTurnsRatio,
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
  powerFactorCorrection,
  resistorNetwork,
  resistorPower,
  shortCircuitCapacity,
  threePhasePower,
  transformerTurnsRatio,
  transformerVoltageRegulation,
};
