import _ from 'lodash'
import Complex from "../src/Complex"
import { VectorEntry } from "../src/Entry"
import Vector from "../src/Vector"
import Dimension from "../src/Dimension"

const complex1 = new Complex(3, -1)
const complex2 = new Complex(2, 0)
const complex3 = new Complex(0, -1)
const complex4 = new Complex(1, -1)

console.log("Testing complex implementation:")
console.log(complex1.toString())
console.log(complex2.toString())
console.log(complex3.toString())
console.log(complex4.toString())

console.log("Testing complex radial:")
console.log(complex1.toStringPolar())
console.log(complex2.toStringPolar())
console.log(complex3.toStringPolar())
console.log(complex4.toStringPolar())

console.log("Testing complex radial with TAU:")
console.log(complex1.toStringPolarTau())
console.log(complex2.toStringPolarTau())
console.log(complex3.toStringPolarTau())
console.log(complex4.toStringPolarTau())

console.log("\nTesting converting idx to coord; we accidentally got little endian")
_.range(2 * 4 * 3)
    .forEach((i) => {
        const coord = VectorEntry.fromIndexValue(i, [2, 4, 3], complex1).coord
        console.log(`${i} => ${coord}`)
    })

console.log("\nTesting sparse cell:")
const cell1 = new VectorEntry([2, 1, 2], complex1)
const cell2 = new VectorEntry([2, 0, 2], complex2)
const cell3 = new VectorEntry([0, 1, 2], complex3)
const cell4 = new VectorEntry([0, 2, 1], complex4)
console.log(cell1.toString())
console.log(cell2.toString())

console.log("\nTesting sparse cell outer product:")
const outerCell = cell1.outer(cell2)
console.log(outerCell.toString())

console.log("\nTesting dimensions:")
const dim1 = Dimension.polarization()
const dim2 = Dimension.spin()
const dim3 = Dimension.direction()
const dims1 = [dim1, dim2, dim3]
const dims2 = [dim1, dim2, dim3]
console.log(dim1.toString())
console.log(dim2.toString())
console.log(dim3.toString())

console.log("\nTesting vector:")
const vector1 = new Vector([cell1, cell2, cell1], dims1)
const vector2 = new Vector([cell3, cell4, cell4], dims2)
console.log(vector1.toString())
console.log(vector2.toString())

console.log("\nLoading vector from dense matrix sequential list.")
const vector3 = Vector.fromArray([complex1, complex2, complex3, complex4], [dim1, dim2])

console.log("\nTesting vector outer product:")
const outerVector1 = vector1.outer(vector2)
console.log(outerVector1.toString())