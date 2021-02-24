#![allow(dead_code, unused_variables)]
mod local;
mod remote;
mod loopback;
pub use local::*;
pub use remote::*;
pub use loopback::*;

#[cfg(test)]
mod test {
    use near_sdk::json_types::U128;
    use near_sdk_sim::{call, deploy, init_simulator, ContractAccount, UserAccount};
    use super::*;

    // Load in contract bytes
    near_sdk_sim::lazy_static! {
      static ref LOOPBACK_WASM_BYTES: &'static [u8] = include_bytes!("../../../../build/debug/01-loopback.wasm").as_ref();
    //   static ref LOCAL_WASM_BYTES: &'static [u8] = include_bytes!("../../../../build/debug/01-local.wasm").as_ref();
    //   static ref REMOTE_WASM_BYTES: &'static [u8] = include_bytes!("../../../../build/debug/01-remote.wasm").as_ref();
    }

    fn init() -> (
        UserAccount,
        ContractAccount<LoopbackContract>,
        // ContractAccount<LocalContract>,
        // ContractAccount<RemoteContract>,
    ) {
        let master_account = init_simulator(None);

        // uses default values for deposit and gas
        let loopback_contract = deploy!(
            // Contract Proxy
            contract: LoopbackContract,
            // Contract account id
            contract_id: "loopback",
            // Bytes of contract
            bytes: &LOOPBACK_WASM_BYTES,
            // User deploying the contract,
            signer_account: master_account
        );

        // let local_contract = deploy!(
        //     // Contract Proxy
        //     contract: LocalContract,
        //     // Contract account id
        //     contract_id: "local",
        //     // Bytes of contract
        //     bytes: &LOCAL_WASM_BYTES,
        //     // User deploying the contract,
        //     signer_account: master_account
        // );

        // let remote_contract = deploy!(
        //     // Contract Proxy
        //     contract: RemoteContract,
        //     // Contract account id
        //     contract_id: "remote",
        //     // Bytes of contract
        //     bytes: &REMOTE_WASM_BYTES,
        //     // User deploying the contract,
        //     signer_account: master_account
        // );

        return (master_account, loopback_contract)//, local_contract, remote_contract)
    }

    #[test]
    fn test_call_myself() {
        let (master_account, loopback) = init();
        let res = call!(
            master_account,
            loopback.call_myself()
        );

        res.assert_success();

        println!(
            "{:#?}\n{:#?}\n",
            res,
            res.promise_results(),
        );

        // println!(
        //     "{:#?}\n{:#?}\n{:#?}\n",
        //     res,
        //     res.promise_results(),
        //     res.unwrap_json::<String>()
        // );
    }

    #[test]
    fn test_call_myself_with_args() {
        let (master_account, loopback) = init();
        let res = call!(
            master_account,
            loopback.call_myself_with_args()
        );

        res.assert_success();

        println!(
            "{:#?}\n{:#?}\n",
            res,
            res.promise_results(),
        );

        // println!(
        //     "{:#?}\n{:#?}\n{:#?}\n",
        //     res,
        //     res.promise_results(),
        //     res.unwrap_json::<String>()
        // ); {}
    }

    #[test]
    fn test_myself_with_args2() {
        let (master_account, loopback) = init();
        let res = call!(
            master_account,
            loopback.myself_with_args2("one", true, (0u128).into())
        );

        res.assert_success();

        println!(
            "{:#?}\n",
            res.unwrap_json::<U128>().0
        );

        // assert!(res.unwrap_json::<U128>().eq((1u128).into())
    }
}
