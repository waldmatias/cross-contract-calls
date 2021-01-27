// @nearfile out
/**
 * The intent of a project is to realize a proposal.
 *
 * Once a proposal is fully funded, it is automatically converted to a project
 * and all funds transfered (except min storage staking for proposal contract
 * persistence)
 *
 * Actually tracking project progress is outside the scope of this work and
 * would fall to an oracle or DAO
 */

import {
  u128,
  context,
  storage,
  PersistentVector,
  PersistentMap,
  ContractPromise,
  logging,
} from 'near-sdk-as';

type AccountId = string;

const ONE_NEAR = u128.from('1000000000000000000000000');
const XCC_GAS = 5000000000000; // 5 teragas
const MIN_ACCOUNT_BALANCE = u128.mul(ONE_NEAR, u128.from(3)); // 3 NEAR min to keep account alive via storage staking
// TODO: this min account balance should be revisted after some real data is included bc this could end up being much higher

@nearBindgen
class Project {
  constructor(
    public factory: AccountId, // the factory contract that created the project
    public proposal: AccountId, // the proposal that lead to funding this project
    public details: ProjectDetails | null = null, // project metadata
    public funding: ProjectFunding | null = null, // project funding details
    public contributors: PersistentMap<
      AccountId,
      Contribution
    > = new PersistentMap<AccountId, Contribution>('c') // list of contributors to the project
  ) {}
}

@nearBindgen
class ProjectFunding {
  constructor(
    public total: u128 = u128.Zero, // total funding available to realize this project
    public spent: u128 = u128.Zero, // total spent to date
    public expenses: PersistentVector<Expense> = new PersistentVector<Expense>(
      'e'
    ) // list of expenses
  ) {}
}

@nearBindgen
class Expense {
  constructor(
    public label: string,
    public tags: string[], // collection of tags used to organize expenses
    public amount: u128 = u128.Zero // default to zero for expense notes
  ) {}
}

@nearBindgen
class ProjectDetails {
  constructor(
    public title: string,
    public description: string,
    public owner: AccountId
  ) {}
}

@nearBindgen
class Contribution {
  constructor(
    public account: AccountId, // the contributor's account
    public task: string, // the task description and details assigned to this contributor
    public amount: u128 = u128.Zero, // the budget for this contribution
    public status: TaskStatus = TaskStatus.ASSIGNED // the status of the contribution
  ) {}
}

@nearBindgen
class TaskStatus {
  public BLOCKED: i8 = 0;
  public ASSIGNED: i8 = 1;
  public IN_PROGRESS: i8 = 2;
  public COMPLETED: i8 = 4;
}

const PROJECT_KEY = 'state';

// ----------------------------------------------------------------------------
// CONTRACT methods
// ----------------------------------------------------------------------------

export function initialize(proposal: string): void {
  assert(!is_initialized(), 'Contract is already initialized.');
  assert(
    u128.ge(context.attachedDeposit, MIN_ACCOUNT_BALANCE),
    'MIN_ACCOUNT_BALANCE must be attached to initialize (3 NEAR)'
  );
  // setup basic proposal structure
  const project = new Project(context.predecessor, proposal);

  resave_project(project);
}

export function configure(title: string, description: string): void {
  assert(is_initialized(), 'Contract must be initialized first.');
  const project = get_project();
  project.details = new ProjectDetails(title, description, context.sender);
  project.funding = new ProjectFunding(
    u128.sub(context.accountBalance, MIN_ACCOUNT_BALANCE)
  );

  resave_project(project);
}

export function get_project(): Project {
  assert(is_initialized(), 'Contract must be initialized first.');
  return storage.getSome<Project>(PROJECT_KEY);
}

/**
 * Block UX from project details page until fully configured
 */
export function is_configured(): bool {
  assert(is_initialized(), 'Contract must be initialized first.');
  return !!get_project().details;
}

export function get_factory(): AccountId {
  assert(is_initialized(), 'Contract must be initialized first.');
  return get_project().factory;
}

export function get_proposal(): AccountId {
  assert(is_initialized(), 'Contract must be initialized first.');
  return get_project().proposal;
}

export function get_remaining_budget(): u128 {
  assert(is_configured(), 'Contract must be configured first.');
  const project = storage.get<Project>(PROJECT_KEY)!;
  return u128.sub(project.funding!.total, project.funding!.spent);
}

export function get_expenses(): PersistentVector<Expense> {
  assert(is_configured(), 'Contract must be configured first.');
  const project = storage.get<Project>(PROJECT_KEY)!;
  return project.funding!.expenses;
}

// ASK 1.1: is it better to decompose types into the contract interface like this to save on serde costs ...
export function add_expense(
  label: string,
  tags: string[],
  amount: u128 = u128.Zero
): void {
  assert(is_configured(), 'Contract must be configured first.');
  const project = storage.get<Project>(PROJECT_KEY)!;

  const expense = new Expense(label, tags, amount);
  project.funding!.expenses.push(expense);

  resave_project(project);
}

export function get_contributors(): PersistentMap<AccountId, Contribution> {
  assert(is_configured(), 'Contract must be configured first.');
  const project = storage.get<Project>(PROJECT_KEY)!;
  return project.contributors;
}

// ASK 1.2: ... or better to keep the custom types exposed like this for better readability?
export function add_contributor(
  account: AccountId,
  contribution: Contribution
): void {
  assert(is_configured(), 'Contract must be configured first.');
  const project = storage.get<Project>(PROJECT_KEY)!;

  const contributors = project.contributors;
  contributors.set(account, contribution);
  project.contributors = contributors;

  resave_project(project);
}

// // ----------------------------------------------------------------------------
// // INTERNAL functions
// // ----------------------------------------------------------------------------

function is_initialized(): bool {
  return !!storage.hasKey(PROJECT_KEY);
}

function toNEAR(amount: u128): string {
  return u128.div(amount, ONE_NEAR).toString();
}

function resave_project(project: Project): void {
  storage.set(PROJECT_KEY, project);
}

// // other functions:
// //  cancelProposal = if not funded by due date, then abort
// //    reimburseFunds = return funds to supporters
// //  transferFunds = move funding to project, assign to
