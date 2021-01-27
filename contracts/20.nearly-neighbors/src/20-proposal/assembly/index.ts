// @nearfile out
import {
  u128,
  context,
  storage,
  PersistentVector,
  PersistentSet,
  ContractPromise,
  logging,
} from 'near-sdk-as';

type AccountId = string;

const ONE_NEAR = u128.from('1000000000000000000000000');
const XCC_GAS = 5000000000000; // 5 teragas
const MIN_ACCOUNT_BALANCE = u128.mul(ONE_NEAR, u128.from(3)); // 3 NEAR min to keep account alive via storage staking

@nearBindgen
class Proposal {
  constructor(
    public factory: AccountId,
    public funding: ProposalFunding | null = null,
    public details: ProposalDetails | null = null
  ) {}
}

@nearBindgen
class ProposalFunding {
  constructor(
    public goal: u128,
    public min_deposit: u128 = MIN_ACCOUNT_BALANCE,
    public total: u128 = u128.Zero,
    public funded: bool = false
  ) {}
}

@nearBindgen
class ProposalDetails {
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
    public amount: u128
  ) // public coordinates: GeoCoords
  {}
}

@nearBindgen
class GeoCoords {
  constructor(public latitude: string, public longitude: string) {}
}

const PROPOSAL_KEY = 'state';

// ----------------------------------------------------------------------------
// CONTRACT methods
// ----------------------------------------------------------------------------

export function initialize(): void {
  logging.log(context.attachedDeposit);
  logging.log(MIN_ACCOUNT_BALANCE);
  logging.log(u128.ge(context.attachedDeposit, MIN_ACCOUNT_BALANCE));
  assert(!is_initialized(), 'Contract is already initialized.');
  assert(
    u128.ge(context.attachedDeposit, MIN_ACCOUNT_BALANCE),
    'MIN_ACCOUNT_BALANCE must be attached to initialize (3 NEAR)'
  );
  // setup basic proposal structure
  const proposal = new Proposal(context.predecessor);

  resave_proposal(proposal);
}

export function configure(
  title: string,
  description: string,
  goal: u128,
  min_deposit: u128
): void {
  assert(is_initialized(), 'Contract must be initialized first.');
  const proposal = get_proposal();
  proposal.details = new ProposalDetails(title, description, context.sender);
  proposal.funding = new ProposalFunding(goal, min_deposit);

  resave_proposal(proposal);
}

export function get_proposal(): Proposal {
  assert(is_initialized(), 'Contract must be initialized first.');
  return storage.getSome<Proposal>(PROPOSAL_KEY);
}

/**
 * Block UX from proposal details page until fully configured
 */
export function is_configured(): bool {
  assert(is_initialized(), 'Contract must be initialized first.');
  return !!get_proposal().details;
}

export function get_factory(): AccountId {
  assert(is_initialized(), 'Contract must be initialized first.');

  return get_proposal().factory;
}

export function get_funding_total(): u128 {
  assert(is_configured(), 'Contract must be configured first.');

  const proposal = storage.get<Proposal>(PROPOSAL_KEY)!;
  return proposal.funding!.total;
}

export function is_fully_funded(): bool {
  assert(is_configured(), 'Contract must be configured first.');
  const funding = get_funding_total()
  const goal = get_proposal().funding!.goal;
  return u128.ge(funding, goal);
}

// '<project title>.<proposal type>.neighborly.testnet'
// my-cafe.business.neighborly.testnet
//   my-cafe.business.proposal.neighborly.testnet
//   my-cafe.business.project.neighborly.testnet << created once funding has been met
export function toString(): string {
  assert(is_configured(), 'Contract must be configured first.');

  const proposal = get_proposal();

  return 'title: [' + proposal.details!.title + ']';
}

export function add_supporter(): void {
  assert(is_configured(), 'Contract must be configured first.');
  assert(!is_fully_funded(), 'Proposal is already fully funded.');

  const amount = context.attachedDeposit;
  const account = context.sender;

  const proposal = get_proposal();
  assert(
    u128.ge(context.attachedDeposit, proposal.funding!.min_deposit),
    'Please attach minimum deposit of [' +
      toNEAR(proposal.funding!.min_deposit) +
      '] NEAR'
  );

  const supporters = new PersistentVector<Supporter>('s');

  const supporter = new Supporter(account, amount);
  supporters.push(supporter);

  add_funding(amount);
}

export function list_supporters(): PersistentVector<Supporter> {
  assert(is_configured(), 'Contract must be configured first.');

  const supporters = new PersistentVector<Supporter>('s');
  return supporters;
}

// ----------------------------------------------------------------------------
// INTERNAL functions
// ----------------------------------------------------------------------------

function is_initialized(): bool {
  return storage.hasKey(PROPOSAL_KEY);
}

function add_funding(amount: u128): void {
  const current_total = get_funding_total();
  const new_amount = u128.add(amount, current_total);

  const proposal = get_proposal();
  const funding = proposal.funding!;

  funding.total = new_amount;
  funding.funded = u128.ge(funding.total, funding.goal);

  resave_proposal(proposal);

  if (funding.funded) {
    create_project();
  }
}

function toNEAR(amount: u128): string {
  return u128.div(amount, ONE_NEAR).toString();
}

// once funded, create a project
// if this is done by the factory, then easier to version
function create_project(): void {
  const proposal = get_proposal();
  const projectBudget = u128.sub(context.accountBalance, MIN_ACCOUNT_BALANCE);
  logging.log(context.accountBalance);
  logging.log(MIN_ACCOUNT_BALANCE);
  logging.log(projectBudget);

  ContractPromise.create(
    proposal.factory, // target contract account name
    'create_project', // target method name
    proposal.details, // target method arguments
    XCC_GAS // gas attached to the call (~5 Tgas (5e12) per "hop")
    // projectBudget             // deposit attached to the call
  );
}

export function resave_proposal(proposal: Proposal): void {
  storage.set(PROPOSAL_KEY, proposal);
}

// other functions:
//  cancelProposal = if not funded by due date, then abort
//    reimburseFunds = return funds to supporters
//  transferFunds = move funding to project, assign to
