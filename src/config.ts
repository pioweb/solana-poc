import {
  Raydium,
  TxVersion,
  parseTokenAccountResp,
} from "@raydium-io/raydium-sdk-v2";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Connection, Keypair, clusterApiUrl } from "@solana/web3.js";
import bs58 from "bs58";

export const owner: Keypair = Keypair.fromSecretKey(
  bs58.decode(
    "37EVnoLtzkWKr4FcUFWWyVVSSd1xnc5ucFS3y4H86Dh12xhQoaHpm6ePzsMAxwpay97mWrgfo1hCboUDzHnRfK95"
  )
);
// export const connection = new Connection("<YOUR_RPC_URL>"); //<YOUR_RPC_URL>
export const connection = new Connection(clusterApiUrl("devnet")); //<YOUR_RPC_URL>
export const txVersion = TxVersion.V0; // or TxVersion.LEGACY
const cluster = "devnet"; // 'mainnet' | 'devnet'

let raydium: Raydium | undefined;
export const initSdk = async (params?: { loadToken?: boolean }) => {
  if (raydium) return raydium;
  if (connection.rpcEndpoint === clusterApiUrl("mainnet-beta"))
    console.warn(
      "using free rpc node might cause unexpected error, strongly suggest uses paid rpc node"
    );
  console.log(`connect to rpc ${connection.rpcEndpoint} in ${cluster}`);
  raydium = await Raydium.load({
    owner,
    connection,
    cluster,
    disableFeatureCheck: true,
    disableLoadToken: !params?.loadToken,
    blockhashCommitment: "finalized",
    // urlConfigs: {
    //   BASE_HOST: '<API_HOST>', // api url configs, currently api doesn't support devnet
    // },
  });

  /**
   * By default: sdk will automatically fetch token account data when need it or any sol balace changed.
   * if you want to handle token account by yourself, set token account data after init sdk
   * code below shows how to do it.
   * note: after call raydium.account.updateTokenAccount, raydium will not automatically fetch token account
   */

  /*  
  raydium.account.updateTokenAccount(await fetchTokenAccountData())
  connection.onAccountChange(owner.publicKey, async () => {
    raydium!.account.updateTokenAccount(await fetchTokenAccountData())
  })
  */

  return raydium;
};

export const fetchTokenAccountData = async () => {
  const solAccountResp = await connection.getAccountInfo(owner.publicKey);
  const tokenAccountResp = await connection.getTokenAccountsByOwner(
    owner.publicKey,
    { programId: TOKEN_PROGRAM_ID }
  );
  const token2022Req = await connection.getTokenAccountsByOwner(
    owner.publicKey,
    { programId: TOKEN_2022_PROGRAM_ID }
  );
  const tokenAccountData = parseTokenAccountResp({
    owner: owner.publicKey,
    solAccountResp,
    tokenAccountResp: {
      context: tokenAccountResp.context,
      value: [...tokenAccountResp.value, ...token2022Req.value],
    },
  });
  return tokenAccountData;
};

export const grpcUrl = "<YOUR_GRPC_URL>";
export const grpcToken = "<YOUR_GRPC_TOKEN>";
