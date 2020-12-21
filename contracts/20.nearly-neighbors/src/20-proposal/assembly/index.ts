import { u128, context, storage, PersistentVector, PersistentSet, ContractPromise } from "near-sdk-as"

type AccountId = string

@nearBindgen
class Proposal {
  constructor(
    public title: string,
    public description: string,
    public author: AccountId
  ) {}
}

@nearBindgen
class Supporter {
  constructor(
    public account: AccountId, 
    public amount: u128, 
    public coordinates: GeoCoords
  ) {}
}

@nearBindgen
class GeoCoords {
  constructor(
    public latitude: string, 
    public longitude: string
  ) {}
}

const supporters = new PersistentVector<Supporter>('s')

const KEY_FACTORY = "fa"
const KEY_METADATA = "m"
const KEY_FUNDED = "f"
const KEY_TOTAL_FUNDING = "tf"
const KEY_MIN_DEPOSIT = "md"
const KEY_FUNDING_GOAL = "fg"
const ONE_NEAR = u128.from("1000000000000000000000000")
const XCC_GAS = 5000000000000 // 5 teragas
const MIN_ACCOUNT_BALANCE = u128.mul(ONE_NEAR, u128.from(3)) // 3 NEAR min to keep account alive via storage staking

export function initialize(): void {
  storage.set(KEY_FACTORY, context.predecessor)
  storage.set(KEY_METADATA, false)
}

export function is_configured(): bool {
  return storage.getSome<bool>(KEY_METADATA)
}

export function configure(title: string, description: string, funding_goal: u128, min_deposit: u128): void {
  const proposal = new Proposal(title, description, context.sender)
  storage.set(KEY_METADATA, proposal)
  
  storage.set(KEY_FUNDING_GOAL, funding_goal)
  storage.set(KEY_MIN_DEPOSIT, min_deposit)  
  storage.set(KEY_FUNDED, false)
}

// '<project title>.<proposal type>.neighborly.testnet'
// my-cafe.business.neighborly.testnet
//   my-cafe.business.proposal.neighborly.testnet
//   my-cafe.business.project.neighborly.testnet << created once funding has been met
export function toString(): string {
  const proposal = storage.getSome<Proposal>("m")
  // const funding_goal = storage.get(KEY_FUNDING_GOAL)!
  // const min_deposit = storage.get(KEY_MIN_DEPOSIT)!
  
  return "title: ["+ proposal.title + "]"
}

export function add_supporter(coordinates: GeoCoords): void {
  assert(!storage.getSome<bool>(KEY_FUNDED), "Already funded")
  
  const amount = context.attachedDeposit
  const min_deposit = storage.get<u128>(KEY_MIN_DEPOSIT)!
  assert(u128.ge(context.attachedDeposit, min_deposit), "Please attach minimum deposit of [" + toNEAR(min_deposit) + "] NEAR")

  const account = context.sender
  
  const supporter = new Supporter(account, amount, coordinates)
  supporters.push(supporter)
  
  add_funding(amount)
}

export function list_supporters(): PersistentVector<Supporter> {
  return supporters
}

function add_funding(amount: u128): void {
  const current_total = storage.get<u128>(KEY_TOTAL_FUNDING)!
  const new_amount = u128.add(amount, current_total)
  storage.set(KEY_TOTAL_FUNDING, new_amount)
  track_funded()
}

function track_funded(): void  {
  const total_funding = storage.get<u128>(KEY_TOTAL_FUNDING)!
  const funding_goal = storage.get<u128>(KEY_FUNDING_GOAL)!
  
  const funded = u128.ge(total_funding, funding_goal)
  // const funded = total_funding > funding_goal
  
  storage.set(KEY_FUNDED, funded)
  
  if(funded) {
    create_project()
  }
} 

function toNEAR(amount: u128): string {
  return u128.div(amount, ONE_NEAR).toString()
}

// once funded, create a project
// if this is done by the factory, then easier to version
function create_project(): void {
  const factory = storage.getSome<AccountId>(KEY_FACTORY)
  const proposal = storage.getSome<Proposal>(KEY_METADATA)
  const projectBudget = u128.sub(context.accountBalance, MIN_ACCOUNT_BALANCE)
  ContractPromise.create(
    factory,                  // target contract account name
    "create_project",         // target method name
    proposal,                 // target method arguments
    XCC_GAS,                  // gas attached to the call (~5 Tgas (5e12) per "hop")
    projectBudget             // deposit attached to the call
  )
}



// other functions:
//  cancelProposal = if not funded by due date, then abort
//    reimburseFunds = return funds to supporters
//  transferFunds = move funding to project, assign to 
