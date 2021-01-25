# Cross-contract calls

This repo is a collection of examples using cross-contract calls on the NEAR platform

## Contracts

- [Orientation](./contracts/00.orientation/README.md)
- [Linkdrop](./contracts/10.linkdrop/README.md)
- [NEARly Neighbors](./contracts/20.nearly-neighbors/README.md)

## Organization

The folder structure of this repo is organized around a series of lessons about making cross contract calls.

The first few lessons are designed to build a clear mental model of how cross contract calls work and how to apply them.

```sh
00.orientation                # explore basic concepts and examples
01.using-single-calls         # explore several patterns starting with a single cross contract call
02.using-multiple-calls       # explore patterns focused on coordinating multiple cross contract calls
03.using-callbacks            # expore cross contract calls with callbacks
```

Later lessons build on the basics with more releastic (and naturally more complicated) examples.

```sh
10.linkdrop                   # a more complete example of using cross contract calls in a real world use case
```

Other contracts act as **dApp seeds** - fully-functional families of contracts along with UI wireframes which devs can use as a foundation on which to build their own applications.

```sh
20.nearly-neighbors           # a family of contracts to enable crowd-sourced civic development
```

Each of these contracts is designed to be self-contained and so may be extracted into your own projects and used as a starting point.  If you do decide to use this code, please pay close attention to all top level files including:

- NodeJS artifacts
  - `package.json`: JavaScript project dependencies and several useful scripts

- AssemblyScript artifacts
  - `asconfig.json`: AssemblyScript project (and per contract) configuration including workspace configuration
  - `as-pect.config.js`: as-pect unit testing dependency
  - `contracts/tsconfig.json`: load TypeScript types
  - `contracts/as_types.ts`: AssemblyScript types header file
  - `contracts/as-pect.d.ts`: as-pect unit testing types header file

- Rust artifacts
  - `Cargo.toml`: Rust project dependencies and configuration


## Getting started

1. clone this repo locally
2. `yarn` (or `npm install`)
3. yarn test:00 (or `npm run test:00`)
4. explore the contents of `/contracts/00.orientation`

See below for more convenience scripts ...

## Testing

### Unit Tests

**Run unit tests**

```sh
yarn test:unit                # asp --verbose --nologo -f unit.spec
```

**Run unit tests for individual examples**

```sh
yarn test:u:00                # run units tests for example 00
```

### Simulation Tests

**Run simulation tests**

These tests can be run from within VSCode (or any Rust-compatible IDE) or from the command line

_NOTE: Rust is required_

```sh
yarn test:simulate            # yarn build:release && cargo test -- --nocapture
```

### All Tests

**Test all**

```sh
yarn test                     # yarn test:unit && test:simulate
```
