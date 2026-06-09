/** topic 名 → Template のレジストリ。 */
import { buckChopper } from "./buck-chopper.js";
import { capacitorEnergy } from "./capacitor-energy.js";
import { dcMotorEmf } from "./dc-motor-emf.js";
import { demandFactor } from "./demand-factor.js";
import { firstOrderControl } from "./first-order-control.js";
import { groundingResistance } from "./grounding-resistance.js";
import { hydroPowerOutput } from "./hydro-power-output.js";
import { inductionMotorSpeed } from "./induction-motor-speed.js";
import { inductionPowerBalance } from "./induction-power-balance.js";
import { inductionProportionalShift } from "./induction-proportional-shift.js";
import { insulationTestVoltage } from "./insulation-test-voltage.js";
import { maxPowerTransfer } from "./max-power-transfer.js";
import { percentImpedanceShortCircuit } from "./percent-impedance-short-circuit.js";
import { powerFactorCorrection } from "./power-factor-correction.js";
import { rcTimeConstant } from "./rc-time-constant.js";
import { reactivePowerCompensation } from "./reactive-power-compensation.js";
import { resistorNetwork } from "./resistor-network.js";
import { sagTension } from "./sag-tension.js";
import { shortCircuitCapacity } from "./short-circuit-capacity.js";
import { shortCircuitRatio } from "./short-circuit-ratio.js";
import { singlePhaseVoltageDrop } from "./single-phase-voltage-drop.js";
import { synchronousGeneratorOutput } from "./synchronous-generator-output.js";
import { thermalEfficiency } from "./thermal-efficiency.js";
import { threePhasePower } from "./three-phase-power.js";
import { transformerEfficiency } from "./transformer-efficiency.js";
import { transformerTurnsRatio } from "./transformer-turns-ratio.js";
import { transformerVoltageRegulation } from "./transformer-voltage-regulation.js";
import { transmissionLoss } from "./transmission-loss.js";
import type { Template } from "./types.js";
import { wheatstoneBridge } from "./wheatstone-bridge.js";

const templates: Template[] = [
  // 理論
  threePhasePower,
  resistorNetwork,
  capacitorEnergy,
  maxPowerTransfer,
  rcTimeConstant,
  wheatstoneBridge,
  // 電力
  demandFactor,
  powerFactorCorrection,
  percentImpedanceShortCircuit,
  transmissionLoss,
  singlePhaseVoltageDrop,
  // 機械
  inductionMotorSpeed,
  transformerEfficiency,
  dcMotorEmf,
  shortCircuitRatio,
  inductionPowerBalance,
  transformerTurnsRatio,
  // 法規
  groundingResistance,
  sagTension,
  insulationTestVoltage,
  // 機械制御（二次）
  transformerVoltageRegulation,
  synchronousGeneratorOutput,
  buckChopper,
  firstOrderControl,
  inductionProportionalShift,
  // 電力管理（二次）
  reactivePowerCompensation,
  hydroPowerOutput,
  thermalEfficiency,
  shortCircuitCapacity,
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
  buckChopper,
  capacitorEnergy,
  dcMotorEmf,
  demandFactor,
  firstOrderControl,
  groundingResistance,
  hydroPowerOutput,
  inductionMotorSpeed,
  inductionPowerBalance,
  inductionProportionalShift,
  insulationTestVoltage,
  maxPowerTransfer,
  percentImpedanceShortCircuit,
  powerFactorCorrection,
  rcTimeConstant,
  reactivePowerCompensation,
  resistorNetwork,
  sagTension,
  shortCircuitCapacity,
  shortCircuitRatio,
  singlePhaseVoltageDrop,
  synchronousGeneratorOutput,
  thermalEfficiency,
  threePhasePower,
  transformerEfficiency,
  transformerTurnsRatio,
  transformerVoltageRegulation,
  transmissionLoss,
  wheatstoneBridge,
};
