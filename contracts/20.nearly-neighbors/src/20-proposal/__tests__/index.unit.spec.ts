import { VM, VMContext, u128, context, logging } from 'near-sdk-as';
import * as contract from '../assembly';

const ONE_NEAR = u128.from('1000000000000000000000000');

const FACTORY_ACCOUNT_ID = 'neighbors.factory';

// Configuration values
const title = 'my contract';
const description = 'a test contract';
const goal = u128.mul(ONE_NEAR, u128.from(50));
const min_deposit = u128.mul(ONE_NEAR, u128.from(3));

const useFactoryAsPredecessor = (): void => {
  VMContext.setPredecessor_account_id(FACTORY_ACCOUNT_ID);
};

const setCurrentAccount = (): void => {
  VMContext.setCurrent_account_id('alice');
};

const attachDeposit = (deposit: number): void => {
  VMContext.setAttached_deposit(u128.mul(ONE_NEAR, u128.from(deposit)));
};

const attachMinDeposit = (): void => {
  VMContext.setAttached_deposit(min_deposit);
};

const doInitialize = (): void => {
  contract.initialize();
};

const doConfigure = (): void => {
  contract.configure(title, description, goal, min_deposit);
};

const initAndConfig = (): void => {
  attachMinDeposit();
  doInitialize();
  doConfigure();
};

describe('20.nearly-neighbors.proposal', () => {
  beforeEach(setCurrentAccount);
  beforeEach(useFactoryAsPredecessor);

  describe('initialize(): void', () => {
    it('creates a new proposal, storing the factory account ID (predecessor)', () => {
      attachMinDeposit();
      contract.initialize();
      expect(contract.get_factory()).toBe(FACTORY_ACCOUNT_ID);
    });

    it('requires a minimum deposit be attached', () => {
      expect(() => {
        contract.initialize();
      }).toThrow();
    });
  });

  describe('configure(title, description, goal, min_deposit): void', () => {
    beforeEach(attachMinDeposit);

    it('adds details and funding data to proposal', () => {
      doInitialize();

      expect(() => {
        contract.get_funding_total();
      }).toThrow();

      doConfigure();

      const proposal = contract.get_proposal();
      expect(proposal.details).not.toBeNull();
      expect(proposal.details!.title).toBe(title);
      expect(proposal.details!.description).toBe(description);
      expect(proposal.details!.author).toBe('bob');

      expect(proposal.funding!.goal).toBe(goal);
      expect(proposal.funding!.min_deposit).toBe(min_deposit);
    });

    it('switches is_configured() to true', () => {
      doInitialize();

      expect(contract.is_configured()).toBe(false);
      doConfigure();
      expect(contract.is_configured()).toBe(true);
    });
  });

  describe('when configured', () => {
    describe('get_proposal(): Proposal', () => {
      beforeEach(initAndConfig);

      it('returns the proposal object with factory, details, and funding', () => {
        const proposal = contract.get_proposal();

        expect(proposal.factory).not.toBeNull();
        expect(proposal.details).not.toBeNull();
        expect(proposal.funding).not.toBeNull();
      });
    });

    describe('resave_proposal(Proposal): void', () => {
      beforeEach(initAndConfig);

      it('updates the stored proposal data', () => {
        const proposal = contract.get_proposal();

        expect(proposal.details!.title).toBe(title);
        const newTotal = u128.mul(ONE_NEAR, u128.from(4));
        proposal.details!.title = 'new title';
        proposal.funding!.total = newTotal;

        expect(contract.get_proposal().details!.title).not.toBe('new title');
        expect(contract.get_proposal().funding!.total).not.toBe(newTotal);
        contract.resave_proposal(proposal);
        expect(contract.get_proposal().funding!.total).toBe(newTotal);
        expect(contract.get_proposal().details!.title).toBe('new title');
        expect(contract.get_funding_total()).toBe(newTotal);
      });
    });

    describe('get_funding_total(): u128', () => {
      beforeEach(initAndConfig);

      it('returns the current funding amount (accounting for MIN_ACCOUNT_BALANCE)', () => {
        expect(contract.get_funding_total()).toBe(u128.from(0));
      });
    });

    describe('is_fully_funded(): bool', () => {
      beforeEach(initAndConfig);

      xit('returns true when funding total is greater than or equal to the goal', () => {});
    });

    describe('add_supporter(): void', () => {
      beforeEach(initAndConfig);

      it('adds the signer + deposit to the list of supporters', () => {
        expect(contract.list_supporters().length).toBe(0);

        attachDeposit(4);
        VMContext.setSigner_account_id('cc');
        contract.add_supporter();

        const supporters = contract.list_supporters();
        expect(supporters.length).toBe(1);
        expect(supporters[0].account).toBe('cc');
        expect(supporters[0].amount).toBe(u128.mul(ONE_NEAR, u128.from(4)));

        expect(contract.get_funding_total()).toBe(
          u128.mul(ONE_NEAR, u128.from(4))
        );
      });

      it('updates the funding total', () => {
        expect(contract.list_supporters().length).toBe(0);
        expect(contract.get_funding_total()).toBe(u128.from(0));

        attachDeposit(5);
        VMContext.setSigner_account_id('carol');
        contract.add_supporter();

        expect(contract.list_supporters().length).toBe(1);
        expect(contract.get_funding_total()).toBe(
          u128.mul(ONE_NEAR, u128.from(5))
        );
      });
    });
  });

  describe('when not initialized', () => {
    beforeEach(attachMinDeposit);

    it('initialize() is idempotent; will throw if already initialized', () => {
      doInitialize();

      expect(doInitialize).toThrow();
    });

    it('configure() throws', () => {
      expect(doConfigure).toThrow();
    });
  });

  describe('when not configured', () => {
    beforeEach(attachMinDeposit);
    beforeEach(doInitialize);

    it('get_funding_total() throws', () => {
      expect(() => {
        contract.get_funding_total();
      }).toThrow();
    });

    it('is_fully_funded() throws', () => {
      expect(() => {
        contract.is_fully_funded();
      }).toThrow();
    });

    it('toString() throws', () => {
      expect(() => {
        contract.toString();
      }).toThrow();
    });

    it('add_supporter() throws', () => {
      expect(() => {
        contract.add_supporter();
      }).toThrow();
    });

    it('list_supporters() throws', () => {
      expect(() => {
        contract.list_supporters();
      }).toThrow();
    });
  });
});
