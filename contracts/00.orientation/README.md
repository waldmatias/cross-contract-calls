## Orientation to Cross-contract Calls

NEAR Protocol supports issuing transactions from within your contract code.  This covers the most common use cases like calling one contract from another as well as more advanced patterns like using one contract as a factory (to generate) or proxy (to relay calls) for other contracts.  The mechanism for this is referred to by several names which can be confusing at first until you realize that everyone is talking about different parts of the same elephant but from different perspectives.

### Receipts

All cross-contract calls (aka. "xcc") are based on the same underlying data structures: `ActionReceipts` and `DataReceipts`.

- `ActionReceipts` represent a *planned, guaranteed* transaction internal to the NEAR network, after signature has been verified
- `DataReceipts` represent the outcome of a completed transaction on its way to some final destination

You can read more about these artifacts in the [technical documentation here](https://nomicon.io/RuntimeSpec/Receipts.html).

### Levels of Abstraction

There are two (2) levels of abstraction in the NEAR SDKs for AssemblyScript and Rust.  The lower level is not recommended for use by developers new to the platform since the higher level is more developer friendly.  The files included in this module provide examples of each of these levels of abstraction with (hopefully) enough context to make their use clear.

- **High Level**:  
  - Function Call API  \
    Recommended for use when making single or multiple cross-contract function calls.  This API is fairly similar across both AssemblyScript and Rust with a few minor differences.
  - Batch Actions API  \
    Recommended for use when applying any type of [`Action`]() from within your contract code.  This API is fairly similar across both AssemblyScript and Rust with a few minor differences.

- **Low Level**:  \
  NOT recommended for general use but instructive since it exposes the raw API of the NEAR virtual machine for anyone interested in understanding how NEAR SDKs work under the hood.  This API is similar whether using AssemblyScript and Rust to write contracts since it interfaces directly with the virtual machine.

### Files in this Module

```
contracts
└── 00.orientation
    ├── README.md                           <-- this file
    ├── simulation
    │   ├── Cargo.toml
    │   └── src
    │       ├── lib.rs                      <-- simulation tests
    │       ├── local.rs                    <-- contract 00-local interface
    │       └── remote.rs                   <-- contract 00-remote interface
    └── src
        ├── 00-local
        │   ├── __tests__
        │   │   └── index.unit.spec.ts      <-- UNIT tests for the contract called "00-local"
        │   ├── asconfig.json               <-- compiler configuration helper
        │   └── assembly
        │       └── index.ts                <-- the 00-local contract itself
        └── 00-remote
            ├── __tests__
            │   └── index.unit.spec.ts
            ├── asconfig.json
            └── assembly
                └── index.ts
```

### Key Questions

There are a few key questions raised by the content in this module including:

- What are the tradeoffs between these different levels of abstractions, if any?
  - There's a difference in storage cost induced by the high level API vs. low level APIs
  - There's a difference in `burnt_gas` costs associated with each of these calls

- How are promises actually being reconciled on chain?
  - "Promises" on the NEAR platform are the developer-friendly name for `ActionReceipt` and `DataReceipt`
  - Promises resolve on function boundaries and there is currently no support for anything like `await` within the scope of a contract function
  - The return value of a promise is made available at some future block and there are exactly two ways to capture this value:
    1. As the return value of the exported function which eventually initiates the promise call, although it is said to return `void`
    2. As the "promise results" captured by a callback function

## Key Concepts of Cross-contract Calls

The ability to call a contract's method from another contract is an especially valuable feature on NEAR because of the way accounts, contracts and shards are related in the NEAR Protocol.

Each account on NEAR may have at most one contract.  User accounts usually do not host a contract while DApp accounts usually _do_ host a contract.   Some DApps may even require a system of interrelated contracts to coordinate the work of the DApp in which case these contracts would most likely be hosted on subaccounts, a valid account naming convention similar to DNS.  For example, `dapp.near` could be the top level account and could have subaccounts `module1.dapp.near`, `module2.dapp.near`, etc. for each of the interralated parts of the DApp.

Accounts are said to "live" on only one "home" shard, meaning: all their state is stored on one shard and all calls to a contract on that account are routed through the network to nodes following this shard.  Furthermore, the protocol reserves the right to reallocate accounts among shards which benefits the network by isolating especially popular accounts (ie. contracts) to their own shard where they do not affect the throughput of all other shards in the system.  At time of writing, NEAR MainNet is single sharded but progress is being made by the NEAR Core Team and Guilds in the community towards a multi-sharded network.

Developers who come to understand and take advantage of this account model will recognize several benefits:

- Any existing contracts on the network (ie. core contracts) can be recomposed into new DApps using cross-contract calls
- DApps with "hot spots" (points of expensive computation) in the contract code can be refactored to split contracts along these boundaries and take advantage of cross-contract calls for improved performance
- DApps with complex logic can be refactored into smaller, simpler contracts to simplify maintenance and increase the chances of contract reuse
- DApps with long running transactions that are unlikely or impossible to fit within a single block can be refactored into multiple cross-contract calls
- DApps with designs that would benefit from multiple parallel calls can use cross-contract calls to aggregate results

Whether taking advantage of existing contracts deployed to the network or building a system of interdependent contracts of your own, making calls from one contract to another and capturing the result is a valuable feature of NEAR protocol and a key differntiator of this layer 1 network.


## Function Calls

The most common pattern of making a cross-contract call is calling one contract method from another. This capability is supported by a dedicated interface for invoking these calls.

This interface is implemented at two levels of abstraction:
- a low level C-style interface that maps to the API of the NEAR virtual machine
- a high level ergonomic interface to support Rust and AssemblyScript types

### High Level Interface

The high level interface is designed to resemble the JavaScript Promise interface and wraps the low level interface for convenience, accepting Rust and AssemblyScript types as parameters

- `ContractPromise.create`: (static method) addresses the most common pattern, calling one contract method from another
- `ContractPromise.all`: (static method) allows merging the results of multiple method calls
- `ContractPromise.then`: allows chaining multiple method calls (i.e. do one after the other completes)

**when?**

This interface is recommended for all cross-contract calls that must invoke one contract from inside another contract method.  This covers about 80% of use cases.

The return value of the method call will not be implicitly captured or made available.

To capture the return value of the call, developers must explicitly choose from the following:
- after the end of the current function call
- using a callback to some other function

These options for capturing return values are not mutually exclusive.  Developers can use none, one or both approaches for the same cross-contract call depending on their requirements.

**how?**

This interface can be used in four patterns that can be recombined for more complex scenarios:
1. Ignore the return value altogether
2. Replace the return value of the same current method with the new return value of the remote method
3. Capture the return value of the remote method using a callback
4. Aggregate the return value of multiple remote methods

1. "Fire and Forget" (_the return value of the remote method will be ignored_)

```ts
export function fire_and_forget(): void {
  const promise = ContractPromise.create(
    remote_account,                            // target contract account name
    remote_method,                             // target method name
    remote_args,                               // target method arguments
    BASIC_GAS,                                 // gas attached to the call (~5 Tgas (5e12) per "hop")
    u128.Zero                                  // deposit attached to the call
  )
}
```

2. "Capture the Flag" (_the return value of the remote method will **become** the return value of this method_)

```ts
export function capture_the_flag(): void {
  const promise = ContractPromise.create(
    remote_account,                            // target contract account name
    remote_method,                             // target method name
    remote_args,                               // target method arguments
    BASIC_GAS,                                 // gas attached to the call (~5 Tgas (5e12) per "hop")
    u128.Zero                                  // deposit attached to the call
  )

  // replace the return value of this method with the result of the resolved promise
  promise.returnAsResult()
}
```

3. "Call Me Maybe" (_the return value of the remote method will be passed, via callback, to another method_)

```ts
export function call_me_maybe(): void {
  const callback_account = context.contractName
  const callback_method = 'on_complete'
  const callback_args = 'done and done'

  ContractPromise.create(
    remote_account,                            // target contract account name
    remote_method,                             // target method name
    remote_args,                               // target method arguments
    BASIC_GAS,                                 // gas attached to the call (~5 Tgas (5e12) per "hop")
    u128.Zero                                  // deposit attached to the call
  )

  // register callback
  .then(
    callback_account,                          // callback contract account name
    callback_method,                           // callback method name
    callback_args,                             // callback method arguments
    BASIC_GAS,                                 // gas attached to the callback (~5 Tgas (5e12) per "hop")
    u128.Zero                                  // deposit attached to the callback
  )
}

// the callback method itself
export function on_complete(args: string): void {
  logging.log(args)
}
```

4. "All Together Now" (_the return value of the remote methods will be merged into a tuple_)

```ts
export function all_together_now(): void {
  const promise_1 = ContractPromise.create(
    remote_account_1,                          // target contract account name
    remote_method_1,                           // target method name
    remote_args_1,                             // target method arguments
    BASIC_GAS,                                 // gas attached to the call (~5 Tgas (5e12) per "hop")
    u128.Zero                                  // deposit attached to the call
  )

  const promise_2 = ContractPromise.create(
    remote_account_2,                          // target contract account name
    remote_method_2,                           // target method name
    remote_args_2,                             // target method arguments
    BASIC_GAS,                                 // gas attached to the call (~5 Tgas (5e12) per "hop")
    u128.Zero                                  // deposit attached to the call
  )

  // aggregate multiple calls
  const promise_3 = ContractPromise.all(promise_1, promise_2)

  // replace the return value of this method with the results of the resolved promises
  promise_3.returnAsResult()
}
```

### Low Level Interface

This low level C-style interface interfaces directly with the NEAR virtual machine and supports the following operations:

- `promise_create`: addresses the most common pattern, calling one contract method from another
- `promise_and`: allows merging the results of multiple method calls
- `promise_then`: allows chaining multiple method calls (ie. do one after the other completes)

**when?**

This interface is not recommended for developers.  Instead, please use the high level interface.

**how?**

This interface requires all inputs to be converted to `UInt8Arrays` whose length and `datastart` pointer are passed to the function.  The return value of this interface is an integer value that uniquely identifies the `ActionReceipt` generated by the method which is used by the NEAR Protocol Runtime to coordinate the flow of cross-contract calls among affected accounts over the passage of time (ie. blocks).

```ts
export function promise_create(
    account_id_len: u64,
    account_id_ptr: u64,
    method_name_len: u64,
    method_name_ptr: u64,
    arguments_len: u64,
    arguments_ptr: u64,
    amount_ptr: u64,
    gas: u64
  ): u64;
```

```ts
export function promise_then(
    promise_index: u64,
    account_id_len: u64,
    account_id_ptr: u64,
    method_name_len: u64,
    method_name_ptr: u64,
    arguments_len: u64,
    arguments_ptr: u64,
    amount_ptr: u64,
    gas: u64
  ): u64;
```

```ts
  export declare function promise_and(
    promise_idx_ptr: u64,
    promise_idx_count: u64
  ): u64;
```

## Batch Calls

Another approach to making a cross-contract calls is to compose a transaction using one or more primitive actions and then sending this transaction to the network from within a contract method. This capability is supported by a dedicated interface for invoking these calls.

This interface is implemented at two levels of abstraction:
- a low level C-style interface that maps to the API of the NEAR virtual machine
- a high level ergonomic interface to support Rust and AssemblyScript types

### Eight Actions

NEAR Protocol supports eight (8) primitive actions that can be composed to form a single transaction.  This design provides a flexible mechanism for developers to control the behavior of the network.

Using batch cross-contract calls, developers append any one of the following 8 supported NEAR actions to a batch transaction which is then processed by the network:

- Managing Accounts
  - `CreateAccount`: make a new account (for a person, contract, refrigerator, etc)
  - `DeleteAccount `: delete an account (and transfer balance to a beneficiary account)
- Managing Access Keys
  - `AddKey`: add a key to an account (either FullAccess or FunctionCall access)
  - `DeleteKey`: delete an existing key from an account
- Managing Money
  - `Transfer`: move tokens from one account to another
  - `Stake`: express interest in becoming a validator at the next available opportunity
- Managing Contracts
  - `DeployContract`: deploy a contract
  - `FunctionCall`: invoke a method on a contract (including budget for compute and storage)

### High Level Interface

The high level interface uses a method chaining interface where transactions can be built up by chaining calls which append various actions.

- `ContractPromiseBatch.create`: (static method) create a promise which targets a specific receiver account, the account on which the transaction will be applied
- `ContractPromiseBatch#create_account`: create the receiver account
- `ContractPromiseBatch#delete_account`: delete the receiver account
- `ContractPromiseBatch#add_access_key`: add a function call access key to the receiver account
- `ContractPromiseBatch#add_full_access_key`: add a full access key to the receiver account
- `ContractPromiseBatch#delete_key`: delete a key from the receiver account
- `ContractPromiseBatch#transfer`: transfer NEAR tokens from the current account to the receiver account
- `ContractPromiseBatch#stake`: cause the receiver account to stake tokens
- `ContractPromiseBatch#deploy_contract`: deploy a contract (as an array of bytes) to the receiver account
- `ContractPromiseBatch#function_call`: invoke a method on the contract hosted by the receiver account
- `ContractPromiseBatch#then`: chain another transaction which targets a new (although possibly the same) receiver account

**when?**

This interface is recommended for all cross-contract calls which must initiate transactions composed of actions other than `FunctionCall` (although this specific action is _also_ supported by this interface).  This covers about 20% of the use cases one can imagine at time of writing.

The return value of the method call will not be implicitly captured or made available.

To capture the return value of the call, developers must explicitly choose from the following:
- after the end of the current function call
- using a callback to some other function

These options for capturing return values are not mutually exclusive.  Developers can use none, one or both approaches for the same cross-contract call depending on their requirements.

**how?**

Batch calls are almost a complete superset of the function call interface introduced earlier. It's therefore possible to recreate almost all the same patterns introduced above using this new interface with one notable exception.

*The batch interface handles returns differently and so does not support the ability to resolve the cross contract call with `returnAsResult()` to replace the value of the current (local) method with that of the remote method.*

> **The only way to capture the results of a cross-contract call initiated by the batch interface is using a callback method.**

Repeating here the same list as above:
- ignore the return value altogether
- **(not supported by batch calls)** replace the return value of the same current method with the return new value of the remote method
- capture the return value of the remote method using a callback
- aggregate the return value of multiple remote methods

1. "Fire and Forget" (_the return value of the remote method will be ignored_)

```ts
export function fire_and_forget(): void {
  const promise = ContractPromiseBatch.create(remote_account) // target contract account name
    .function_call(
      remote_method,                           // target method name
      remote_args,                             // target method arguments
      u128.Zero                                // deposit attached to the call
      BASIC_GAS,                               // gas attached to the call (~5 Tgas (5e12) per "hop")
    )
}
```

2. "Capture the Flag" (_the return value of the remote method will **become** the return value of this method_)

**UNSUPPORTED** by this interface

*The batch interface for making cross contract calls requires a callback to capture the results of a transaction.*


3. "Call Me Maybe" (_the return value of the remote method will be passed, via callback, to another method_)

```ts
export function call_me_maybe(): void {
  const callback_account = context.contractName
  const callback_method = 'on_complete'
  const callback_args = 'done and done'

  ContractPromiseBatch.create(remote_account)                    // target contract account name
    .function_call(
      remote_method,                           // target method name
      remote_args,                             // target method arguments
      u128.Zero,                               // deposit attached to the call
      BASIC_GAS,                               // gas attached to the call (~5 Tgas (5e12) per "hop")
    )

    // register callback
    .then(callback_account)                    // callback contract account name
    .function_call(
      callback_method,                         // callback method name
      callback_args,                           // callback method arguments
      u128.Zero,                               // deposit attached to the callback
      BASIC_GAS,                               // gas attached to the callback (~5 Tgas (5e12) per "hop")
    )
}

// the callback method itself
export function on_complete(args: string): void {
  logging.log(args)
}
```

4. "All Together Now" (_the return value of the remote methods will be merged into a tuple_)

```ts
export function all_together_now(): void {
  const promise_1 = ContractPromiseBatch.create(remote_account_1)                  // target contract account name
    .function_call(
      remote_method_1,                         // target method name
      remote_args_1,                           // target method arguments
      u128.Zero,                               // deposit attached to the call
      BASIC_GAS,                               // gas attached to the call (~5 Tgas (5e12) per "hop")
    )

  const promise_2 = ContractPromiseBatch.create(remote_account_2)                  // target contract account name
    .function_call(
      remote_method_2,                         // target method name
      remote_args_2,                           // target method arguments
      u128.Zero,                               // deposit attached to the call
      BASIC_GAS,                               // gas attached to the call (~5 Tgas (5e12) per "hop")
   )

  // aggregate multiple calls
  const promise_3 = ContractPromise.all(promise_1, promise_2)

  const callback_account = context.contractName
  const callback_method = 'on_all_complete'
  const callback_args = 'all for one, done and done'

  // to capture results of these two calls, register a third call as a callback
  promise_3.then(callback_account)             // callback contract account name
    .function_call(
      callback_method,                         // callback method name
      callback_args,                           // callback method arguments
      u128.Zero,                               // deposit attached to the callback
      BASIC_GAS,                               // gas attached to the callback (~5 Tgas (5e12) per "hop")
    )
}

// the callback method itself
export function on_all_complete(args: string): void {
  logging.log(args)
}
```

Further, the batch interface supports making cross-contract calls that are not possible using the function call interface.  Using batch calls, developers can create and transmit any imaginable transaction from _within their contract_.

This offers powerful new patterns of working with contracts including (but not limited to) the following:

- Proxy pattern: contracts can relay transfers from one account to another
- Factory pattern: contracts can generate new accounts then add keys and deploy a contract to those new accounts
- Freemium pattern: contracts can add function call access keys with preplanned allowances for users on a trial basis

1. "Foxy Proxy" (_a contract can receive calls and route them to other contracts_)

```ts
export function foxy_proxy(): void {
  const attached_deposit = context.attachedDeposit

  const part_a = u128.div(attached_deposit, 2)
  const part_b = u128.div(attached_deposit, 2)

  ContractPromiseBatch.create(recipient_a).transfer(part_a)
  ContractPromiseBatch.create(recipient_b).transfer(part_b)
}
```

2. "The X Factory" (_a contract can generate new accounts, deploy some contract to those accounts and initialize their state_)

```ts
export function the_x_factory(contract: string, account: string, key: string): void {
  // capture funding for the new account from attached deposit
  const funding = context.attachedDeposit

  // deployable contracts may be stored as Base64 encoded strings in some registry deployed as part of this factory contract
  const dynamicContract = base64.decode(contractRegistry.getSome(contract))

  ContractPromiseBatch.create(account)
    .create_account()                          // create new account
    .transfer(funding)                         // fund it
    .add_full_access_key(util.decode(key))     // add a full access key so the caller can control the new account
    .deploy_contract(dynamicContract)          // deploy some pre-existing contract to the new account
}
```

3. "Freemium Becometh Premium" (_a contract can manage function call access keys with fremium time and budget limits_)

```ts
export function freemium_becometh_premium(user: string, key: string): void {
  const dapp_account = context.contractName
  const fremium_dapp_user_account = user + '.' + dapp_account

  const ONE_NEAR = u128.from(10 ^ 24)
  const TRIAL_BUDGET = u128.mul(u128.from(10), ONE_NEAR) // 10 NEAR
  const ACCOUNT_BALANCE = u128.mul(u128.from(11), ONE_NEAR) // 11 NEAR (keep 1 NEAR to avoid forced trial account deletion)

  ContractBatchPromise.create(fremium_dapp_user_account)
    .create_account()
    .transfer(ACCOUNT_BALANCE)
    .add_access_key(
      key,                                     // public key matching private key that user already has
      TRIAL_BUDGET,                            // the total budget for this function call access key
      dapp_account,                            // receiver is this account, the DApp account which hosts the DApp contract
      ['trial_method_1', 'trial_method_2'],    // the methods on this DApp that the trial user can call using this access key
      0                                        // set FunctionCall access key nonce to zero
  )
}
```

Given the flexibility of this interface, developers can recreate any imaginable transaction from within their contract code.


### Low Level Interface

- `promise_batch_create`: create a promise which targets a specific receiver account, the account on which the transaction will be applied
- `promise_batch_action_create_account` : create the receiver account
- `promise_batch_action_delete_account`: delete the receiver account
- `promise_batch_action_add_key_with_function_call`: add a function call access key to the receiver account
- `promise_batch_action_add_key_with_full_access`: add a full access key to the receiver account
- `promise_batch_action_delete_key`: delete a key from the receiver account
- `promise_batch_action_transfer`: transfer NEAR tokens from the current account to the receiver account
- `promise_batch_action_stake`: cause the receiver account to stake tokens
- `promise_batch_action_deploy_contract` : deploy a contract (as an array of bytes) to the receiver account
- `promise_batch_action_function_call`: invoke a method on the contract hosted by the receiver account
- `promise_batch_then`: chain another transaction which targets a new (although possibly the same) receiver account

**when?**

This interface is not recommended for developers.  Instead, please use the high level interface.

**how?**

This interface requires all inputs to be converted to `UInt8Arrays` whose length and `datastart` pointer are passed to the function.

The return value of this interface is an integer value that uniquely identifies the `ActionReceipt` generated by the method which is used by the NEAR Protocol Runtime to coordinate the flow of cross-contract calls among affected accounts over the passage of time (ie. blocks).

```ts
export function promise_batch_create(
  account_id_len: u64,
  account_id_ptr: u64
): u64;
```

```ts
export function promise_batch_then(
  promise_index: u64,
  account_id_len: u64,
  account_id_ptr: u64
): u64;
```

```ts
// Other methods  of the low level batch call interface (those for each action) have been omitted for brevity.
// They can be found here: https://github.com/near/near-sdk-as/blob/master/sdk-core/assembly/env/env.ts#L159-L233
```

## Capturing Results

Developers choose (a) whether or not to capture results and (b) how to capture those results based on their requirements.

**when?**

The results of cross-contract calls are captured in one of two ways:
- results of a called (remote) method will _become_ the return value of the calling (local) method
- results of the called (remote) method can be extracted from the environment using the dedicated interface `ContractPromiseResult`

|                | ContractPromise\#getResults | ContractPromiseResult |       |
| :------------- | :-------------------------: | :-------------------: | :---: |
| Function Calls |          supported          |       supported       |       |
| Batch Calls    |          supported          |     NOT supported     |       |

Developers can also inspect the number of results available in a tuple of results if the return value of more than one cross-contract call was aggregated.


### High Level Interface

- `ContractPromise#getResults`
- `ContractPromiseResult`

### Low Level Interface

**how?**

```js
export function promise_results_count(): u64;
```

```ts
export function promise_result(
  result_idx: u64,
  register_id: u64
): u64;
```

```ts
export function promise_return(
  promise_id: u64
): void;
```
