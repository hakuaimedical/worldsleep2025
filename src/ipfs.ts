// Upload to IPFS/Filecoin via NFT.Storage (no credit card).
import { NFTStorage } from 'nft.storage'

/**
 * Upload an encrypted Blob and return its CID (string).
 */
export async function putEncryptedBlob(token: string, fileBlob: Blob): Promise<string> {
  if (!token) throw new Error("Missing NFT.Storage API token")
  const client = new NFTStorage({ token })
  const cid = await client.storeBlob(fileBlob)
  return cid
}
