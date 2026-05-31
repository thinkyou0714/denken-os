/** topic 名 → Template のレジストリ。 */
import { boostChopper } from "./boost-chopper.js";
import { capacitorEnergy } from "./capacitor-energy.js";
import { coulombForce } from "./coulomb-force.js";
import { dcMotorEmf } from "./dc-motor-emf.js";
import { demandFactor } from "./demand-factor.js";
import { diversityFactor } from "./diversity-factor.js";
import { groundingResistance } from "./grounding-resistance.js";
import { hydroPower } from "./hydro-power.js";
import { inductionMotorSpeed } from "./induction-motor-speed.js";
import { inductionPowerSplit } from "./induction-power-split.js";
import { insulationWithstandVoltage } from "./insulation-withstand-voltage.js";
import { loadFactor } from "./load-factor.js";
import { maxOperatingVoltage } from "./max-operating-voltage.js";
import { maxPowerTransfer } from "./max-power-transfer.js";
import { percentImpedanceShortCircuit } from "./percent-impedance-short-circuit.js";
import { powerFactorCorrection } from "./power-factor-correction.js";
import { resistorNetwork } from "./resistor-network.js";
import { rlcSeriesImpedance } from "./rlc-series-impedance.js";
import { sag } from "./sag.js";
import { shortCircuitCapacity } from "./short-circuit-capacity.js";
import { singlePhaseRectifier } from "./single-phase-rectifier.js";
import { synchronousSpeed } from "./synchronous-speed.js";
import { threePhasePower } from "./three-phase-power.js";
import { transformerEfficiency } from "./transformer-efficiency.js";
import { transformerVoltageRegulation } from "./transformer-voltage-regulation.js";
import { transmissionVoltageDrop } from "./transmission-voltage-drop.js";
import type { Template } from "./types.js";
import { voltageDivider } from "./voltage-divider.js";
import { wheatstoneBridge } from "./wheatstone-bridge.js";

const templates: Template[] = [
  // 既存
  threePhasePower,
  inductionMotorSpeed,
  resistorNetwork,
  capacitorEnergy,
  transformerVoltageRegulation,
  groundingResistance,
  demandFactor,
  // 理論 拡充
  voltageDivider,
  wheatstoneBridge,
  rlcSeriesImpedance,
  coulombForce,
  maxPowerTransfer,
  // 電力 拡充
  hydroPower,
  percentImpedanceShortCircuit,
  powerFactorCorrection,
  transmissionVoltageDrop,
  sag,
  loadFactor,
  diversityFactor,
  // 機械 拡充
  transformerEfficiency,
  inductionPowerSplit,
  dcMotorEmf,
  synchronousSpeed,
  singlePhaseRectifier,
  boostChopper,
  // 法規 拡充
  insulationWithstandVoltage,
  maxOperatingVoltage,
  // 二次（電力管理）拡充
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
  boostChopper,
  capacitorEnergy,
  coulombForce,
  dcMotorEmf,
  demandFactor,
  diversityFactor,
  groundingResistance,
  hydroPower,
  inductionMotorSpeed,
  inductionPowerSplit,
  insulationWithstandVoltage,
  loadFactor,
  maxOperatingVoltage,
  maxPowerTransfer,
  percentImpedanceShortCircuit,
  powerFactorCorrection,
  resistorNetwork,
  rlcSeriesImpedance,
  sag,
  shortCircuitCapacity,
  singlePhaseRectifier,
  synchronousSpeed,
  threePhasePower,
  transformerEfficiency,
  transformerVoltageRegulation,
  transmissionVoltageDrop,
  voltageDivider,
  wheatstoneBridge,
};
