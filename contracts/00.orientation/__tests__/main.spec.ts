import { Runner, Runtime } from "near-runner";

jest.setTimeout(30000)

describe(`Running on ${Runner.getNetworkFromEnv()}`, () => {
  let runner: Runner

  beforeAll(async () => {
    runner = await Runner.create(async (runtime: Runtime) => {
      await runtime.createAndDeploy(
        "local",
        `${__dirname}/../../../build/debug/00-local.wasm`
      );
      await runtime.createAndDeploy(
        "remote",
        `${__dirname}/../../../build/debug/00-remote.wasm`
      );
    })
  })

  test('high level function call', async () => {
    await runner.run(async (runtime: Runtime) => {
      const root = runtime.getRoot();
      const local = runtime.getContractAccount('local');
      const remote = runtime.getContractAccount('remote');
      let res = await root.call_raw(
        local,
        'xcc',
        {
          level: 'high_fc',
          account: remote.accountId,
          method: 'do_some_work',
        }
      )
      console.log(res)
    })
  })
})