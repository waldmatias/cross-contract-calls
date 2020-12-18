# Linkdrop

This example is based on a contract [originally written in Rust](https://github.com/near/near-linkdrop).

From the original repo (modified slightly for clarity):

> LinkDrop contract allows any user to create a link that their friends can use to claim tokens even if they don't have an account yet.
>
> Sender (the person who already has NEAR tokens):
> - Creates a new key pair `(public_key_1, private_key_1)`.
> - Calls `linkdrop.send(public_key_1)` with attached balance of NEAR that they want to send.
> - Sends the `private_key_1` to the person they wish to receive the tokens (this can be done via any supported wallet app)
>
> Linkdrop contract (the contract helping transfer NEAR between sender and receiver)
> - Captures the Sender's attached balance as a new record associated with `public_key_1`
>
> Receiver (the person who does not have NEAR yet)
> - Receives `private_key_1` (can be done via any supported wallet app)
> - Creates a new key pair `(public_key_2, private_key_2)`.
> - Decides on a `new_account_id` they want to use as their new account.
> - Calls `linkdrop.create_account_and_claim(new_account_id, public_key_2)`.
>
> Linkdrop contract
> - Creates new account named by the value of `new_account_id`
> - Adds `public_key_2` as full access key to the new account
> - Transfers Sender's NEAR tokens to the new account
>
> OUTCOME
> - Sender has sent some tokens to receiver
> - Receiver has a new account loaded with Sender's tokens
> - **Receiver user experience is wonderful**

> Exceptions
> - If Receiver already has account (or Sender wants to get back the money) then Sender can call `linkdrop.claim()` using original `private_key_1` which transfers money to signer's account.
