/** topic 名 → Template のレジストリ。 */
import { allowableTension } from "./allowable-tension.js";
import { bTypeGrounding } from "./b-type-grounding.js";
import { batteryCapacity } from "./battery-capacity.js";
import { blockDiagramGain } from "./block-diagram-gain.js";
import { boostChopper } from "./boost-chopper.js";
import { buckChopper } from "./buck-chopper.js";
import { capacitorEnergy } from "./capacitor-energy.js";
import { capacityFactor } from "./capacity-factor.js";
import { combinedCycleEfficiency } from "./combined-cycle-efficiency.js";
import { conductorLength } from "./conductor-length.js";
import { coulombForce } from "./coulomb-force.js";
import { dcGeneratorEmf } from "./dc-generator-emf.js";
import { dcMotorEmf } from "./dc-motor-emf.js";
import { demandFactor } from "./demand-factor.js";
import { diversityFactor } from "./diversity-factor.js";
import { electricEnergy } from "./electric-energy.js";
import { electricHeating } from "./electric-heating.js";
import { firstOrderControl } from "./first-order-control.js";
import { flywheelAcceleration } from "./flywheel-acceleration.js";
import { fullWaveRectifier } from "./full-wave-rectifier.js";
import { groundFaultSymmetrical } from "./ground-fault-symmetrical.js";
import { groundingResistance } from "./grounding-resistance.js";
import { groundingTypes } from "./grounding-types.js";
import { guyWireSafety } from "./guy-wire-safety.js";
import { hoistMotorOutput } from "./hoist-motor-output.js";
import { hydroPowerOutput } from "./hydro-power-output.js";
import { indoorVoltageLimit } from "./indoor-voltage-limit.js";
import { inducedEmf } from "./induced-emf.js";
import { inductionMotorSpeed } from "./induction-motor-speed.js";
import { inductionPowerBalance } from "./induction-power-balance.js";
import { inductionProportionalShift } from "./induction-proportional-shift.js";
import { inductorEnergy } from "./inductor-energy.js";
import { insulationResistance } from "./insulation-resistance.js";
import { insulationTestVoltage } from "./insulation-test-voltage.js";
import { inverseSquareIlluminance } from "./inverse-square-illuminance.js";
import { lightingDesign } from "./lighting-design.js";
import { loadFactor } from "./load-factor.js";
import { lossFactor } from "./loss-factor.js";
import { magneticCircuit } from "./magnetic-circuit.js";
import { maxDemandComposite } from "./max-demand-composite.js";
import { maxEfficiencyLoad } from "./max-efficiency-load.js";
import { maxPowerTransfer } from "./max-power-transfer.js";
import { multiplierResistor } from "./multiplier-resistor.js";
import { overheadClearance } from "./overhead-clearance.js";
import { parallelPercentImpedance } from "./parallel-percent-impedance.js";
import { parallelPlateField } from "./parallel-plate-field.js";
import { percentImpedanceConversion } from "./percent-impedance-conversion.js";
import { percentImpedanceShortCircuit } from "./percent-impedance-short-circuit.js";
import { powerFactorCorrection } from "./power-factor-correction.js";
import { pqVoltageDrop } from "./pq-voltage-drop.js";
import { pumpMotorInput } from "./pump-motor-input.js";
import { rcTimeConstant } from "./rc-time-constant.js";
import { reactivePowerCompensation } from "./reactive-power-compensation.js";
import { resistanceTemperature } from "./resistance-temperature.js";
import { resistorNetwork } from "./resistor-network.js";
import { rlTimeConstant } from "./rl-time-constant.js";
import { rlcResonance } from "./rlc-resonance.js";
import { rotationalPower } from "./rotational-power.js";
import { sagTension } from "./sag-tension.js";
import { secondOrderResponse } from "./second-order-response.js";
import { seriesCapacitance } from "./series-capacitance.js";
import { seriesRlCurrent } from "./series-rl-current.js";
import { shortCircuitCapacity } from "./short-circuit-capacity.js";
import { shortCircuitOhm } from "./short-circuit-ohm.js";
import { shortCircuitRatio } from "./short-circuit-ratio.js";
import { shuntResistor } from "./shunt-resistor.js";
import { singlePhaseVoltageDrop } from "./single-phase-voltage-drop.js";
import { specificSpeed } from "./specific-speed.js";
import { speedRegulation } from "./speed-regulation.js";
import { steadyStateError } from "./steady-state-error.js";
import { supplyVoltageLimit } from "./supply-voltage-limit.js";
import { synchronousGeneratorOutput } from "./synchronous-generator-output.js";
import { thermalEfficiency } from "./thermal-efficiency.js";
import { thermalFuelConsumption } from "./thermal-fuel-consumption.js";
import { threePhasePower } from "./three-phase-power.js";
import { transformerEfficiency } from "./transformer-efficiency.js";
import { transformerExcitingCurrent } from "./transformer-exciting-current.js";
import { transformerParallelLoad } from "./transformer-parallel-load.js";
import { transformerTap } from "./transformer-tap.js";
import { transformerTurnsRatio } from "./transformer-turns-ratio.js";
import { transformerVoltageRegulation } from "./transformer-voltage-regulation.js";
import { transmissionEfficiency } from "./transmission-efficiency.js";
import { transmissionLoss } from "./transmission-loss.js";
import { transmissionPowerStability } from "./transmission-power-stability.js";
import type { Template } from "./types.js";
import { voltageClassification } from "./voltage-classification.js";
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
  electricEnergy,
  rlcResonance,
  inducedEmf,
  coulombForce,
  rlTimeConstant,
  seriesCapacitance,
  resistanceTemperature,
  seriesRlCurrent,
  magneticCircuit,
  // 電力
  demandFactor,
  powerFactorCorrection,
  percentImpedanceShortCircuit,
  transmissionLoss,
  singlePhaseVoltageDrop,
  percentImpedanceConversion,
  voltageDropRate,
  loadFactor,
  diversityFactor,
  transmissionEfficiency,
  combinedCycleEfficiency,
  thermalFuelConsumption,
  capacityFactor,
  specificSpeed,
  speedRegulation,
  conductorLength,
  pqVoltageDrop,
  transformerTap,
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
  maxEfficiencyLoad,
  hoistMotorOutput,
  fullWaveRectifier,
  electricHeating,
  transformerParallelLoad,
  rotationalPower,
  batteryCapacity,
  transformerExcitingCurrent,
  flywheelAcceleration,
  inverseSquareIlluminance,
  // 法規
  groundingResistance,
  sagTension,
  insulationTestVoltage,
  windLoad,
  allowableTension,
  bTypeGrounding,
  insulationResistance,
  voltageClassification,
  overheadClearance,
  groundingTypes,
  guyWireSafety,
  indoorVoltageLimit,
  supplyVoltageLimit,
  // 機械制御（二次）
  transformerVoltageRegulation,
  synchronousGeneratorOutput,
  buckChopper,
  firstOrderControl,
  inductionProportionalShift,
  boostChopper,
  steadyStateError,
  secondOrderResponse,
  blockDiagramGain,
  // 電力管理（二次）
  reactivePowerCompensation,
  hydroPowerOutput,
  thermalEfficiency,
  shortCircuitCapacity,
  transmissionPowerStability,
  shortCircuitOhm,
  groundFaultSymmetrical,
  parallelPercentImpedance,
  lossFactor,
  maxDemandComposite,
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
  batteryCapacity,
  blockDiagramGain,
  boostChopper,
  bTypeGrounding,
  buckChopper,
  capacitorEnergy,
  capacityFactor,
  combinedCycleEfficiency,
  conductorLength,
  coulombForce,
  dcGeneratorEmf,
  dcMotorEmf,
  demandFactor,
  diversityFactor,
  electricEnergy,
  electricHeating,
  firstOrderControl,
  flywheelAcceleration,
  fullWaveRectifier,
  groundFaultSymmetrical,
  groundingResistance,
  groundingTypes,
  guyWireSafety,
  hoistMotorOutput,
  hydroPowerOutput,
  indoorVoltageLimit,
  inducedEmf,
  inductionMotorSpeed,
  inductionPowerBalance,
  inductionProportionalShift,
  inductorEnergy,
  insulationResistance,
  insulationTestVoltage,
  inverseSquareIlluminance,
  lightingDesign,
  loadFactor,
  lossFactor,
  magneticCircuit,
  maxDemandComposite,
  maxEfficiencyLoad,
  maxPowerTransfer,
  multiplierResistor,
  overheadClearance,
  parallelPercentImpedance,
  parallelPlateField,
  percentImpedanceConversion,
  percentImpedanceShortCircuit,
  powerFactorCorrection,
  pqVoltageDrop,
  pumpMotorInput,
  rcTimeConstant,
  reactivePowerCompensation,
  resistanceTemperature,
  resistorNetwork,
  rlcResonance,
  rlTimeConstant,
  rotationalPower,
  sagTension,
  secondOrderResponse,
  seriesCapacitance,
  seriesRlCurrent,
  shortCircuitCapacity,
  shortCircuitOhm,
  shortCircuitRatio,
  shuntResistor,
  singlePhaseVoltageDrop,
  specificSpeed,
  speedRegulation,
  steadyStateError,
  supplyVoltageLimit,
  synchronousGeneratorOutput,
  thermalEfficiency,
  thermalFuelConsumption,
  threePhasePower,
  transformerEfficiency,
  transformerExcitingCurrent,
  transformerParallelLoad,
  transformerTap,
  transformerTurnsRatio,
  transformerVoltageRegulation,
  transmissionEfficiency,
  transmissionLoss,
  transmissionPowerStability,
  voltageClassification,
  voltageDropRate,
  wheatstoneBridge,
  windLoad,
};
