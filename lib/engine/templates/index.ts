/** topic 名 → Template のレジストリ。 */
import { boostChopper } from "./boost-chopper.js";
import { capacitorEnergy } from "./capacitor-energy.js";
import { chiefEngineer } from "./chief-engineer.js";
import { coulombForce } from "./coulomb-force.js";
import { currentDivider } from "./current-divider.js";
import { dcGeneratorEmf } from "./dc-generator-emf.js";
import { dcMotorEmf } from "./dc-motor-emf.js";
import { dcMotorSpeed } from "./dc-motor-speed.js";
import { demandFactor } from "./demand-factor.js";
import { diversityFactor } from "./diversity-factor.js";
import { electricFieldPotential } from "./electric-field-potential.js";
import { electricHeating } from "./electric-heating.js";
import { electromagneticForce } from "./electromagnetic-force.js";
import { electromagneticInduction } from "./electromagnetic-induction.js";
import { groundingResistance } from "./grounding-resistance.js";
import { groundingTypes } from "./grounding-types.js";
import { guyWireTension } from "./guy-wire-tension.js";
import { hvSubstation } from "./hv-substation.js";
import { hydroPower } from "./hydro-power.js";
import { illuminance } from "./illuminance.js";
import { inductionEquivalentCircuit } from "./induction-equivalent-circuit.js";
import { inductionMotorSpeed } from "./induction-motor-speed.js";
import { inductionPowerSplit } from "./induction-power-split.js";
import { inductionTorque } from "./induction-torque.js";
import { insulationResistance } from "./insulation-resistance.js";
import { insulationWithstandVoltage } from "./insulation-withstand-voltage.js";
import { kirchhoffLoop } from "./kirchhoff-loop.js";
import { loadFactor } from "./load-factor.js";
import { magneticFieldSolenoid } from "./magnetic-field-solenoid.js";
import { maxOperatingVoltage } from "./max-operating-voltage.js";
import { maxPowerTransfer } from "./max-power-transfer.js";
import { neutralGrounding } from "./neutral-grounding.js";
import { neutralGroundingFault } from "./neutral-grounding-fault.js";
import { ohmsLaw } from "./ohms-law.js";
import { percentImpedanceShortCircuit } from "./percent-impedance-short-circuit.js";
import { powerFactorCorrection } from "./power-factor-correction.js";
import { powerLoss } from "./power-loss.js";
import { protectiveRelay } from "./protective-relay.js";
import { pumpedStorage } from "./pumped-storage.js";
import { rcTransient } from "./rc-transient.js";
import { reactiveCompensation } from "./reactive-compensation.js";
import { resistorNetwork } from "./resistor-network.js";
import { rlcSeriesImpedance } from "./rlc-series-impedance.js";
import { sag } from "./sag.js";
import { seriesResonance } from "./series-resonance.js";
import { shortCircuitCapacity } from "./short-circuit-capacity.js";
import { singlePhaseRectifier } from "./single-phase-rectifier.js";
import { stabilityCriterion } from "./stability-criterion.js";
import { superposition } from "./superposition.js";
import { symmetricalComponents } from "./symmetrical-components.js";
import { synchronousOutput } from "./synchronous-output.js";
import { synchronousSpeed } from "./synchronous-speed.js";
import { synchronousStability } from "./synchronous-stability.js";
import { systemStability } from "./system-stability.js";
import { thermalEfficiency } from "./thermal-efficiency.js";
import { thevenin } from "./thevenin.js";
import { threePhasePower } from "./three-phase-power.js";
import { threePhaseVoltageDrop } from "./three-phase-voltage-drop.js";
import { transferFunction } from "./transfer-function.js";
import { transformerEfficiency } from "./transformer-efficiency.js";
import { transformerParallel } from "./transformer-parallel.js";
import { transformerVoltageRegulation } from "./transformer-voltage-regulation.js";
import { transmissionVoltageDrop } from "./transmission-voltage-drop.js";
import type { Template } from "./types.js";
import { voltageClass } from "./voltage-class.js";
import { voltageDivider } from "./voltage-divider.js";
import { wheatstoneBridge } from "./wheatstone-bridge.js";
import { windLoad } from "./wind-load.js";

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
  // 理論 第2弾（基本法則・静電磁気・過渡）
  ohmsLaw,
  currentDivider,
  kirchhoffLoop,
  superposition,
  thevenin,
  seriesResonance,
  electricFieldPotential,
  magneticFieldSolenoid,
  electromagneticForce,
  electromagneticInduction,
  rcTransient,
  // 電力 拡充
  hydroPower,
  percentImpedanceShortCircuit,
  powerFactorCorrection,
  transmissionVoltageDrop,
  sag,
  loadFactor,
  diversityFactor,
  // 電力 第2弾（発電効率・送配電・系統）
  thermalEfficiency,
  pumpedStorage,
  threePhaseVoltageDrop,
  powerLoss,
  transformerParallel,
  neutralGrounding,
  // 機械 拡充
  transformerEfficiency,
  inductionPowerSplit,
  dcMotorEmf,
  synchronousSpeed,
  singlePhaseRectifier,
  boostChopper,
  // 機械 第2弾（直流機・同期機・誘導機・制御・照明電熱）
  dcMotorSpeed,
  dcGeneratorEmf,
  synchronousOutput,
  inductionTorque,
  transferFunction,
  illuminance,
  electricHeating,
  // 法規 拡充
  insulationWithstandVoltage,
  maxOperatingVoltage,
  // 法規 第2弾（事業法・電圧区分・絶縁/接地・機械的強度・受電設備）
  chiefEngineer,
  voltageClass,
  insulationResistance,
  groundingTypes,
  windLoad,
  guyWireTension,
  hvSubstation,
  // 二次（電力管理）拡充
  shortCircuitCapacity,
  // 二次（電力管理）第2弾
  symmetricalComponents,
  neutralGroundingFault,
  systemStability,
  reactiveCompensation,
  protectiveRelay,
  // 二次（機械制御）拡充
  inductionEquivalentCircuit,
  stabilityCriterion,
  synchronousStability,
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
  chiefEngineer,
  coulombForce,
  currentDivider,
  dcGeneratorEmf,
  dcMotorEmf,
  dcMotorSpeed,
  demandFactor,
  diversityFactor,
  electricFieldPotential,
  electricHeating,
  electromagneticForce,
  electromagneticInduction,
  groundingResistance,
  groundingTypes,
  guyWireTension,
  hvSubstation,
  hydroPower,
  illuminance,
  inductionEquivalentCircuit,
  inductionMotorSpeed,
  inductionPowerSplit,
  inductionTorque,
  insulationResistance,
  insulationWithstandVoltage,
  kirchhoffLoop,
  loadFactor,
  magneticFieldSolenoid,
  maxOperatingVoltage,
  maxPowerTransfer,
  neutralGrounding,
  neutralGroundingFault,
  ohmsLaw,
  percentImpedanceShortCircuit,
  powerFactorCorrection,
  powerLoss,
  protectiveRelay,
  pumpedStorage,
  rcTransient,
  reactiveCompensation,
  resistorNetwork,
  rlcSeriesImpedance,
  sag,
  seriesResonance,
  shortCircuitCapacity,
  singlePhaseRectifier,
  stabilityCriterion,
  superposition,
  symmetricalComponents,
  synchronousOutput,
  synchronousSpeed,
  synchronousStability,
  systemStability,
  thermalEfficiency,
  thevenin,
  threePhasePower,
  threePhaseVoltageDrop,
  transferFunction,
  transformerEfficiency,
  transformerParallel,
  transformerVoltageRegulation,
  transmissionVoltageDrop,
  voltageClass,
  voltageDivider,
  wheatstoneBridge,
  windLoad,
};
