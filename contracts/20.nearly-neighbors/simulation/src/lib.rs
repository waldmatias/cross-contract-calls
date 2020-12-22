#![allow(dead_code, unused_variables, unused_imports, non_snake_case)]
mod proposal;
pub use proposal::*;

#[cfg(test)]
mod test {
    use near_sdk::{serde_json::json, json_types::{Base58PublicKey}};//, U128};
    use near_sdk_sim::near_crypto::{InMemorySigner, KeyType};
    use std::convert::TryInto;

    use near_sdk_sim::{call, deploy, init_simulator, to_yocto, ContractAccount, UserAccount};
    use super::*;

    // Load in contract bytes
    near_sdk_sim::lazy_static! {
    //   static ref FACTORY_WASM_BYTES: &'static [u8] = include_bytes!("../../../../build/debug/20-factory.wasm").as_ref();
      static ref PROPOSAL_WASM_BYTES: &'static [u8] = include_bytes!("../../../../build/debug/20-proposal.wasm").as_ref();
    }

    fn init() -> (
        UserAccount,
        ContractAccount<ProposalContract>,
    ) {
        let master_account = init_simulator(None);
        // uses default values for deposit and gas
        let proposal_contract = deploy!(
            // Contract Proxy
            contract: ProposalContract,
            // Contract account id
            contract_id: "proposal",
            // Bytes of contract
            bytes: &PROPOSAL_WASM_BYTES,
            // User deploying the contract,
            signer_account: master_account
        );

        (master_account, proposal_contract)
    }
    // #[test]
    // fn test_create_account() {
    //     let initial_balance = to_yocto(STORAGE_AMOUNT);
    //     let (master_account, linkdrop) = init(initial_balance);
    //     let pk: Base58PublicKey = "qSq3LoufLvTCTNGC3LJePMDGrok8dHMQ5A1YD9psbiz"
    //     .try_into()
    //     .unwrap();
    //     let res = call!(
    //         master_account,
    //         linkdrop.create_account("bob", "qSq3LoufLvTCTNGC3LJePMDGrok8dHMQ5A1YD9psbiz")
    //     );
    //     println!("{:#?}\n{:#?}\n{:#?}\n", res, res.promise_results(), res.unwrap_json::<String>());
    // }

    #[test]
    fn test_initialize() {
      let (master_account, proposal) = init();
      let res = call!(
          master_account,
          proposal.initialize()
      );
      // println!("{:#?}\n{:#?}\n{:#?}\n", res, res.promise_results(), res.unwrap_json::<String>());
      // println!("{:#?}\n", res);
      res.assert_success()
    }

    #[test]
    fn test_factory() {
        let (master_account, proposal) = init();
        
        call!(
            master_account,
            proposal.initialize()
        );
      
        let res = call!(
            master_account,
            proposal.get_factory()
        );
        // println!("{:#?}\n", res.unwrap_json_value());
        assert!(res.unwrap_json_value().eq("root"));
    }

    #[test]
    fn test_add_supporter() {
      let (master_account, proposal) = init();
      
      call!(
        master_account,
        proposal.initialize()
      );
      
      let added = call!(
        master_account,
        proposal.add_supporter(),
        deposit = to_yocto("1.5")
      );
    
      println!("{:#?}\n", added);
      
      let res = call!(
        master_account,
        proposal.get_funding()
      );

      
      println!("{:#?}\n", res);
      println!("{:#?}\n", res.unwrap_json_value());
      // assert!(res.unwrap_json_value().eq("root"));
      
    }
}