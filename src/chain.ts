import { ethers } from "ethers";
import { DataRegistryAbi } from "./abi";
import { CONTRACT_ADDRESS, CHAIN_ID } from "./config";

declare global { interface Window { ethereum?: any } }
let provider: ethers.BrowserProvider | null = null;

export async function connectWallet(): Promise<string> {
  if (!window.ethereum) throw new Error("MetaMask not found");
  provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  return accounts[0];
}

export async function publishCid(cid: string): Promise<string> {
  if (!provider) {
    if (!window.ethereum) throw new Error("Connect wallet first");
    provider = new ethers.BrowserProvider(window.ethereum);
  }
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== CHAIN_ID) {
    await provider.send("wallet_switchEthereumChain", [{ chainId: "0x"+CHAIN_ID.toString(16) }]).catch(()=>{
      throw new Error("Please switch to the target chain in MetaMask");
    });
  }
  const signer = await provider.getSigner();
  const addr = CONTRACT_ADDRESS;
  if (!addr) throw new Error("Contract address not set in src/config.ts");
  const contract = new ethers.Contract(addr, DataRegistryAbi, signer);
  const tx = await contract.publish(cid);
  await tx.wait();
  return tx.hash;
}
