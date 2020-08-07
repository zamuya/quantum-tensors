/* eslint-disable-next-line */
import _ from 'lodash'
import { Cx } from './Complex'
import Dimension from './Dimension'
import Vector from './Vector'
import Operator from './Operator'
import { TAU } from './Constants'
import * as ops from './Ops'
import { IGrid, Elem, ICell, IXYOperator } from './interfaces'

const dimPol = Dimension.polarization()
const dimDir = Dimension.direction()
const idPol = Operator.identity([dimPol])
const idDir = Operator.identity([dimDir])
const projH = Operator.indicator([dimPol], 'H')
const projV = Operator.indicator([dimPol], 'V')

const mod = (x: number, n: number): number => ((x % n) + n) % n

/**
 * Sugar solution (for polarization rotation)
 * @param rot Rotation angle (in TAU) for polarization. By default 1/8 (45deg).
 * For more sugar cubes, 2/8 and 3/8 make sense.
 */
export function sugarSolution(polarizationRotation = 0.125): Operator {
  return Operator.outer([idDir, ops.rotationMatrix(polarizationRotation * TAU, dimPol)])
}

/**
 * An attenuator, or: neutral density filter
 * @param r Amplitude attenuation factor. Intensity is changed by r^2.
 * By default it absorbs 50% photons.
 */
export function attenuator(r = Math.SQRT1_2): Operator {
  return ops.amplitudeIntensity(r, 0)
}

/**
 * A vacuum jar - advances phase by lambda/4.
 */
export function vacuumJar(): Operator {
  return ops.amplitudeIntensity(1, -0.25)
}

/**
 * A glass slab - delays phase by lambda/4.
 */
export function glassSlab(): Operator {
  return ops.amplitudeIntensity(1, +0.25)
}

/**
 * A both-sided mirror, from metal or any other optically denser medium.
 * 0: -, 45: /, 90: |, 135: \
 * @angle Angle in degrees, from -> CCW. Needs to be multiple of 45deg.
 * @returns Operator with dimensions [dimDir, dimPol].
 */
export function mirror(angle: number): Operator {
  return Operator.outer([ops.reflectFromPlaneDirection(angle), ops.reflectPhaseFromDenser()])
}

/**
 * A symmetric non-polarizing beam splitter.
 * Think: a very thin slab of glass.
 * 0: -, 45: /, 90: |, 135: \
 * @angle Angle in degrees, from -> CCW. Needs to be multiple of 45deg.
 * @returns Operator with dimensions [dimDir, dimPol].
 * @todo CHECK reflection phase.
 */
export function beamSplitter(angle: number): Operator {
  return Operator.outer([ops.reflectFromPlaneDirection(angle), ops.reflectPhaseFromDenser()])
    .mulConstant(Cx(0, 1)) // TODO: check phase here
    .add(ops.beamsplitterTransmittionDirections(angle).outer(idPol))
    .mulConstant(ops.isqrt2)
}

/**
 * A corner cube, from in all 4 directions.
 * https://en.wikipedia.org/wiki/Corner_reflector
 */
export function cornerCube(): Operator {
  return Operator.outer([
    Operator.fromSparseCoordNames(
      [
        ['<', '>', Cx(1)],
        ['v', '^', Cx(1)],
        ['>', '<', Cx(1)],
        ['^', 'v', Cx(1)],
      ],
      [dimDir],
    ),
    idPol,
  ])
}

/**
 * A polarizing beam splitter.
 * Think: a very thin slab of glass.
 * 0: [/], 90: [\]
 * @note Changed convention from 45 and 135deg!
 * @angle Angle in degrees, from -> CCW. Needs to be 0 or 90, up to 180deg.
 * @returns Operator with dimensions [dimDir, dimPol].
 */
export function polarizingBeamsplitter(angle: number): Operator {
  if (!_.includes([0, 90], mod(angle, 180))) {
    throw new Error(`polarizingBeamsplitter: angle ${angle} mod 180 not in [0, 90].`)
  }

  return Operator.add([idDir.outer(projH), ops.reflectFromPlaneDirection(angle + 45).outer(projV)])
}

/**
 * Faraday rotator (for polarization rotation)
 * https://en.wikipedia.org/wiki/Faraday_rotator
 * @angle Angle in degrees, from -> CCW. Needs to be multiple of 90.
 * 0: ->, 45: ^, 90: <-, 135: v
 * @param rot Rotation angle (in TAU) for polarization. By default 1/8 (45deg).
 * For more current, 2/8 and 3/8 make sense.
 */
export function faradayRotator(angle: number, polarizationRotation = 0.125): Operator {
  return Operator.add([
    Operator.outer([ops.diodeForDirections(angle), ops.rotationMatrix(polarizationRotation * TAU, dimPol)]),
    Operator.outer([ops.diodeForDirections(angle + 180), ops.rotationMatrix(-polarizationRotation * TAU, dimPol)]),
  ])
}

/**
 * A linear polarizer.
 * @param angle In plane rotation, in degrees [0, 90, 180, 270], i.e  | - | -.
 * @param polarizationOrientation A number, in tau, i.e. [0, 1]. 0 transmits hotizontal polarization, 0.25 - vertical.
 * @todo Check angle conventions.
 */
export function polarizer(angle: number, polarizationOrientation: number): Operator {
  return Operator.add([
    Operator.outer([ops.diodeForDirections(angle), ops.projectionMatrix(polarizationOrientation * TAU, dimPol)]),
    Operator.outer([ops.diodeForDirections(angle + 180), ops.projectionMatrix(-polarizationOrientation * TAU, dimPol)]),
  ])
}

/**
 * As from Quantum Game 1, for compatibility.
 * Don't use in other.
 * @param angle In deg. Can be any, but we use [0, 45, 90, ...].
 * @todo Check convention, etc
 */
export function polarizerWE(angle: number): Operator {
  return polarizer(0, angle / 360)
}

/**
 * As from Quantum Game 1, for compatibility.
 * Don't use in other.
 * @param angle In deg. Can be any, but we use [0, 45, 90, ...].
 * @todo Check convention, etc
 */
export function polarizerNS(angle: number): Operator {
  return polarizer(90, angle / 360)
}

/**
 * A phase plate for linear polarization.
 * @param angle In plane rotation, in degrees [0, 90, 180, 270], i.e  | - | -.
 * @param polarizationOrientation A number, in tau, i.e. [0, 1]. 0 transmits hotizontal polarization, 0.25 - vertical.
 * @param phase Phase shift. 1/4 (default) for quater-wave-plate, 1/2 for half-wave-plate.
 * @todo Convention: modify this polarization, ortonogal, or some other way?
 */
export function phasePlate(angle: number, polarizationOrientation: number, phase = 1 / 4): Operator {
  return Operator.add([
    Operator.outer([
      ops.diodeForDirections(angle),
      ops.phaseShiftForRealEigenvectors(polarizationOrientation * TAU, 0, phase, dimPol),
    ]),
    Operator.outer([
      ops.diodeForDirections(angle + 180),
      ops.phaseShiftForRealEigenvectors(-polarizationOrientation * TAU, 0, phase, dimPol),
    ]),
  ])
}

/**
 * As from Quantum Game 1, for compatibility.
 * Don't use in other.
 * @param angle In deg. Can be any, but we use [0, 45, 90, ...].
 * @todo Check convention, etc
 */
export function quarterWavePlateWE(angle: number): Operator {
  return phasePlate(0, angle / 360)
}

/**
 * As from Quantum Game 1, for compatibility.
 * @param angle In deg. Can be any, but we use [0, 45, 90, ...].
 * @todo Check convention, etc
 */
export function quarterWavePlateNS(angle: number): Operator {
  return phasePlate(90, angle / 360)
}

/**
 * Turn operator from coherent, polarized light, to incoherent, non-polarized intensity.
 * @param opDirPol Operator with [direction,polarization] dimensions.
 * @return Operator with real values and dimenson [direction].
 */
export function incoherentLightOperator(opDirPol: Operator): Operator {
  const opIntensity = opDirPol.mapValues((z) => z.mul(z.conj()))
  const polInputs = Vector.fromArray([Cx(0.5), Cx(0.5)], [Dimension.polarization()])
  const polOutpus = Vector.fromArray([Cx(1), Cx(1)], [Dimension.polarization()])
  return opIntensity.contractLeft([1], polOutpus).contractRight([1], polInputs)
}

/**
 * Compute operators from the grid cells
 * @param cell, an ICell interface
 * @returns IXYOperator
 */
export function generateOperator(cell: ICell): IXYOperator {
  const x = cell.x
  const y = cell.y
  switch (cell.element) {
    case Elem.Absorber: {
      return {
        x,
        y,
        op: attenuator(Math.SQRT1_2),
      }
    }
    case Elem.BeamSplitter: {
      return {
        x,
        y,
        op: beamSplitter(cell.rotation),
      }
    }
    case Elem.CoatedBeamSplitter: {
      return {
        x,
        y,
        op: beamSplitter(cell.rotation),
      }
    }
    case Elem.CornerCube: {
      return {
        x,
        y,
        op: cornerCube(),
      }
    }
    case Elem.Detector: {
      return {
        x,
        y,
        op: attenuator(0),
      }
    }
    case Elem.DetectorFour: {
      return {
        x,
        y,
        op: attenuator(0),
      }
    }
    case Elem.FaradayRotator: {
      return {
        x,
        y,
        op: faradayRotator(cell.rotation),
      }
    }
    case Elem.Gate: {
      return {
        x,
        y,
        op: attenuator(0),
      }
    }
    case Elem.Glass: {
      return {
        x,
        y,
        op: glassSlab(),
      }
    }
    case Elem.Glass: {
      return {
        x,
        y,
        op: glassSlab(),
      }
    }
    case Elem.HalfWavePlate: {
      return {
        x,
        y,
        op: Operator.add([
          phasePlate(0, cell.rotation / 360, 0.5), // qt.Elements.halfWavePlateWE(options.rotation)
          phasePlate(90, (cell.rotation + 90) / 360, 0.5), // qt.Elements.quarterWavePlateNS(options.rotation + 90)
        ]),
      }
    }
    case Elem.Laser: {
      return {
        x,
        y,
        op: attenuator(0),
      }
    }
    case Elem.Mine: {
      return {
        x,
        y,
        op: attenuator(0),
      }
    }
    case Elem.Mirror: {
      return {
        x,
        y,
        op: mirror(cell.rotation),
      }
    }
    case Elem.NonLinearCrystal: {
      return {
        x,
        y,
        op: attenuator(1),
      }
    }
    case Elem.Polarizer: {
      return {
        x,
        y,
        op: Operator.add([polarizerWE(cell.rotation), polarizerNS(cell.rotation + 90)]),
      }
    }
    case Elem.PolarizingBeamSplitter: {
      return {
        x,
        y,
        op: polarizingBeamsplitter(cell.rotation),
      }
    }
    case Elem.QuarterWavePlate: {
      return {
        x,
        y,
        op: Operator.add([quarterWavePlateWE(cell.rotation), quarterWavePlateNS(cell.rotation + 90)]),
      }
    }
    case Elem.Rock: {
      return {
        x,
        y,
        op: attenuator(0),
      }
    }
    case Elem.SugarSolution: {
      return {
        x,
        y,
        op: sugarSolution(0.125),
      }
    }
    case Elem.VacuumJar: {
      return {
        x,
        y,
        op: vacuumJar(),
      }
    }
    case Elem.Void: {
      return {
        x,
        y,
        op: attenuator(1),
      }
    }
    case Elem.Wall: {
      return {
        x,
        y,
        op: attenuator(0),
      }
    }

    default: {
      throw new Error(`Conversion from cell to operator failed: ${cell}.`)
    }
  }
}

/**
 * Compute list of operators from the grid
 * @param grid
 * @returns IXYOperator[] list
 */
export function generateOperators(grid: IGrid): IXYOperator[] {
  return grid.cells.map((cell) => {
    return generateOperator(cell)
  })
}
