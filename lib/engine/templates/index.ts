/** topic 名 → Template のレジストリ。 */
import { allowableTension } from "./allowable-tension.js";
import { boostChopper } from "./boost-chopper.js";
import { buckChopper } from "./buck-chopper.js";
import { capacitorEnergy } from "./capacitor-energy.js";
import { dcGeneratorEmf } from "./dc-generator-emf.js";
import { dcMotorEmf } from "./dc-motor-emf.js";
import { demandFactor } from "./demand-factor.js";
import { firstOrderControl } from "./first-order-control.js";
import { groundingResistance } from "./grounding-resistance.js";
import { hydroPowerOutput } from "./hydro-power-output.js";
import { inductionMotorSpeed } from "./induction-motor-speed.js";
import { inductionPowerBalance } from "./induction-power-balance.js";
import { inductionProportionalShift } from "./induction-proportional-shift.js";
import { inductorEnergy } from "./inductor-energy.js";
import { insulationTestVoltage } from "./insulation-test-voltage.js";
import { lightingDesign } from "./lighting-design.js";
import { maxPowerTransfer } from "./max-power-transfer.js";
import { multiplierResistor } from "./multiplier-resistor.js";
import { parallelPlateField } from "./parallel-plate-field.js";
import { percentImpedanceConversion } from "./percent-impedance-conversion.js";
import { percentImpedanceShortCircuit } from "./percent-impedance-short-circuit.js";
import { powerFactorCorrection } from "./power-factor-correction.js";
import { pumpMotorInput } from "./pump-motor-input.js";
import { rcTimeConstant } from "./rc-time-constant.js";
import { reactivePowerCompensation } from "./reactive-power-compensation.js";
import { resistorNetwork } from "./resistor-network.js";
import { sagTension } from "./sag-tension.js";
import { shortCircuitCapacity } from "./short-circuit-capacity.js";
import { shortCircuitRatio } from "./short-circuit-ratio.js";
import { shuntResistor } from "./shunt-resistor.js";
import { singlePhaseVoltageDrop } from "./single-phase-voltage-drop.js";
import { synchronousGeneratorOutput } from "./synchronous-generator-output.js";
import { thermalEfficiency } from "./thermal-efficiency.js";
import { threePhasePower } from "./three-phase-power.js";
import { transformerEfficiency } from "./transformer-efficiency.js";
import { transformerTurnsRatio } from "./transformer-turns-ratio.js";
import { transformerVoltageRegulation } from "./transformer-voltage-regulation.js";
import { transmissionLoss } from "./transmission-loss.js";
import type { Template } from "./types.js";
import { voltageDropRate } from "./voltage-drop-rate.js";
import { wheatstoneBridge } from "./wheatstone-bridge.js";
import { windLoad } from "./wind-load.js";

const templates: Template[] = [
  // 理論
  threePhasePower,
  resistorNetwork,
  capacitorEnergy,
  maxPowerTransfer,
  rcTimeConstant,
  wheatstoneBridge,
  shuntResistor,
  multiplierResistor,
  parallelPlateField,
  inductorEnergy,
  // 電力
  demandFactor,
  powerFactorCorrection,
  percentImpedanceShortCircuit,
  transmissionLoss,
  singlePhaseVoltageDrop,
  percentImpedanceConversion,
  voltageDropRate,
  // 機械
  inductionMotorSpeed,
  transformerEfficiency,
  dcMotorEmf,
  shortCircuitRatio,
  inductionPowerBalance,
  transformerTurnsRatio,
  pumpMotorInput,
  lightingDesign,
  dcGeneratorEmf,
  // 法規
  groundingResistance,
  sagTension,
  insulationTestVoltage,
  windLoad,
  allowableTension,
  // 機械制御（二次）
  transformerVoltageRegulation,
  synchronousGeneratorOutput,
  buckChopper,
  firstOrderControl,
  inductionProportionalShift,
  boostChopper,
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
  allowableTension,
  boostChopper,
  buckChopper,
  capacitorEnergy,
  dcGeneratorEmf,
  dcMotorEmf,
  demandFactor,
  firstOrderControl,
  groundingResistance,
  hydroPowerOutput,
  inductionMotorSpeed,
  inductionPowerBalance,
  inductionProportionalShift,
  inductorEnergy,
  insulationTestVoltage,
  lightingDesign,
  maxPowerTransfer,
  multiplierResistor,
  parallelPlateField,
  percentImpedanceConversion,
  percentImpedanceShortCircuit,
  powerFactorCorrection,
  pumpMotorInput,
  rcTimeConstant,
  reactivePowerCompensation,
  resistorNetwork,
  sagTension,
  shortCircuitCapacity,
  shortCircuitRatio,
  shuntResistor,
  singlePhaseVoltageDrop,
  synchronousGeneratorOutput,
  thermalEfficiency,
  threePhasePower,
  transformerEfficiency,
  transformerTurnsRatio,
  transformerVoltageRegulation,
  transmissionLoss,
  voltageDropRate,
  wheatstoneBridge,
  windLoad,
};
