# World Sleep 2025 — Web3 Sleep MVP (NFT.Storage)

Features:
- Local analytics dashboard (no backend).
- Client-side AES-GCM encryption of uploaded JSON.
- Encrypted blob upload to **IPFS/Filecoin via NFT.Storage** (free, no credit card) → returns **CID**.
- MetaMask connect + optional on-chain publish of the CID (Polygon Amoy testnet).
- ECDH key wrapping demo (P-256) for selective sharing of the AES key.
- Simple SVG bar chart of nightly durations.

## Run locally
```bash
npm install
npm run dev
# open the printed URL (e.g., http://localhost:5173)
