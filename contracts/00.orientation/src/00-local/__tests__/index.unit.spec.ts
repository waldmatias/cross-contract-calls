import { VM } from "near-sdk-as";
import * as contract from '../assembly'

describe("00.orientation", () => {

  describe('Local interface', () => {
    describe('xcc()', () => {
      it('does not blow up on high level calls using function calls', () => {
        expect(() => {
          contract.xcc('high_fc', 'remote', 'do_some_work')
        }).not.toThrow()
      })
      it('does not blow up on high level calls using batch actions', () => {
        expect(() => {
          contract.xcc('high_ba', 'remote', 'do_some_work')
        }).not.toThrow()
      })
      it('does not blow up on low level calls using function calls', () => {
        expect(() => {
          contract.xcc('low_fc', 'remote', 'do_some_work')
        }).not.toThrow()
      })
      it('does not blow up on low level calls using batch actions', () => {
        expect(() => {
          contract.xcc('low_ba', 'remote', 'do_some_work')
        }).not.toThrow()
      })

    })
  })

})
