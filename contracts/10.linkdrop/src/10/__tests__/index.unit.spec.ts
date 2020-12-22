import { u128, VM, VMContext, Context, env, base58, logging } from "near-sdk-as";
import * as contract from '../assembly'

const valid_account = 'alice'
const invalid_account = "XYZ"

let pk = "qSq3LoufLvTCTNGC3LJePMDGrok8dHMQ5A1YD9psbiz"
let deposit = u128.from("10000000000000000000000000"); // 10 NEAR

describe('LinkDrop', () => {
  beforeEach(() => {
    VMContext.setCurrent_account_id('linkdrop')
  })

  afterEach(() => {
    // cleanup storage between tests
  })

  describe('create_account', () => {
    it('allows the creation of a valid account', () => {
      contract.create_account(valid_account, pk)
      expect(() => {
        VMContext.setAttached_deposit(deposit)
        VMContext.setPrepaid_gas(deposit.toU64())
        contract.create_account(valid_account, pk)
      }).not.toThrow()

    })

    it('does not allow the creation of an invalid account', () => {
      expect(() => {
        VMContext.setAttached_deposit(deposit)
        contract.create_account(invalid_account, pk)
      }).toThrow() // Invalid account id
    })

    // TODO: verify that promise was created with funds for given username.
    //       but this needs simulation testing actually
  })

  describe('get_key_balance', () => {
    it('panics if an attempt is made to retrieve a missing account key', () => {
      expect(() => {
        contract.get_key_balance(pk);
      }).toThrow() // Key 'a::qSq3L...' is not present in the storage
    })

    it('is able to get missing balance', () => {
      // attach twice as much as needed
      const large_deposit = u128.mul(contract.ACCESS_KEY_ALLOWANCE, u128.from(2))
      VMContext.setAttached_deposit(large_deposit)
      contract.send(pk)

      // try getting the balance of the key
      let balance: u128 = contract.get_key_balance(pk);
      expect(balance).toBe(u128.sub(large_deposit, contract.ACCESS_KEY_ALLOWANCE))
    })
  })


  describe('create_account_and_claim', () => {
    it('panics if an attempt is made to claim an invalid account', () => {
      const large_deposit = u128.mul(contract.ACCESS_KEY_ALLOWANCE, u128.from(2))
      VMContext.setAttached_deposit(large_deposit)
      contract.send(pk)
      // Now, send new transaction to link drop contract.
      VMContext.setPredecessor_account_id('linkdrop')
      // @willem: looks like this method is broken?  not sure
      // VMContext.setSigner_account_pk(pk) // TypeError: Reflect.get called on non-object
      // log(Context.senderPublicKey) // "HuxUynD5GdrcZ5MauxJuu74sGHgS6wLfCqqhQkLWK" from default context object

      expect(() => {
        let pk2 = "2S87aQ1PM9o6eBcEXnTR5yBAVRTiNmvj8J8ngZ6FzSca"
        contract.create_account_and_claim(invalid_account, pk2);
      }).toThrow() // Invalid account id
    })

    // @willem: can't test this bc of the TypeError thrown on setSigner_account_pk()
    // which means i can't actually claim the key as another signer
    xit('works for a valid drop claim', () => {
      expect(env.isValidAccountID("alice")).toBeTruthy()
      // Deposit money to linkdrop contract.
      const large_deposit = u128.mul(contract.ACCESS_KEY_ALLOWANCE, u128.from(100))
      VMContext.setSigner_account_id("alice")
      VMContext.setAttached_deposit(large_deposit)
      contract.send(pk)

      // Now, send new transaction to link drop contract.
      VMContext.setPredecessor_account_id('linkdrop')
      // @willem: looks like this method is broken?  not sure
      // let public_key_arr = contract.decodePk(pk)
      // let canonical_pk = base58.encode(public_key_arr)
      // VMContext.setSigner_account_pk(canonical_pk) // TypeError: Reflect.get called on non-object
      // log(Context.senderPublicKey) // "HuxUynD5GdrcZ5MauxJuu74sGHgS6wLfCqqhQkLWK" from default context object
      VMContext.setAccount_balance(large_deposit)

      let pk2 = "2S87aQ1PM9o6eBcEXnTR5yBAVRTiNmvj8J8ngZ6FzSca"
      contract.create_account_and_claim(valid_account, pk2);
      // expect(() => {
      // }).not.toThrow()
      // @willem: this ends up throwing here bc the default key doesn't match the expected signer key
      // @willem: i guess we can fudge it now and expect the default key but would be better to fix so
      //          we're not introducing a magical key somewhere
      // Key 'a::HuxUynD5GdrcZ5MauxJuu74sGHgS6wLfCqqhQkLWK' is not present in the storage

      // TODO: verify that proper promises were created.
      //       but this needs simulation testing actually
    })
  })

  describe('send two times', () => {
    xit('increases linkdrop balance', () => {
      // Deposit money to linkdrop contract.
      const large_deposit = u128.mul(contract.ACCESS_KEY_ALLOWANCE, u128.from(2))
      VMContext.setCurrent_account_id('linkdrop')
      VMContext.setAttached_deposit(large_deposit)
      contract.send(pk)
      // assert_eq!(contract.get_key_balance(pk.clone()), (deposit - ACCESS_KEY_ALLOWANCE).into());
      expect(contract.get_key_balance(pk) == u128.sub(deposit, contract.ACCESS_KEY_ALLOWANCE))

      // Deposit money to linkdrop contract.
      VMContext.setCurrent_account_id('linkdrop')
      VMContext.setAttached_deposit(u128.add(u128.from(1), large_deposit))
      contract.send(pk)

      // assert_eq!(contract.accounts.get(& pk.into()).unwrap(), deposit + deposit + 1 - 2 * ACCESS_KEY_ALLOWANCE);
      expect(contract.get_key_balance(pk) == u128.sub(deposit, contract.ACCESS_KEY_ALLOWANCE))

      // @willem: my goal was to calculate this
      // deposit + deposit + 1 - 2 * ACCESS_KEY_ALLOWANCE
      // const expected_value = u128.add(deposit, u128.add(deposit, u128.sub(u128.from(1), u128.mul(u128.from(2), contract.ACCESS_KEY_ALLOWANCE))))
      // @willem: but then this happened
      /*
      WARNING AS217: Function '~lib/as-bignum/integer/u128/u128.add' cannot be inlined into itself.

       const expected_value = u128.add(deposit, u128.add(deposit, u128.sub(u128.from(1), u128.mul(u128.from(2), contract.ACCESS_KEY_ALLOWANCE))));
      */
      // @willem: so i did this.  good, bad or ugly?
      // deposit + deposit + 1 - 2 * ACCESS_KEY_ALLOWANCE
      // deposit + deposit + 1 - c
      // deposit + deposit + b
      // deposit + a
      const c = u128.mul(u128.from(2), contract.ACCESS_KEY_ALLOWANCE)
      const b = u128.sub(u128.from(1), c)
      const a = u128.add(deposit, b)
      const expected_value = u128.add(deposit, a)

      expect(contract.accounts.get(pk) == expected_value)
    })
  })
})
