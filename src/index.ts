import * as anchor from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import bs58 from "bs58";

import { GamerhashFarmingV1 } from "../abi/types/gamerhash_farming_v1";
import { GamerhashStakingV1 } from "../abi/types/gamerhash_staking_v1";

import idlFarming from "../abi/idl/gamerhash_farming_v1.json";
import idlStaking from "../abi/idl/gamerhash_staking_v1.json";

// import { initSdk } from "./config";
import { MAX, getBalance, getBalanceByAccount, toBN } from "./utils";

const SEED_PREFIX = {
  pool: Buffer.from("pool"),
  vault: Buffer.from("vault"),
  vault0: Buffer.from("vault_0"),
  vault1: Buffer.from("vault_1"),
  position: Buffer.from("position"),
  configuration: Buffer.from("configuration"),
};

const ACCOUNTS = (
  programId: PublicKey,
  mint0: anchor.web3.PublicKey,
  mint1: anchor.web3.PublicKey
) => {
  return {
    vault0: PublicKey.findProgramAddressSync(
      [SEED_PREFIX.vault0, mint0.toBuffer()],
      programId
    )[0],
    vault1: PublicKey.findProgramAddressSync(
      [SEED_PREFIX.vault1, mint1.toBuffer()],
      programId
    )[0],
    configuration: PublicKey.findProgramAddressSync(
      [SEED_PREFIX.configuration],
      programId
    )[0],
    pool: PublicKey.findProgramAddressSync([SEED_PREFIX.pool], programId)[0],
    getPosition: (contributor: PublicKey) => {
      return PublicKey.findProgramAddressSync(
        [SEED_PREFIX.position, contributor.toBuffer()],
        programId
      )[0];
    },
  };
};

(async () => {
  // const raydium = await initSdk();
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  // w/out provider
  // const signer = Keypair.fromSecretKey(
  //   bs58.decode(
  //     "37EVnoLtzkWKr4FcUFWWyVVSSd1xnc5ucFS3y4H86Dh12xhQoaHpm6ePzsMAxwpay97mWrgfo1hCboUDzHnRfK95"
  //   )
  // );
  // const wallet = new anchor.Wallet(signer);
  // const provider = new anchor.AnchorProvider(connection, wallet, {
  //   commitment: "confirmed",
  // });
  // anchor.setProvider(provider);

  const ghx = new PublicKey("By2oVnXVEaMztJoCCcjE9fUqyoVyGX5eVdHapgxP3veV"); // GHX
  const wsolGhx = new PublicKey("Bj4VZvWdFPvPqJhooiAAxeDS9ySGFEBjWSzf7YL92xmP"); // WSOL-GHX
  const wsolGhxLiquidityRaydium = new PublicKey(
    "FqE37jrHP28MrYCcsGErY6LKo1mWjJKBFp6Cu8VjA8L7"
  ); // Raydium (WSOL-GHX) Market

  const staking = new anchor.Program(idlStaking as GamerhashStakingV1, {
    connection,
  });
  const farming = new anchor.Program(idlFarming as GamerhashFarmingV1, {
    connection,
  });

  // Raydium API test
  // const clmm = await raydium.api.fetchPoolById({
  //   ids: "3ucNos4NbumPLZNWztqGHNFFgkHeRMBQAVemeeomsUxv",
  // });

  // const wsolGhx = await raydium.api.fetchPoolById({
  //   ids: "6oSigCEyuQgsyvRS151PePSrnS2FWgmsgh2B6RtogPaM",
  // });

  // *****************************************************

  // 1) ile GHX na WSOL-GHX?

  const vaultGhx = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool_vault"),
      new PublicKey("6oSigCEyuQgsyvRS151PePSrnS2FWgmsgh2B6RtogPaM").toBuffer(), // ??????
      new PublicKey("Cy52Ts2GwSzdkhCihB5i1Vu6sApzgqktNNFyHbsdgwm7").toBuffer(), // ??????
    ],
    new PublicKey("CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C") // ??????
  )[0];

  const { value: balanceGhx } = await connection.getTokenAccountBalance(
    vaultGhx
  );

  // 2) ile WSOL na WSOL-GHX?

  const vaultWsol = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool_vault"),
      new PublicKey("AfSzdkhCihB5i1................").toBuffer(), // ??????
      new PublicKey("CihB5i1Vu6sAp.................").toBuffer(), // ??????
    ],
    new PublicKey("CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C") // ??????
  )[0];

  const { value: balanceWsol } = await connection.getTokenAccountBalance(
    vaultWsol
  );
})();
