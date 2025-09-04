import { useEffect, useMemo, useState } from "react";
import BarChart from "./BarChart";
import { basicSleepStats, Night } from "./metrics";
import { summarize } from "./nl-summary";
import {
  encryptJson, decryptFromBytes,
  genECDHKeyPair, exportPubKeySpkiB64, wrapAesKeyForRecipient, unwrapAesKeyFromSender
} from "./crypto";
import { putEncryptedBlob } from "./ipfs";
import { connectWallet, publishCid } from "./chain";
import { CONTRACT_ADDRESS, CHAIN_NAME } from "./config";

type Stats = { avgHours:number; lateBedPct:number };

export default function App() {
  const [nights, setNights] = useState<Night[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [cid, setCid] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [addr, setAddr] = useState<string | null>(null);
  const [apiToken, setApiToken] = useState<string>("");

  const [ivB64, setIvB64] = useState<string>("");
  const [keyB64, setKeyB64] = useState<string>("");

  const [myPriv, setMyPriv] = useState<CryptoKey | null>(null);
  const [myPubB64, setMyPubB64] = useState<string>("");
  const [recipientPubB64, setRecipientPubB64] = useState<string>("");
  const [wrappedKeyB64, setWrappedKeyB64] = useState<string>("");
  const [wrapIvB64, setWrapIvB64] = useState<string>("");
  const [wrapMsg, setWrapMsg] = useState<string>("");

  const hasContract = useMemo(()=> !!CONTRACT_ADDRESS, []);

  useEffect(()=>{
    const saved = localStorage.getItem("nft_storage_token");
    if (saved) setApiToken(saved);
  }, []);

  function computeDurationsHours(ns: Night[]) {
    return ns.map(n => (n.wakeOn - n.sleepOn)/3600000);
  }

  async function onUploadJson(file: File) {
    const text = await file.text();
    const arr = JSON.parse(text) as Night[];
    setNights(arr);
    setStats(basicSleepStats(arr));
  }

  async function onEncryptAndStore() {
    if (!nights.length) { setStatus("Please upload a JSON file first."); return; }
    if (!apiToken) { setStatus("Enter an NFT.Storage API token."); return; }
    try {
      setStatus("Encrypting...");
      const { blob, iv_b64, key_b64 } = await encryptJson(nights);
      setIvB64(iv_b64);
      setKeyB64(key_b64);
      setStatus("Uploading encrypted blob to IPFS/Filecoin via NFT.Storage...");
      const theCid = await putEncryptedBlob(apiToken, blob);
      setCid(theCid);
      setStatus(`Uploaded. CID: ${theCid}`);
    } catch (e:any) {
      console.error(e);
      setStatus("Error: " + e.message);
    }
  }

  async function onConnect() {
    try {
      const a = await connectWallet();
      setAddr(a);
    } catch (e:any) {
      setStatus("Wallet error: " + e.message);
    }
  }

  async function onPublish() {
    if (!cid) { setStatus("No CID yet. Encrypt & upload first."); return; }
    try {
      setStatus(`Sending tx to ${CHAIN_NAME}...`);
      const txHash = await publishCid(cid);
      setStatus("Tx sent: " + txHash);
    } catch (e:any) {
      setStatus("On-chain error: " + e.message);
    }
  }

  async function onGenMyECDH() {
    const kp = await genECDHKeyPair();
    setMyPriv(kp.privateKey);
    setMyPubB64(await exportPubKeySpkiB64(kp.publicKey));
    setWrapMsg("Generated my ECDH keypair.");
  }

  async function onWrapForRecipient() {
    if (!keyB64) { setWrapMsg("Encrypt & upload first to get the AES key."); return; }
    if (!myPriv) { setWrapMsg("Generate your ECDH keypair first."); return; }
    if (!recipientPubB64) { setWrapMsg("Paste a recipient public key (SPKI base64)."); return; }
    try {
      const { wrapped_b64, iv_b64 } = await wrapAesKeyForRecipient(keyB64, myPriv, recipientPubB64);
      setWrappedKeyB64(wrapped_b64);
      setWrapIvB64(iv_b64);
      setWrapMsg("Wrapped AES key for recipient.");
    } catch (e:any) {
      setWrapMsg("Wrap error: " + e.message);
    }
  }

  async function onDemoUnwrapAsRecipient() {
    if (!myPriv || !myPubB64) { setWrapMsg("Generate your ECDH first."); return; }
    if (!wrappedKeyB64 || !wrapIvB64) { setWrapMsg("No wrapped key yet."); return; }
    try {
      const { rawKey_b64 } = await unwrapAesKeyFromSender(wrappedKeyB64, wrapIvB64, myPriv, myPubB64);
      const same = rawKey_b64 === keyB64;
      setWrapMsg(same ? "Unwrap verified (raw AES key matches)." : "Unwrap produced a different key.");
    } catch (e:any) {
      setWrapMsg("Unwrap error: " + e.message);
    }
  }

  return (
    <div className="card">
      <h1>Decentralized Sleep Prototype <span className="pill">Web3 MVP</span></h1>
      <p className="muted">Local analytics → Encrypt-before-store → IPFS/Filecoin (NFT.Storage) → (optional) on-chain CID publish → (demo) ECDH key wrapping.</p>

      <div className="section">
        <label>1) Upload sleep JSON</label>
        <input type="file" accept=".json" onChange={e=>{
          const f = e.target.files?.[0];
          if (f) onUploadJson(f);
        }} />
      </div>

      {stats && (
        <div className="section">
          <h3>Summary</h3>
          <p>{summarize(stats)}</p>
          <ul>
            <li>Average sleep: {stats.avgHours} h</li>
            <li>Late bedtime nights: {stats.lateBedPct}%</li>
          </ul>
          <BarChart values={computeDurationsHours(nights)} />
        </div>
      )}

      <div className="section">
        <label>2) NFT.Storage API token</label>
        <input
          type="password"
          placeholder="Paste token..."
          value={apiToken}
          onChange={e=>setApiToken(e.target.value)}
        />
        <button onClick={()=> localStorage.setItem("nft_storage_token", apiToken)}>Remember token</button>
        <div className="muted">Create a free token at <a href="https://nft.storage" target="_blank">nft.storage</a>. Stored only in your browser.</div>
      </div>

      <div className="section">
        <button className="primary" onClick={onEncryptAndStore}>Encrypt & Upload</button>
        {cid && (
          <div style={{marginTop:8}}>
            <div>CID: <span className="mono">{cid}</span></div>
            <div>Gateway: <a href={"https://ipfs.io/ipfs/"+cid} target="_blank" rel="noreferrer">https://ipfs.io/ipfs/{cid}</a></div>
            <div>IV (base64): <span className="mono">{ivB64}</span></div>
            <div>Key (base64): <span className="mono">{keyB64}</span></div>
          </div>
        )}
      </div>

      <div className="section">
        <label>3) (Optional) Connect wallet</label>
        <div className="row">
          <button onClick={onConnect}>Connect MetaMask</button>
          <div>{addr ? <span className="success">Connected: {addr}</span> : <span className="muted">Not connected</span>}</div>
        </div>
        <div className="muted">You can publish your CID to a simple registry contract as a proof-of-existence.</div>
      </div>

      <div className="section">
        <label>4) (Optional) Publish CID on-chain</label>
        <button disabled={!hasContract} onClick={onPublish} className="primary">Publish to contract</button>
        {!hasContract && <div className="muted">Set CONTRACT_ADDRESS in <code>src/config.ts</code> after deploying the contract.</div>}
      </div>

      <div className="section">
        <h3>5) ECDH key sharing (demo)</h3>
        <div className="row" style={{alignItems:"center"}}>
          <button onClick={onGenMyECDH}>Generate my ECDH keypair</button>
          {myPubB64 && <span className="pill">My public key ready</span>}
        </div>
        {myPubB64 && (
          <>
            <label>My public key (SPKI, base64) — share with others</label>
            <textarea readOnly style={{width:"100%",height:100}} value={myPubB64} />
          </>
        )}

        <label>Recipient public key (SPKI, base64)</label>
        <textarea placeholder="Paste recipient SPKI (base64) here" style={{width:"100%",height:100}} value={recipientPubB64} onChange={e=>setRecipientPubB64(e.target.value)} />

        <div className="row" style={{marginTop:8, alignItems:"center"}}>
          <button onClick={onWrapForRecipient} className="primary">Wrap AES key for recipient</button>
          {wrappedKeyB64 && <span className="pill">Wrapped key ready</span>}
        </div>

        {wrappedKeyB64 && (
          <>
            <label>Wrapped AES key (base64)</label>
            <textarea readOnly style={{width:"100%",height:80}} value={wrappedKeyB64} />
            <label>Wrap IV (base64)</label>
            <textarea readOnly style={{width:"100%",height:40}} value={wrapIvB64} />
            <div className="muted">Send these to the recipient (secure channel). They’ll unwrap using their private key and your public key.</div>
          </>
        )}

        <div className="row" style={{marginTop:8}}>
          <button onClick={onDemoUnwrapAsRecipient}>Demo unwrap (self-check)</button>
        </div>
        <div className="muted">{wrapMsg}</div>
      </div>

      <div className="section">
        <h3>Decrypt helper</h3>
        <div className="row">
          <div>
            <label>CID</label>
            <input type="text" value={cid ?? ""} readOnly />
          </div>
        </div>
      </div>

      <div className="section">
        <div className="muted">{status}</div>
      </div>
    </div>
  );
}
