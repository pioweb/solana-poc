import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import bs58 from "bs58";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

import { GamerhashStakingV1 } from "../target/types/gamerhash_staking_v1";

import { MAX, toBN, getBalance, getBalanceByAccount } from "./utils";

const SEED_PREFIX = {
  pool: Buffer.from("pool"),
  vault: Buffer.from("vault"),
  position: Buffer.from("position"),
  configuration: Buffer.from("configuration"),
};

const ACCOUNTS = (programId: PublicKey, mint: PublicKey) => {
  return {
    vault: PublicKey.findProgramAddressSync(
      [SEED_PREFIX.vault, mint.publicKey.toBuffer()],
      programId,
    )[0],
    configuration: PublicKey.findProgramAddressSync(
      [SEED_PREFIX.configuration],
      programId,
    )[0],
    getPool: (index: number) => {
      return PublicKey.findProgramAddressSync(
        [SEED_PREFIX.pool, toBN(index).toBuffer("le", 1)],
        programId,
      )[0];
    },
    getPosition: (contributor: PublicKey, pid: number) => {
      return PublicKey.findProgramAddressSync(
        [
          SEED_PREFIX.position,
          toBN(pid).toBuffer("le", 1),
          contributor.toBuffer(),
        ],
        programId,
      )[0];
    },
  };
};

(async () => {
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");

  const mint = new anchor.Wallet(
    Keypair.fromSecretKey(
      bs58.decode(
        "HR1dDrLjS7nWopfsMVVtWnqwTjDuYjwwemLjCTHLtmtVMWY6T1F476oM9z6LiScTKAr8vVtvW3oTVqeTThngXY2",
      ),
    ),
  );

  const provider = new anchor.AnchorProvider(connection, mint, {
    commitment: "confirmed",
  });

  anchor.setProvider(provider);

  const ghx = Keypair.fromSecretKey(
    bs58.decode(
      "31Yv1oH8QooMFnQEYWN3MR8gpbUeQ2dwVxT5F4QX1aN1hM4LVPoDXof8SA2mEtnYwoPMhwtjG4RmTHyrzjpALn17",
    ),
  );

  const signer = Keypair.fromSecretKey(
    bs58.decode(
      "GL1Y6RymSoiuWZeQawU3kD79Ju1UEu1kjoES1yA9vYT7NJFpJiVbN3uvnYTg5c2vGULptKNNXngD26dafqSrbws",
    ),
  );

  const staking = anchor.workspace
    .gamerhashStakingV1 as anchor.Program<GamerhashStakingV1>;
  const accounts = ACCOUNTS(staking.programId, mint.payer);

  // Fetch staking pool info
  const pool = await staking.account.pool.fetch(accounts.getPool(1));
  console.log(pool);

  await staking.methods
    .deposit(0, toBN(10))
    .accounts({
      sender: signer.publicKey,
      senderAta: getAssociatedTokenAddressSync(
        mint.publicKey,
        signer.publicKey,
      ),
      mint: mint.publicKey,
      pool: accounts.getPool(0),
      position: accounts.getPosition(signer.publicKey, 0),
      tokenProgram: new PublicKey(
        "By2oVnXVEaMztJoCCcjE9fUqyoVyGX5eVdHapgxP3veV",
      ),
    })
    .signers([signer])
    .rpc({ commitment: "confirmed" });
})();
