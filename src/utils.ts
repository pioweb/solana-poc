import * as anchor from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { BigNumber } from "bignumber.js";
const { BN } = anchor.default;

export const PRECISION = 1e12;
export const AVERAGE_SLOTS_PER_YEAR = 78840000; // 400ms per slot

export const toBN = (value: number | BigInt | bigint) =>
  new BN(value.toString());

export const MAX = {
  NUMBER: {
    U8: 255,
    U16: 65_535,
    U32: 4_294_967_295,
    U64: 18_446_744_073_709_551_615,
    U128: 340_282_366_920_938_463_463_374_607_431_768_211_455,
    I64: 9_223_372_036_854_775_807,
  },
};

export const getBalance = async (
  mint: anchor.web3.PublicKey,
  account: anchor.web3.PublicKey,
  connection: anchor.web3.Connection,
  programId: PublicKey = TOKEN_PROGRAM_ID
) => {
  try {
    const ata = getAssociatedTokenAddressSync(mint, account, false, programId);

    const { value: balance } = await connection.getTokenAccountBalance(ata);

    return new BigNumber(balance.amount);
  } catch (e) {
    //
  }

  return new BN(0);
};

export const getBalanceByAccount = async (
  address: anchor.web3.PublicKey,
  connection: anchor.web3.Connection
) => {
  try {
    const { value: balance } = await connection.getTokenAccountBalance(address);

    return new BigNumber(balance.amount);
  } catch (e) {
    //
  }

  return new BN(0);
};

export const getTokenTotalSupply = async (
  token: anchor.web3.PublicKey,
  connection: anchor.web3.Connection
) => {
  try {
    const { value: supply } = await connection.getTokenSupply(token);

    return new BigNumber(supply.amount);
  } catch (e) {
    return new BigNumber(0);
  }
};

export const getSlot = async (connection: anchor.web3.Connection) => {
  try {
    const slot = await connection.getSlot();
    return new BigNumber(slot);
  } catch (e) {
    return new BigNumber(0);
  }
};

const getLastRewardSlot = (
  startSlot: typeof BN,
  endSlot: typeof BN,
  slot: typeof BN
) => {
  if (startSlot.isZero()) return new BigNumber(0);
  if (endSlot.isZero()) return slot;
  return endSlot.lt(slot) ? endSlot : slot;
};

export const calculatePendingReward = async ({
  startSlot,
  endSlot,
  poolRecalculatedAtSlot,
  poolShare,
  poolTokenPerShare,
  poolBalance,
  tokenPerSlot,
  poolsTotalShare,
  amount,
  offset,
  releasable,
  connection,
}: {
  startSlot: typeof BN;
  endSlot: typeof BN;
  poolRecalculatedAtSlot: typeof BN;
  poolShare?: typeof BN;
  poolTokenPerShare?: typeof BN;
  poolBalance: typeof BN;
  tokenPerSlot: typeof BN;
  poolsTotalShare: typeof BN;
  amount: typeof BN;
  offset: typeof BN;
  releasable: typeof BN;
  connection: anchor.web3.Connection;
}) => {
  try {
    const slot = await getSlot(connection);
    const lastRewardSlot = getLastRewardSlot(startSlot, endSlot, slot);
    const lastMintedSlot = poolRecalculatedAtSlot ?? slot;
    const multiplier = lastRewardSlot.minus(lastMintedSlot);
    const tokenReward = multiplier
      .times(tokenPerSlot)
      .times(poolShare ?? new BigNumber(1))
      .div(poolsTotalShare ?? new BigNumber(1));
    const tokenPerShare = poolTokenPerShare.plus(
      tokenReward.times(PRECISION).div(poolBalance)
    );

    const pendingReward = amount
      .times(tokenPerShare)
      .div(PRECISION)
      .minus(offset)
      .plus(releasable);

    // console.log({
    //   '00startSlot': startSlot.toString(10),
    //   '01endSlot': endSlot.toString(10),
    //   '02poolShare': poolShare?.toString(10),
    //   '03poolRecalculatedAtSlot': poolRecalculatedAtSlot.toString(10),
    //   '04poolTokenPerShare': poolTokenPerShare.toString(10),
    //   '05poolBalance': poolBalance.toString(10),
    //   '06poolsTotalShare': poolsTotalShare?.toString(10),
    //   '07tokenPerSlot': tokenPerSlot.toString(10),
    //   '08releasable': releasable.toString(10),
    //   '09offset': offset.toString(10),
    //   '10amount': amount.toString(10),
    //   '11multiplier': multiplier.toString(10),
    //   '12tokenReward': tokenReward.toString(10),
    //   '13tokenPerShare': tokenPerShare.toString(10),
    //   '15slot': slot.toString(10),
    //   '16lastRewardSlot': lastRewardSlot.toString(10),
    //   '17lastMintedSlot': lastMintedSlot.toString(10),
    //   '18pendingReward': pendingReward.div(1e8).toString(10),
    // })

    return pendingReward;
  } catch (e) {
    return new BigNumber(0);
  }
};
