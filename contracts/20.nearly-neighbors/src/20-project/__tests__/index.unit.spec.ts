// import { VM, VMContext, u128, context, logging } from "near-sdk-as";
// import * as contract from "../assembly";

// const ONE_NEAR = u128.from("1000000000000000000000000");

// const FACTORY_ACCOUNT_ID = "neighbors.factory";

// // Configuration values
// const title = "my contract";
// const description = "a test contract";
// const goal = u128.mul(ONE_NEAR, u128.from(50));
// const min_deposit = ONE_NEAR;

// const useFactoryAsPredecessor = (): void => {
//   VMContext.setPredecessor_account_id(FACTORY_ACCOUNT_ID);
// };

// const setCurrentAccount = (): void => {
//   VMContext.setCurrent_account_id("alice");
// };

// const attachDeposit = (deposit: number): void => {
//   VMContext.setAttached_deposit(u128.mul(ONE_NEAR, u128.from(deposit)));
// };

// const attachMinDeposit = (): void => {
//   attachDeposit(3);
// };

// const doInitialize = (): void => {
//   contract.initialize();
// };

// const doConfigure = (): void => {
//   contract.configure(title, description, goal, min_deposit);
// };

// const initAndConfig = (): void => {
//   attachMinDeposit();
//   doInitialize();
//   doConfigure();
// };

// describe("20.nearly-neighbors.proposal", () => {
//   beforeEach(setCurrentAccount);
//   beforeEach(useFactoryAsPredecessor);

//   describe("initialize(): void", () => {
//     it("creates a new proposal, storing the factory account ID (predecessor)", () => {
//       attachMinDeposit();
//       doInitialize();
//       expect(contract.get_factory()).toBe(FACTORY_ACCOUNT_ID);
//     });

//     it("requires a minimum deposit be attached", () => {
//       expect(doInitialize).toThrow();
//     });
//   });

//   describe("configure(title, description, goal, min_deposit): void", () => {
//     beforeEach(attachMinDeposit);

//     it("adds details and funding data to proposal", () => {
//       doInitialize();

//       expect(() => {
//         contract.get_funding_total();
//       }).toThrow();

//       doConfigure();

//       const proposal = contract.get_proposal();
//       expect(proposal.details).not.toBeNull();
//       expect(proposal.details!.title).toBe(title);
//       expect(proposal.details!.description).toBe(description);
//       // TODO: @amgando - why is this "bob" despite calling context.setCurrent_account_id??
//       expect(proposal.details!.author).toBe("bob");

//       expect(proposal.funding!.goal).toBe(goal);
//       expect(proposal.funding!.min_deposit).toBe(min_deposit);
//     });

//     it("switches is_configured() to true", () => {
//       doInitialize();

//       expect(contract.is_configured()).toBe(false);
//       doConfigure();
//       expect(contract.is_configured()).toBe(true);
//     });
//   });

//   describe("when configured", () => {
//     beforeEach(initAndConfig);

//     describe("get_proposal(): Proposal", () => {
//       it("returns the proposal object with factory, details, and funding", () => {
//         const proposal = contract.get_proposal();

//         expect(proposal.factory).not.toBeNull();
//         expect(proposal.details).not.toBeNull();
//         expect(proposal.funding).not.toBeNull();
//       });
//     });

//     describe("get_funding_total(): u128", () => {
//       it("returns the current funding amount (accounting for MIN_ACCOUNT_BALANCE)", () => {
//         expect(contract.get_funding_total()).toBe(u128.from(0));
//       });
//     });

//     describe("is_fully_funded(): bool", () => {
//       xit("returns true when funding total is greater than or equal to the goal", () => {

//       })
//     })

//     describe("add_supporter(): void", () => {
//       it("adds the signer + deposit to the list of supporters", () => {
//         expect(contract.list_supporters().length).toBe(0);

//         attachDeposit(4)
//         VMContext.setSigner_account_id("carol");
//         contract.add_supporter();

//         const supporters = contract.list_supporters();
//         expect(supporters.length).toBe(1);
//         expect(supporters[0].account).toBe("carol");
//         expect(supporters[0].amount).toBe(u128.mul(ONE_NEAR, u128.from(4)));
//       });

//       // TODO: implement these tests
//       xit("updates the funding total", () => {
//         expect(contract.get_funding_total()).toBe(u128.from(0))

//         attachDeposit(3)
//         VMContext.setSigner_account_id('carol')
//         contract.add_supporter()

//         expect(contract.get_funding_total()).toBe(min_deposit)
//       })
//     });
//   });

//   describe("when not initialized", () => {
//     beforeEach(attachMinDeposit)

//     test("initialize() is idempotent; will throw if already initialized", () => {
//       doInitialize();

//       expect(doInitialize).toThrow();
//     });

//     test("configure() throws", () => {
//       expect(doConfigure).toThrow();
//     });
//   });

//   // describe("when not configured", () => {
//   //   beforeAll(doInitialize);
//   // });
// });
