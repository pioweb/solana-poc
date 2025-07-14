import * as anchor from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { BigNumber } from "bignumber.js";
import bs58 from "bs58";

import { GamerhashFarmingV1 } from "../abi/types/gamerhash_farming_v1";
import { GamerhashStakingV1 } from "../abi/types/gamerhash_staking_v1";

import idlFarming from "../abi/idl/gamerhash_farming_v1.json";
import idlStaking from "../abi/idl/gamerhash_staking_v1.json";

import {
  AVERAGE_SLOTS_PER_YEAR,
  MAX,
  calculatePendingReward,
  getBalance,
  getBalanceByAccount,
  getTokenTotalSupply,
  toBN,
} from "./utils";

const SEED_PREFIX = {
  pool: Buffer.from("pool"),
  vault: Buffer.from("vault"),
  vault0: Buffer.from("vault_0"),
  vault1: Buffer.from("vault_1"),
  position: Buffer.from("position"),
  configuration: Buffer.from("configuration"),
};

const STAKING_ACCOUNTS = (
  programId: PublicKey,
  mint: anchor.web3.PublicKey
) => {
  return {
    vault: PublicKey.findProgramAddressSync(
      [SEED_PREFIX.vault, mint.toBuffer()],
      programId
    )[0],
    configuration: PublicKey.findProgramAddressSync(
      [SEED_PREFIX.configuration],
      programId
    )[0],
    getPool: (index: number) => {
      return PublicKey.findProgramAddressSync(
        [SEED_PREFIX.pool, toBN(index).toArrayLike(Buffer, "le", 1)],
        programId
      )[0];
    },
    getPosition: (contributor: PublicKey, pid: number) => {
      return PublicKey.findProgramAddressSync(
        [
          SEED_PREFIX.position,
          toBN(pid).toArrayLike(Buffer, "le", 1),
          contributor.toBuffer(),
        ],
        programId
      )[0];
    },
  };
};

const FARMING_ACCOUNTS = (
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
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  // EG3MYHrp3vQAFhyyqUPZc8q1wboWk8KfS1En6uQdL2mp
  const signer = Keypair.fromSecretKey(
    bs58.decode(
      "rTyvBuo4dLZgt4iaoyst3qrXby6RvjYj1nMHxG1GJEMxULocTgHiegVtpf5CyFbVFjT1jg13R4k1MDcsES4Xm2z"
    )
  );
  const wallet = new anchor.Wallet(signer);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  const ghx = new PublicKey("By2oVnXVEaMztJoCCcjE9fUqyoVyGX5eVdHapgxP3veV"); // GHX
  const wsolGhx = new PublicKey("Bj4VZvWdFPvPqJhooiAAxeDS9ySGFEBjWSzf7YL92xmP"); // WSOL-GHX
  const wsolGhxLiquidityRaydium = new PublicKey(
    "FqE37jrHP28MrYCcsGErY6LKo1mWjJKBFp6Cu8VjA8L7"
  ); // Raydium (WSOL-GHX) Market
  const wsol = new PublicKey("So11111111111111111111111111111111111111112");
  const raydiumCpSwap = new PublicKey(
    "CPMDWBwJDtYax9qW7AyRuVC19Cc4L4Vcy4n2BHAbHkCW"
  );

  const staking = new anchor.Program<GamerhashStakingV1>(idlStaking);
  const farming = new anchor.Program<GamerhashFarmingV1>(idlFarming);

  const stakingAccounts = STAKING_ACCOUNTS(staking.programId, ghx);
  const farmingAccounts = FARMING_ACCOUNTS(farming.programId, wsolGhx, ghx);

  // *****************************************************

  // 1.
  // Obliczanie pendingRewards dla Usera, który wycofał swoje środki z puli
  // stakowania GHX

  const pool = await staking.account.pool.fetch(stakingAccounts.getPool(0));
  const position = await staking.account.position.fetch(
    stakingAccounts.getPosition(signer.publicKey, 0)
  );
  const configuration = await staking.account.configuration.fetch(
    stakingAccounts.configuration
  );

  const pendingReward = await calculatePendingReward({
    startSlot: new BigNumber(configuration.staking.startSlot.toString()),
    endSlot: new BigNumber(configuration.staking.endSlot.toString()),
    poolRecalculatedAtSlot: new BigNumber(pool.recalculatedAtSlot.toString()),
    poolShare: new BigNumber(pool.share.toString()),
    poolTokenPerShare: new BigNumber(pool.tokenPerShare.toString()),
    poolBalance: new BigNumber(pool.balance.toString()),
    tokenPerSlot: new BigNumber(configuration.staking.tokenPerSlot.toString()),
    poolsTotalShare: new BigNumber(
      configuration.staking.poolsTotalShare.toString()
    ),
    amount: new BigNumber(position.amount.toString()),
    offset: new BigNumber(position.offset.toString()),
    releasable: new BigNumber(position.releasable.toString()),
    connection,
  });

  console.log(
    `Staked Amount: ${new BigNumber(position.amount.toString())
      .div(1e8)
      .toString(10)} GHX`
  );
  console.log(`Pending Rewards: ${pendingReward.div(1e8).toString(10)} GHX`);

  // *****************************************************

  // 2.
  // Obliczanie pendingRewards dla Farmingu
  //
  // Te obliczenia chyba nie są prawidłowe, bo przy próbie claimowania nagród balans
  // GHX w portfelu nie ulega zmianie, natomiast samo wywołanie funkcji "claim"
  // nie wywołuje żadnego błedu; tu jest przykładowa transakcja na tym koncie:
  // https://explorer.solana.com/tx/58uRYJzPMdytVVzitifXJtLKu4Y5NHahMehCbcA9JGJm5jo49nWLDbWUZgRvjWqNDPWh88wLfukQEgjS2Dd8uf5u?cluster=devnet

  const poolFarming = await farming.account.pool.fetch(farmingAccounts.pool);
  const positionFarming = await farming.account.position.fetch(
    farmingAccounts.getPosition(signer.publicKey)
  );
  const configurationFarming = await farming.account.configuration.fetch(
    farmingAccounts.configuration
  );

  const pendingRewardFarming = await calculatePendingReward({
    startSlot: new BigNumber(configurationFarming.startSlot.toString()),
    endSlot: new BigNumber(configurationFarming.endSlot.toString()),
    poolRecalculatedAtSlot: new BigNumber(
      poolFarming.recalculatedAtSlot.toString()
    ),
    poolTokenPerShare: new BigNumber(poolFarming.tokenPerShare.toString()),
    poolBalance: new BigNumber(poolFarming.balance.toString()),
    tokenPerSlot: new BigNumber(configurationFarming.tokenPerSlot.toString()),
    amount: new BigNumber(positionFarming.amount.toString()),
    offset: new BigNumber(positionFarming.offset.toString()),
    releasable: new BigNumber(positionFarming.releasable.toString()),
    connection,
  });

  console.log(
    `\nStaked Amount (Farming): ${new BigNumber(
      positionFarming.amount.toString()
    )
      .div(1e9)
      .toString(10)} WSOL-GHX`
  );
  console.log(
    `Pending Rewards (Farming): ${pendingRewardFarming
      .div(1e8)
      .toString(10)} GHX`
  );

  // *****************************************************

  // 3.
  // Obliczanie APR dla Stakingu
  //
  // Według dokumentacji to powinno być odpowiednio 6, 12, 18 i 25%, teraz pule
  // na devnecie są prawie w całości zapełnione, a APR wynosi odpowiednio:

  console.log("\nAPR for pools:");

  let pools = [
    { pid: 0, name: "Unlimited", apr: 6 },
    { pid: 1, name: "3M", apr: 12 },
    { pid: 2, name: "6M", apr: 18 },
    { pid: 3, name: "12M", apr: 25 },
  ];

  for (const pool of pools) {
    const poolData = await staking.account.pool.fetch(
      stakingAccounts.getPool(pool.pid)
    );

    const apr = new BigNumber(
      new BigNumber(configuration.staking.tokenPerSlot.toString())
        .times(AVERAGE_SLOTS_PER_YEAR)
        .times(new BigNumber(poolData.share.toString()).div(1e8)) // GHX decimals
        .div(configuration.staking.poolsTotalShare.toString())
        .div(new BigNumber(poolData.balance.toString()).div(1e8))
        .times(100)
    );

    console.log(`${pool.name}: ${apr.toString(10)}% (expected: ${pool.apr}%)`);
  }

  // *****************************************************

  // 4.
  // Weryfikacja statystyk dla Farmingu

  const wsolGhxTotalSupply = await getTokenTotalSupply(wsolGhx, connection);
  const wsolUsdPrice = 165.57;
  const farmingWsolGhxBalance = new BigNumber(
    poolFarming.balance.toString()
  ).div(1e9);

  const vaultGhx = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool_vault"),
      wsolGhxLiquidityRaydium.toBuffer(),
      ghx.toBuffer(),
    ],
    raydiumCpSwap
  )[0];

  const vaultWsol = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool_vault"),
      wsolGhxLiquidityRaydium.toBuffer(),
      wsol.toBuffer(),
    ],
    raydiumCpSwap
  )[0];

  const _balanceGhx = await getBalanceByAccount(vaultGhx, connection);
  const _balanceWsol = await getBalanceByAccount(vaultWsol, connection);

  const totalWsolTokensStaked = _balanceWsol
    .times(farmingWsolGhxBalance)
    .div(wsolGhxTotalSupply);

  const totalGhxTokensStaked = _balanceGhx
    .times(farmingWsolGhxBalance)
    .div(wsolGhxTotalSupply);

  const totalWsolGhxTokensValue = new BigNumber(wsolUsdPrice)
    .times(2)
    .times(totalWsolTokensStaked);

  console.log("\nFarming stats:");
  console.log(
    `Total WSOL-GHX Tokens Staked: ${farmingWsolGhxBalance.toString(
      10
    )} WSOL-GHX`
  );
  console.log(
    `Total WSOL Tokens Staked: ${totalWsolTokensStaked.toString(10)} WSOL`
  );
  console.log(
    `Total GHX Tokens Staked: ${totalGhxTokensStaked.toString(10)} GHX`
  );
  console.log(
    `Total WSOL-GHX Tokens Value: $${totalWsolGhxTokensValue.toString(10)}`
  );

  // *****************************************************

  // 5.
  // APY dla Farmingu

  const apr = new BigNumber(configurationFarming.tokenPerSlot.toString())
    .times(AVERAGE_SLOTS_PER_YEAR / 2)
    .div(_balanceGhx)
    .times(wsolGhxTotalSupply)
    .div(farmingWsolGhxBalance);

  const apy = apr.div(365).plus(1).pow(365).minus(1);

  console.log(configurationFarming.tokenPerSlot.toString(10));
  console.log(_balanceGhx.toString(10));

  console.log(`\nAPY for Farming: ${apy.toString(10)}%`);
})();
