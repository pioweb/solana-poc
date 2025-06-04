import * as anchor from "@coral-xyz/anchor";
const { BN } = anchor.default;
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

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
  programId: PublicKey = TOKEN_PROGRAM_ID,
) => {
  try {
    const ata = getAssociatedTokenAddressSync(mint, account, false, programId);

    const { value: balance } = await connection.getTokenAccountBalance(ata);

    return new BN(balance.amount);
  } catch (e) {
    //
  }

  return new BN(0);
};

export const getBalanceByAccount = async (
  address: anchor.web3.PublicKey,
  connection: anchor.web3.Connection,
) => {
  try {
    const { value: balance } = await connection.getTokenAccountBalance(address);

    return new BN(balance.amount);
  } catch (e) {
    //
  }

  return new BN(0);
};
