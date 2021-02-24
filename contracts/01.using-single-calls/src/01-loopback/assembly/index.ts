import { context, ContractPromise, logging, u128 } from "near-sdk-as";

const ONE_TERAGAS = 1000000000000
const FIVE_TERAGAS = 5 * ONE_TERAGAS

export function call_myself(): void {
  logging.log('call_myself() was called ... ' + Environment.capture())

  const self = context.contractName

  ContractPromise.create(
    self,
    "myself",
    '{}',
    FIVE_TERAGAS,
    u128.Zero
  )
}

export function call_myself_with_args(): void {
  logging.log('call_myself_with_args() was called ... ' + Environment.capture())

  const self = context.contractName
  const custom = new CustomType("one", true, u128.Zero)
  const args = new CustomTypeWrapper(custom)

  ContractPromise.create(
    self,
    "myself_with_args",
    args,
    FIVE_TERAGAS,
    u128.Zero
  )

  ContractPromise.create(
    self,
    "myself_with_args2",
    custom,
    FIVE_TERAGAS,
    u128.Zero
  )
}


@nearBindgen
class CustomType {
  constructor(
    public arg1: string,
    public arg2: bool,
    public arg3: u128
  ) { }

  toString(): string {
    return this.arg1 + '|' + this.arg2.toString() + '|' + this.arg3.toString()
  }
}

@nearBindgen
class CustomTypeWrapper {
  constructor(public args: CustomType) { }
}

// export function call_myself_and_return(): void {
//   logging.log('call_myself_and_return() was called ... ' + Environment.capture())

//   const self = context.contractName

//   const promise = ContractPromise.create(
//     self,
//     "myself_with_return",
//     '{}',
//     FIVE_TERAGAS,
//     u128.Zero
//   )

//   promise.returnAsResult()
// }

export function myself(): void {
  logging.log('myself() was called ... ' + Environment.capture())
}

export function myself_with_args2(arg1: string, arg2: bool, arg3: u128): u128 {
  logging.log('myself_with_args2() was called ... ' + Environment.capture())
  // return arg1.split('').reverse().join('')
  return u128.add(arg3, u128.from(5))
}

export function myself_with_args(args: CustomType): void {
  logging.log('args: ' + args.toString())
  logging.log('myself_with_args() was called ... ' + Environment.capture())
}

// export function myself_with_return(): string {
//   logging.log('myself_with_return() was called ... ' + Environment.capture())
//   return 'some value'
// }


/**
 * This class is used to capture and serialize interesting environment variables
 * for logging purposes
 */
class Environment {
  static epoch: u64 = context.epochHeight;
  static block: u64 = context.blockIndex;
  static timestamp: u64 = context.blockTimestamp;

  static contract: string = context.contractName;
  static sender: string = context.sender;
  static predecessor: string = context.predecessor;

  static toString(prefix: string): string {
    let message = prefix
    message += '[e:' + this.epoch.toString() + '|b:' + this.block.toString() + '|t:' + this.timestamp.toString() + '] '
    message += '[c:' + this.contract + '|s:' + this.sender + '|p:' + this.predecessor + '] '
    return message
  }

  static capture(prefix: string = ''): string {
    return Environment.toString(prefix)
  }
}
