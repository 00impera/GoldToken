import { useState, useEffect } from "react";
import {
  ConnectButton,
  useActiveAccount,
  useReadContract,
  useSendTransaction,
  ThirdwebProvider,
  BuyWidget,
} from "thirdweb/react";
import {
  createThirdwebClient,
  defineChain,
  getContract,
  prepareContractCall,
  toWei,
} from "thirdweb";

const CLIENT_ID     = "821819db832d1a313ae3b1a62fbeafb7";
const NEAR_JWT      = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjIwMjUtMDEtMTItdjEifQ.eyJ2IjoxLCJrZXlfdHlwZSI6ImRpc3RyaWJ1dGlvbl9jaGFubmVsIiwicGFydG5lcl9pZCI6ImNyeXB0b2Nhc2gtbmZ0IiwiaWF0IjoxNzczMDc3MzExLCJleHAiOjE4MDQ2MTMzMTF9.Wi55S8cwVmAXPtOG0ymr7ldX-5CXVygzuanbjAAJHP-Am14_52C6i4cQG5FvjcAorw0KD8k8JD_YX5AM4QKhNqYtU5gsI4-KKe0KavO5_69NowzUKc_ubtjYn85eFjWskzZQvICMqSZkdGOSnMT_hNEePA8qYi_wSov4a4bQh4zIfNA0znEdDIV3rGI_bDM9dgOk0PnJRIpwi_aXOQ8Q4e50IO2UMrZEDtBVmUhK5-Mno3S_iS7tZl4QSui_4_bNCapQolFwUPB9Zqyxay_6rPVEr7j-8Ez5-htwkR5ZYvTb1mJaj3DVPpWPL9QTxhjvhbJ7nKrWpibcWX3AVoXZ6g";
const PROXY_ADDRESS = "0x3E459BeA2A3Efab22Ce12358E672dD31A9594D34";
const TREASURY      = "0x592B35c8917eD36c39Ef73D0F5e92B0173560b2e";

const COIN_GIF = "https://raw.githubusercontent.com/00impera/GoldToken/98d4dbeb021f0f0cb0e2e078001411bc2e3aebeb/8b4e848e28648728e90708f39a1db70c.gif";

const MONAD_MAINNET = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpc: "https://rpc.monad.xyz",
  blockExplorers: [{ name: "Monadscan", url: "https://monadscan.com" }],
});

const client = createThirdwebClient({ clientId: CLIENT_ID });

const ERC20_ABI = [
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf",   outputs: [{ name: "", type: "uint256" }], stateMutability: "view",     type: "function" },
  { inputs: [],                                      name: "name",        outputs: [{ name: "", type: "string"  }], stateMutability: "view",     type: "function" },
  { inputs: [],                                      name: "symbol",      outputs: [{ name: "", type: "string"  }], stateMutability: "view",     type: "function" },
  { inputs: [],                                      name: "totalSupply", outputs: [{ name: "", type: "uint256" }], stateMutability: "view",     type: "function" },
  { inputs: [],                                      name: "decimals",    outputs: [{ name: "", type: "uint8"   }], stateMutability: "view",     type: "function" },
  {
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];

/* ─── API HELPERS ─────────────────────────────────────────────── */
async function getNearIntentsTokens() {
  const res = await fetch("https://1click.chaindefuser.com/v0/tokens", {
    headers: { Authorization: "Bearer " + NEAR_JWT },
  });
  return res.json();
}

async function getNearIntentsQuote({ originAsset, destinationAsset, amount, recipient }) {
  const deadline = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const res = await fetch("https://1click.chaindefuser.com/v0/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + NEAR_JWT },
    body: JSON.stringify({
      dry: false, swapType: "EXACT_INPUT", slippageTolerance: 100,
      originAsset, depositType: "ORIGIN_CHAIN", destinationAsset, amount,
      recipient, recipientType: "DESTINATION_CHAIN",
      refundTo: recipient, refundType: "ORIGIN_CHAIN", deadline,
    }),
  });
  return res.json();
}

/* ─── UTILS ───────────────────────────────────────────────────── */
function fmt(val, dec, digits) {
  var d  = dec    === undefined ? 18 : dec;
  var dg = digits === undefined ? 4  : digits;
  if (!val) return "0";
  try {
    var n = Number(BigInt(val.toString()) * 10000n / BigInt(Math.pow(10, d))) / 10000;
    return n.toLocaleString(undefined, { maximumFractionDigits: dg });
  } catch (e) { return "0"; }
}

function shortAddr(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "\u2026" + addr.slice(-4);
}

function vibrate() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([40, 15, 40, 15, 20]);
  }
}

/* ─── COIN LOGO (GIF) ─────────────────────────────────────────── */
function GoldCoinLogo({ size }) {
  var s = size || 48;
  return (
    <img
      src={COIN_GIF}
      width={s}
      height={s}
      alt="Gold Token"
      style={{
        borderRadius: "50%",
        objectFit: "cover",
        display: "block",
      }}
    />
  );
}

/* ─── MATRIX PARTICLES ────────────────────────────────────────── */
function MatrixParticles() {
  var items = [];
  for (var i = 0; i < 26; i++) {
    items.push(
      <div key={i} className={"mp mp" + (i % 5)} style={{
        left: ((i * 41 + 7) % 100) + "%",
        animationDelay:    ((i * 0.6) % 7) + "s",
        animationDuration: (5 + (i * 0.4) % 7) + "s",
      }} />
    );
  }
  return <div className="matrix-bg">{items}</div>;
}

/* ─── BUY GOLD WITH CARD ──────────────────────────────────────── */
function BuyGoldWithCard({ account, sym }) {
  const [showWidget, setShowWidget] = useState(false);
  if (!account) return null;

  return (
    <div style={{ marginTop: 12, marginBottom: 4 }}>
      {!showWidget ? (
        <button className="btn-orb" onClick={() => { vibrate(); setShowWidget(true); }}>
          💳 BUY {sym || "GOLD"} WITH CARD
        </button>
      ) : (
        <>
          <button className="btn-outline" style={{ marginTop: 0, marginBottom: 12, fontSize: 10 }} onClick={() => setShowWidget(false)}>
            ✕ CLOSE
          </button>
          <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(162,89,255,0.4)", background: "rgba(5,10,14,0.95)" }}>
            <BuyWidget client={client} chain={MONAD_MAINNET} tokenAddress={PROXY_ADDRESS} theme="dark" />
          </div>
        </>
      )}
    </div>
  );
}

/* ─── FOOTER BANNER ───────────────────────────────────────────── */
function FooterBanner() {
  return (
    <div className="footer-banner">
      <div className="footer-banner-inner">
        {/* MonadVision */}
        <a href={"https://monadvision.com/token/" + PROXY_ADDRESS} target="_blank" rel="noopener noreferrer" className="banner-link banner-mv">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M2 12C2 12 6 5 12 5s10 7 10 7-4 7-10 7S2 12 2 12z" stroke="#00eaff" strokeWidth="1.8"/>
            <circle cx="12" cy="12" r="3" fill="#00eaff" opacity="0.5"/>
          </svg>
          <span>MONADVISION</span>
          <span className="banner-sub">Token Analytics</span>
        </a>

        <div className="banner-divider" />

        {/* Twitter / X */}
        <a href="https://x.com/bnbgold277983" target="_blank" rel="noopener noreferrer" className="banner-link banner-tw">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#a259ff">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <span>@bnbgold277983</span>
          <span className="banner-sub">Follow on X</span>
        </a>

        <div className="banner-divider" />

        {/* Discord */}
        <a href="https://discord.com/channels/1316093079090106472" target="_blank" rel="noopener noreferrer" className="banner-link banner-dc">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff6ec7">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.036.055a19.99 19.99 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.201 13.201 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          <span>JOIN DISCORD</span>
          <span className="banner-sub">Community</span>
        </a>

        <div className="banner-divider" />

        {/* Contract address */}
        <div className="banner-link banner-contract" style={{ cursor: "default" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="#ffe066" strokeWidth="1.8"/>
            <path d="M7 8h10M7 12h6M7 16h8" stroke="#ffe066" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 9, letterSpacing: 1 }}>{PROXY_ADDRESS.slice(0, 10)}…{PROXY_ADDRESS.slice(-6)}</span>
          <span className="banner-sub">ERC-20 · Monad 143</span>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN APP ────────────────────────────────────────────────── */
function GoldApp() {
  const account = useActiveAccount();
  const [tab,         setTab        ] = useState("wallet");
  const [transferTo,  setTransferTo ] = useState("");
  const [transferAmt, setTransferAmt] = useState("");
  const [txStatus,    setTxStatus   ] = useState(null);
  const [swapTokens,  setSwapTokens ] = useState([]);
  const [swapOrigin,  setSwapOrigin ] = useState("");
  const [swapAmount,  setSwapAmount ] = useState("");
  const [swapQuote,   setSwapQuote  ] = useState(null);
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapError,   setSwapError  ] = useState(null);

  const contract = getContract({ client, chain: MONAD_MAINNET, address: PROXY_ADDRESS, abi: ERC20_ABI });

  const { data: balance     } = useReadContract({ contract, method: "balanceOf",   params: [account ? account.address : "0x0000000000000000000000000000000000000000"] });
  const { data: totalSupply } = useReadContract({ contract, method: "totalSupply", params: [] });
  const { data: tokenName   } = useReadContract({ contract, method: "name",        params: [] });
  const { data: tokenSymbol } = useReadContract({ contract, method: "symbol",      params: [] });
  const { mutate: sendTx    } = useSendTransaction();

  useEffect(function () {
    getNearIntentsTokens()
      .then(function (tokens) {
        setSwapTokens(tokens.filter(function (t) {
          return ["eth", "btc", "sol", "usdc", "usdt", "near"].some(function (s) {
            return t.symbol && t.symbol.toLowerCase().includes(s);
          });
        }));
      })
      .catch(function () {});
  }, []);

  function handleTransfer() {
    if (!transferTo || !transferAmt) return;
    vibrate();
    setTxStatus("pending");
    var tx = prepareContractCall({ contract, method: "transfer", params: [transferTo, toWei(transferAmt)] });
    sendTx(tx, {
      onSuccess: function () { setTxStatus("success"); },
      onError:   function () { setTxStatus("error");   },
    });
  }

  async function handleGetQuote() {
    if (!swapOrigin || !swapAmount || !account) return;
    vibrate();
    setSwapLoading(true);
    setSwapError(null);
    setSwapQuote(null);
    try {
      var destAsset   = "nep141:monad-" + PROXY_ADDRESS.toLowerCase() + ".omft.near";
      var originToken = swapTokens.find(function (t) { return t.assetId === swapOrigin; });
      var decimals    = originToken && originToken.decimals ? originToken.decimals : 18;
      var amountRaw   = (BigInt(Math.round(parseFloat(swapAmount) * Math.pow(10, decimals)))).toString();
      var quote       = await getNearIntentsQuote({ originAsset: swapOrigin, destinationAsset: destAsset, amount: amountRaw, recipient: account.address });
      setSwapQuote(quote);
    } catch (e) {
      setSwapError("Could not fetch quote. Try a different token or amount.");
    }
    setSwapLoading(false);
  }

  var sym = tokenSymbol || "GOLD";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Rajdhani:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --orb-blue:     #00eaff;
          --orb-purple:   #a259ff;
          --orb-pink:     #ff6ec7;
          --orb-green:    #39ff14;
          --orb-yellow:   #ffe066;
          --orb-orange:   #ffb347;
          --orb-gradient: linear-gradient(135deg, #00eaff 0%, #a259ff 40%, #ff6ec7 70%, #ffe066 100%);
          --orb-glow:     0 0 24px #00eaff, 0 0 48px #a259ff, 0 0 80px #ff6ec7;

          --neon:         var(--orb-blue);
          --neon-bright:  #6FFF45;
          --neon-dim:     rgba(0,234,255,0.55);
          --neon-faint:   rgba(0,234,255,0.10);
          --neon-glow:    rgba(162,89,255,0.20);
          --black:        #050A0E;
          --navy:         #08091a;
          --navy-mid:     #0d0d22;
          --navy-card:    #0a0a1e;
          --navy-border:  rgba(162,89,255,0.35);
          --gold:         #C8960C;
          --gold-light:   #FFD700;
          --gold-pale:    #FFE066;
          --white:        #f0eeff;
          --white-dim:    rgba(240,238,255,0.55);
          --white-faint:  rgba(240,238,255,0.22);
        }

        body { background: var(--black); color: var(--white); font-family: 'Rajdhani', sans-serif; }

        .app {
          min-height: 100vh;
          background:
            radial-gradient(ellipse 70% 55% at 10% 0%,   rgba(0,20,50,0.85)   0%, transparent 60%),
            radial-gradient(ellipse 55% 50% at 90% 100%,  rgba(40,0,60,0.75)   0%, transparent 55%),
            radial-gradient(ellipse 60% 40% at 50% 50%,   rgba(162,89,255,0.07) 0%, transparent 70%),
            var(--black);
          position: relative; overflow: hidden;
        }

        .app::before {
          content: ''; position: fixed; inset: 0; z-index: 1; pointer-events: none;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(162,89,255,0.025) 2px, rgba(162,89,255,0.025) 4px);
        }

        .matrix-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
        .mp { position: absolute; bottom: -10px; border-radius: 2px; animation: mrise linear infinite; }
        .mp0 { width: 2px; background: var(--orb-blue);   height: 16px; opacity: 0.6; }
        .mp1 { width: 1px; background: var(--orb-purple); height: 9px;  opacity: 0.4; }
        .mp2 { width: 2px; background: var(--orb-pink);   height: 14px; opacity: 0.3; }
        .mp3 { width: 1px; background: var(--orb-yellow); height: 6px;  opacity: 0.2; }
        .mp4 { width: 2px; background: var(--orb-green);  height: 20px; opacity: 0.15; }
        @keyframes mrise {
          0%   { transform: translateY(0);      opacity: 0; }
          8%   { opacity: 1; }
          88%  { opacity: 0.25; }
          100% { transform: translateY(-100vh); opacity: 0; }
        }

        .header {
          position: relative; z-index: 10;
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 40px;
          border-bottom: 1px solid rgba(162,89,255,0.3);
          background: rgba(5,5,18,0.93);
          backdrop-filter: blur(20px);
          box-shadow: 0 1px 0 rgba(0,234,255,0.1), 0 4px 30px rgba(162,89,255,0.12);
        }
        .logo { display: flex; align-items: center; gap: 14px; }
        .logo-img {
          border-radius: 50%;
          box-shadow: 0 0 18px rgba(0,234,255,0.5), 0 0 36px rgba(162,89,255,0.3);
          display: block;
        }
        .logo-text {
          font-family: 'Orbitron', monospace; font-size: 20px; font-weight: 700;
          background: var(--orb-gradient); -webkit-background-clip: text;
          -webkit-text-fill-color: transparent; background-clip: text;
          letter-spacing: 3px;
          filter: drop-shadow(0 0 12px rgba(0,234,255,0.5));
        }
        .logo-sub {
          font-size: 9px; color: var(--white-faint); letter-spacing: 4px;
          text-transform: uppercase; margin-top: 3px; font-family: 'Orbitron', monospace;
        }
        .chain-badge {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 5px 16px; border-radius: 20px;
          background: rgba(162,89,255,0.1); border: 1px solid rgba(162,89,255,0.35);
          font-size: 10px; color: var(--orb-purple); letter-spacing: 2px;
          font-family: 'Orbitron', monospace;
          box-shadow: 0 0 12px rgba(162,89,255,0.15);
        }
        .chain-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--orb-blue); box-shadow: 0 0 8px var(--orb-blue);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%,100% { opacity: 1;    box-shadow: 0 0 8px var(--orb-blue); }
          50%      { opacity: 0.35; box-shadow: none; }
        }

        .hero { position: relative; z-index: 5; text-align: center; padding: 52px 20px 30px; }
        .hero-coin {
          display: flex; justify-content: center; margin-bottom: 22px;
        }
        .hero-coin img {
          border-radius: 50%;
          box-shadow: 0 0 40px rgba(0,234,255,0.55), 0 0 80px rgba(162,89,255,0.4), 0 0 120px rgba(255,110,199,0.2);
          animation: coinFloat 4.5s ease-in-out infinite;
        }
        @keyframes coinFloat {
          0%,100% { transform: translateY(0)    rotate(-1deg); }
          50%      { transform: translateY(-14px) rotate(1deg);  }
        }
        .hero-title {
          font-family: 'Orbitron', monospace;
          font-size: clamp(38px, 8vw, 76px); font-weight: 900; letter-spacing: 8px;
          background: var(--orb-gradient); -webkit-background-clip: text;
          -webkit-text-fill-color: transparent; background-clip: text;
          filter: drop-shadow(0 0 20px rgba(0,234,255,0.4));
        }
        .hero-sub {
          margin-top: 10px; font-size: 12px; letter-spacing: 6px;
          text-transform: uppercase; color: var(--white-dim); font-family: 'Orbitron', monospace;
        }
        .hero-divider {
          margin: 26px auto; width: 140px; height: 1px;
          background: var(--orb-gradient);
          box-shadow: var(--orb-glow);
        }

        .stats {
          position: relative; z-index: 5;
          display: flex; justify-content: center; flex-wrap: wrap;
          gap: 12px; padding: 0 40px 36px;
        }
        .stat-card {
          background: linear-gradient(135deg, rgba(162,89,255,0.08) 0%, rgba(0,234,255,0.04) 100%);
          border: 1px solid rgba(162,89,255,0.3);
          border-radius: 12px; padding: 16px 28px; min-width: 160px; text-align: center;
          transition: border-color .25s, box-shadow .25s, transform .25s;
          position: relative; overflow: hidden;
        }
        .stat-card::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(0,234,255,0.06) 0%, rgba(255,110,199,0.04) 100%);
          pointer-events: none;
        }
        .stat-card:hover {
          border-color: rgba(0,234,255,0.6);
          box-shadow: 0 0 24px rgba(162,89,255,0.2), 0 0 48px rgba(0,234,255,0.08);
          transform: translateY(-3px);
        }
        .stat-label { font-size: 9px; letter-spacing: 3px; text-transform: uppercase; color: var(--white-faint); font-family: 'Orbitron', monospace; }
        .stat-value {
          font-family: 'Orbitron', monospace; font-size: 18px; font-weight: 700;
          background: var(--orb-gradient); -webkit-background-clip: text;
          -webkit-text-fill-color: transparent; background-clip: text;
          margin-top: 6px;
        }

        .tabs { position: relative; z-index: 5; display: flex; justify-content: center; gap: 4px; padding: 0 20px 22px; flex-wrap: wrap; }
        .tab-btn {
          padding: 9px 28px; border-radius: 6px;
          border: 1px solid rgba(162,89,255,0.3);
          background: transparent; color: var(--white-dim);
          font-family: 'Orbitron', monospace; font-size: 10px;
          letter-spacing: 2px; text-transform: uppercase; cursor: pointer; transition: all .2s;
        }
        .tab-btn.active {
          background: rgba(162,89,255,0.12); color: var(--orb-blue);
          border-color: rgba(0,234,255,0.5);
          box-shadow: 0 0 16px rgba(162,89,255,0.25), inset 0 0 12px rgba(0,234,255,0.06);
        }
        .tab-btn:not(.active):hover { border-color: rgba(162,89,255,0.5); color: var(--white); background: rgba(162,89,255,0.06); }

        .panel { position: relative; z-index: 5; max-width: 540px; margin: 0 auto; padding: 0 20px 40px; }
        .card {
          background: linear-gradient(135deg, rgba(10,8,30,0.95) 0%, rgba(5,5,18,0.98) 100%);
          border: 1px solid rgba(162,89,255,0.3);
          border-radius: 16px; padding: 28px;
          box-shadow: 0 4px 40px rgba(0,0,0,0.6), 0 0 60px rgba(162,89,255,0.06), inset 0 1px 0 rgba(0,234,255,0.08);
          animation: fadeUp .35s ease;
          position: relative; overflow: hidden;
        }
        .card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: var(--orb-gradient);
        }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

        .card-title {
          font-family: 'Orbitron', monospace; font-size: 12px; font-weight: 700;
          color: var(--orb-blue); margin-bottom: 22px;
          display: flex; align-items: center; gap: 10px; letter-spacing: 2px;
          text-shadow: 0 0 10px rgba(0,234,255,0.5);
        }
        .card-title::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, rgba(162,89,255,0.5), transparent); }

        .balance-display {
          text-align: center; padding: 30px 20px;
          background: rgba(162,89,255,0.06);
          border-radius: 12px; border: 1px solid rgba(162,89,255,0.2);
          margin-bottom: 22px;
          box-shadow: inset 0 0 40px rgba(0,234,255,0.04);
        }
        .balance-amount {
          font-family: 'Orbitron', monospace; font-size: 44px; font-weight: 900;
          background: var(--orb-gradient); -webkit-background-clip: text;
          -webkit-text-fill-color: transparent; background-clip: text;
          filter: drop-shadow(0 0 20px rgba(0,234,255,0.4));
        }
        .balance-symbol { font-size: 18px; color: var(--orb-purple); margin-left: 8px; font-family: 'Orbitron', monospace; }
        .balance-addr   { font-size: 11px; color: var(--white-faint); margin-top: 8px; letter-spacing: 1px; font-family: monospace; }

        .field { margin-bottom: 14px; }
        .field label {
          display: block; font-size: 9px; letter-spacing: 3px; text-transform: uppercase;
          color: var(--white-faint); margin-bottom: 6px; font-family: 'Orbitron', monospace;
        }
        .field input, .field select {
          width: 100%; padding: 11px 14px; border-radius: 8px;
          background: rgba(5,5,18,0.9); border: 1px solid rgba(162,89,255,0.3);
          color: var(--white); font-family: 'Rajdhani', sans-serif; font-size: 15px;
          outline: none; transition: border-color .2s, box-shadow .2s;
        }
        .field input:focus, .field select:focus {
          border-color: var(--orb-blue);
          box-shadow: 0 0 0 2px rgba(0,234,255,0.12);
        }
        .field select option { background: #0a0a1e; color: var(--white); }

        @keyframes vibrate {
          0%,100% { transform: translateX(0)      rotate(0deg);    }
          15%      { transform: translateX(-4px)   rotate(-1.2deg); }
          30%      { transform: translateX(4px)    rotate(1.2deg);  }
          45%      { transform: translateX(-3px)   rotate(-0.8deg); }
          60%      { transform: translateX(3px)    rotate(0.8deg);  }
          75%      { transform: translateX(-1.5px) rotate(-0.3deg); }
          90%      { transform: translateX(1.5px)  rotate(0.3deg);  }
        }

        .btn-neon {
          width: 100%; padding: 13px; border-radius: 8px;
          border: 1px solid rgba(0,234,255,0.4); cursor: pointer;
          background: linear-gradient(90deg, rgba(0,234,255,0.15) 0%, rgba(162,89,255,0.15) 100%);
          color: var(--orb-blue);
          font-family: 'Orbitron', monospace; font-size: 11px; font-weight: 700;
          letter-spacing: 3px; text-transform: uppercase;
          transition: all .2s;
          box-shadow: 0 0 16px rgba(0,234,255,0.2);
          -webkit-tap-highlight-color: transparent;
        }
        .btn-neon:hover:not(:disabled) {
          background: linear-gradient(90deg, rgba(0,234,255,0.25) 0%, rgba(162,89,255,0.25) 100%);
          box-shadow: 0 0 28px rgba(0,234,255,0.4), 0 0 50px rgba(162,89,255,0.2);
          transform: scale(1.02); color: #fff;
        }
        .btn-neon:active:not(:disabled) { transform: scale(0.97); animation: vibrate 0.32s ease; }
        .btn-neon:disabled { opacity: 0.3; cursor: not-allowed; }

        .btn-orb {
          width: 100%; padding: 13px; border-radius: 50px;
          border: none; cursor: pointer;
          background: var(--orb-gradient);
          color: #fff;
          font-family: 'Orbitron', monospace; font-size: 11px; font-weight: 700;
          letter-spacing: 3px; text-transform: uppercase;
          transition: all .2s;
          box-shadow: var(--orb-glow);
          -webkit-tap-highlight-color: transparent;
        }
        .btn-orb:hover:not(:disabled) {
          box-shadow: 0 0 40px #a259ff, 0 0 80px #ff6ec7, 0 0 120px #00eaff;
          transform: scale(1.03);
        }
        .btn-orb:active:not(:disabled) { transform: scale(0.97); animation: vibrate 0.32s ease; }
        .btn-orb:disabled { opacity: 0.3; cursor: not-allowed; }

        .btn-outline {
          width: 100%; padding: 11px; border-radius: 8px; margin-top: 10px;
          border: 1px solid rgba(162,89,255,0.4); background: transparent;
          color: var(--white-dim); font-family: 'Orbitron', monospace;
          font-size: 10px; font-weight: 600; cursor: pointer;
          transition: all .2s; letter-spacing: 2px;
          -webkit-tap-highlight-color: transparent;
        }
        .btn-outline:hover { border-color: var(--orb-purple); color: var(--orb-purple); background: rgba(162,89,255,0.08); }
        .btn-outline:active { animation: vibrate 0.32s ease; transform: scale(0.97); }

        .status {
          margin-top: 12px; padding: 11px 14px; border-radius: 8px;
          font-size: 11px; font-weight: 700; text-align: center;
          font-family: 'Orbitron', monospace; letter-spacing: 2px;
        }
        .status.pending { background: rgba(255,179,71,.08);  color: var(--orb-orange); border: 1px solid rgba(255,179,71,.3); }
        .status.success { background: rgba(0,234,255,.08);   color: var(--orb-blue);   border: 1px solid rgba(0,234,255,.3); }
        .status.error   { background: rgba(255,50,50,.08);   color: #FF5050;            border: 1px solid rgba(255,50,50,.3); }

        .quote-box {
          margin-top: 14px; padding: 14px; border-radius: 10px;
          background: rgba(162,89,255,0.05); border: 1px solid rgba(162,89,255,0.2);
        }
        .quote-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 7px 0; border-bottom: 1px solid rgba(162,89,255,0.08); font-size: 13px;
        }
        .quote-row:last-child { border-bottom: none; }
        .quote-row span:first-child { color: var(--white-dim); }
        .quote-row span:last-child  { color: var(--orb-blue); font-weight: 700; font-family: 'Orbitron', monospace; font-size: 11px; }
        .deposit-box {
          margin-top: 14px; padding: 14px; border-radius: 8px;
          background: rgba(0,234,255,0.05); border: 1px solid rgba(0,234,255,0.25);
          word-break: break-all; font-size: 11px; color: var(--orb-blue);
          font-family: monospace; line-height: 1.7;
        }

        .info-row {
          display: flex; justify-content: space-between;
          padding: 11px 0; border-bottom: 1px solid rgba(162,89,255,0.08); font-size: 13px;
        }
        .info-row:last-child { border-bottom: none; }
        .info-row .k { color: var(--white-faint); font-family: 'Orbitron', monospace; font-size: 9px; letter-spacing: 2px; }
        .info-row .v { color: var(--orb-blue); font-weight: 600; font-family: monospace; word-break: break-all; text-align: right; max-width: 62%; }

        .connect-prompt { text-align: center; padding: 46px 20px; }
        .connect-icon   { font-size: 48px; margin-bottom: 16px; }
        .connect-msg    { color: var(--white-dim); font-size: 14px; margin-bottom: 24px; line-height: 1.7; }

        .footer-banner {
          position: relative; z-index: 5;
          margin: 0; padding: 0 16px 0;
        }
        .footer-banner-inner {
          display: flex; align-items: stretch; justify-content: center;
          flex-wrap: wrap; gap: 0;
          border: 1px solid rgba(162,89,255,0.3);
          border-radius: 16px; overflow: hidden;
          background: linear-gradient(135deg, rgba(10,8,30,0.97) 0%, rgba(5,5,18,0.98) 100%);
          box-shadow: 0 0 40px rgba(162,89,255,0.1), var(--orb-glow);
          position: relative;
        }
        .footer-banner-inner::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: var(--orb-gradient);
        }
        .banner-link {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 4px; padding: 20px 28px; text-decoration: none;
          transition: background .2s; flex: 1; min-width: 140px;
          font-family: 'Orbitron', monospace;
        }
        .banner-link:hover { background: rgba(162,89,255,0.1); }
        .banner-link span:first-of-type { font-size: 11px; font-weight: 700; letter-spacing: 2px; }
        .banner-sub { font-size: 9px; letter-spacing: 1px; opacity: 0.5; color: var(--white-faint) !important; font-weight: 400; }

        .banner-mv    span:first-of-type { color: var(--orb-blue); }
        .banner-tw    span:first-of-type { color: var(--orb-purple); }
        .banner-dc    span:first-of-type { color: var(--orb-pink); }
        .banner-contract span:first-of-type { color: var(--orb-yellow); }

        .banner-mv:hover    { box-shadow: inset 0 0 30px rgba(0,234,255,0.06); }
        .banner-tw:hover    { box-shadow: inset 0 0 30px rgba(162,89,255,0.06); }
        .banner-dc:hover    { box-shadow: inset 0 0 30px rgba(255,110,199,0.06); }

        .banner-divider {
          width: 1px; background: rgba(162,89,255,0.2);
          align-self: stretch; margin: 12px 0;
        }

        .footer {
          position: relative; z-index: 5; text-align: center; padding: 16px 20px 20px;
          font-size: 9px; color: var(--white-faint); letter-spacing: 3px;
          font-family: 'Orbitron', monospace;
        }
        .footer a { color: rgba(162,89,255,0.6); text-decoration: none; transition: color .2s; }
        .footer a:hover { color: var(--orb-purple); }

        @media (max-width: 600px) {
          .header { padding: 14px 16px; }
          .stats  { padding: 0 12px 28px; }
          .hero   { padding: 36px 16px 20px; }
          .banner-link { padding: 16px 14px; min-width: 120px; }
          .banner-divider { display: none; }
        }
      `}</style>

      <div className="app">
        <MatrixParticles />

        {/* ── HEADER ── */}
        <header className="header">
          <div className="logo">
            {/* GIF coin logo — header size */}
            <img
              src={COIN_GIF}
              width={48}
              height={48}
              alt="Gold Token"
              className="logo-img"
            />
            <div>
              <div className="logo-text">{tokenName || "GOLD"}</div>
              <div className="logo-sub">Monad Network</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="chain-badge">
              <span className="chain-dot" />
              Monad · 143
            </div>
            <ConnectButton client={client} chain={MONAD_MAINNET} theme="dark" btnTitle="Connect" />
          </div>
        </header>

        {/* ── HERO ── */}
        <section className="hero">
          <div className="hero-coin">
            {/* GIF coin logo — hero size */}
            <img
              src={COIN_GIF}
              width={140}
              height={140}
              alt="Gold Token"
              style={{ borderRadius: "50%", objectFit: "cover" }}
            />
          </div>
          <div className="hero-title">${sym}</div>
          <div className="hero-sub">Digital Gold &middot; Monad Mainnet</div>
          <div className="hero-divider" />
        </section>

        {/* ── STATS ── */}
        <div className="stats">
          {[
            { label: "Total Supply", value: fmt(totalSupply) },
            { label: "Your Balance", value: account ? fmt(balance) : "—" },
            { label: "Network",      value: "Monad",  small: true },
            { label: "Chain ID",     value: "143" },
          ].map(function (s) {
            return (
              <div key={s.label} className="stat-card">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={s.small ? { fontSize: 14 } : {}}>{s.value}</div>
              </div>
            );
          })}
        </div>

        {/* ── TABS ── */}
        <div className="tabs">
          {["wallet", "swap", "info"].map(function (t) {
            return (
              <button
                key={t}
                className={"tab-btn" + (tab === t ? " active" : "")}
                onClick={function () { vibrate(); setTab(t); }}
              >
                {t === "wallet" ? "💼 WALLET" : t === "swap" ? "🔄 SWAP" : "ℹ INFO"}
              </button>
            );
          })}
        </div>

        {/* ── PANEL ── */}
        <div className="panel">

          {/* ─ WALLET TAB ─ */}
          {tab === "wallet" && (
            <div className="card">
              {!account ? (
                <div className="connect-prompt">
                  <div className="connect-icon">🔐</div>
                  <div className="connect-msg">
                    Connect your wallet to view your {sym} balance and send tokens on Monad.
                  </div>
                  <ConnectButton client={client} chain={MONAD_MAINNET} theme="dark" btnTitle="Connect Wallet" />
                </div>
              ) : (
                <>
                  <div className="balance-display">
                    <span className="balance-amount">{fmt(balance || 0)}</span>
                    <span className="balance-symbol">{sym}</span>
                    <div className="balance-addr">{shortAddr(account.address)}</div>
                  </div>

                  <div className="card-title">SEND {sym}</div>
                  <div className="field">
                    <label>Recipient Address</label>
                    <input placeholder="0x..." value={transferTo} onChange={function (e) { setTransferTo(e.target.value); }} />
                  </div>
                  <div className="field">
                    <label>Amount</label>
                    <input type="number" placeholder="0.00" value={transferAmt} onChange={function (e) { setTransferAmt(e.target.value); }} />
                  </div>
                  <button
                    className="btn-neon"
                    onClick={handleTransfer}
                    disabled={!transferTo || !transferAmt || txStatus === "pending"}
                  >
                    {txStatus === "pending" ? "SENDING..." : "SEND " + sym}
                  </button>

                  {txStatus && (
                    <div className={"status " + txStatus}>
                      {txStatus === "pending" && "⏳ TRANSACTION PENDING..."}
                      {txStatus === "success" && "✅ TRANSFER CONFIRMED"}
                      {txStatus === "error"   && "❌ TRANSACTION FAILED"}
                    </div>
                  )}

                  <BuyGoldWithCard account={account} sym={sym} />

                  <a href={"https://monadscan.com/address/" + account.address} target="_blank" rel="noopener noreferrer">
                    <button className="btn-outline">🔍 VIEW ON MONADSCAN</button>
                  </a>
                </>
              )}
            </div>
          )}

          {/* ─ SWAP TAB ─ */}
          {tab === "swap" && (
            <div className="card">
              <div className="card-title">SWAP &rarr; {sym}</div>
              {!account ? (
                <div className="connect-prompt">
                  <div className="connect-icon">🔗</div>
                  <div className="connect-msg">Connect your wallet to swap any token for {sym} via NEAR Intents.</div>
                  <ConnectButton client={client} chain={MONAD_MAINNET} theme="dark" btnTitle="Connect Wallet" />
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: "var(--white-dim)", marginBottom: 18, lineHeight: 1.7 }}>
                    Powered by <strong style={{ color: "var(--orb-blue)" }}>NEAR Intents</strong> — swap ETH, BTC, SOL, USDC and more into {sym}.
                  </div>
                  <div className="field">
                    <label>From Token</label>
                    <select value={swapOrigin} onChange={function (e) { setSwapOrigin(e.target.value); }}>
                      <option value="">Select token...</option>
                      {swapTokens.map(function (t) {
                        return (
                          <option key={t.assetId} value={t.assetId}>
                            {t.symbol} — {t.blockchain ? t.blockchain.toUpperCase() : ""}{t.price ? " ($" + Number(t.price).toFixed(2) + ")" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="field">
                    <label>Amount to Swap</label>
                    <input type="number" placeholder="0.00" value={swapAmount} onChange={function (e) { setSwapAmount(e.target.value); }} />
                  </div>
                  <button className="btn-neon" onClick={handleGetQuote} disabled={!swapOrigin || !swapAmount || swapLoading}>
                    {swapLoading ? "FETCHING QUOTE..." : "⬡ GET BEST QUOTE"}
                  </button>

                  {swapError && <div className="status error">{swapError}</div>}

                  {swapQuote && !swapError && (
                    <>
                      <div className="quote-box">
                        <div className="quote-row">
                          <span>You Send</span>
                          <span>{swapAmount} {swapTokens.find(function (t) { return t.assetId === swapOrigin; })?.symbol || ""}</span>
                        </div>
                        <div className="quote-row">
                          <span>You Receive (est.)</span>
                          <span>{swapQuote.amountOutFormatted || "—"} {sym}</span>
                        </div>
                        <div className="quote-row">
                          <span>Deadline</span>
                          <span>{swapQuote.deadline ? new Date(swapQuote.deadline).toLocaleTimeString() : "10 min"}</span>
                        </div>
                      </div>
                      {swapQuote.depositAddress && (
                        <div className="deposit-box">
                          <div style={{ color: "var(--orb-blue)", marginBottom: 6, fontFamily: "Rajdhani", fontWeight: 700 }}>DEPOSIT ADDRESS:</div>
                          {swapQuote.depositAddress}
                          <div style={{ marginTop: 8, color: "var(--white-dim)", fontFamily: "Rajdhani", fontSize: 11 }}>
                            Send your tokens here. NEAR Intents will complete the swap and deliver {sym} to your wallet.
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─ INFO TAB ─ */}
          {tab === "info" && (
            <div className="card">
              <div className="card-title">CONTRACT INFO</div>
              <div className="info-row"><span className="k">Token Name</span>   <span className="v">{tokenName || "—"}</span></div>
              <div className="info-row"><span className="k">Symbol</span>       <span className="v">{sym}</span></div>
              <div className="info-row"><span className="k">Network</span>      <span className="v">Monad Mainnet</span></div>
              <div className="info-row"><span className="k">Chain ID</span>     <span className="v">143</span></div>
              <div className="info-row"><span className="k">Proxy</span>        <span className="v">{PROXY_ADDRESS}</span></div>
              <div className="info-row"><span className="k">Treasury</span>     <span className="v">{shortAddr(TREASURY)}</span></div>
              <div className="info-row"><span className="k">Total Supply</span> <span className="v">{fmt(totalSupply)}</span></div>
              <div className="info-row"><span className="k">Standard</span>     <span className="v">ERC-20 UUPS</span></div>
              <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
                <a href={"https://monadscan.com/token/" + PROXY_ADDRESS} target="_blank" rel="noopener noreferrer" style={{ flex: 1 }}>
                  <button className="btn-neon" style={{ fontSize: 10 }}>MONADSCAN</button>
                </a>
                <a href={"https://monadvision.com/token/" + PROXY_ADDRESS} target="_blank" rel="noopener noreferrer" style={{ flex: 1 }}>
                  <button className="btn-orb" style={{ fontSize: 10 }}>MONADVISION</button>
                </a>
              </div>
            </div>
          )}

        </div>

        {/* ── FOOTER BANNER ── */}
        <FooterBanner />

        {/* ── FOOTER ── */}
        <footer className="footer">
          GOLD TOKEN &middot; MONAD MAINNET &middot;{" "}
          <a href="https://thirdweb.com"     target="_blank" rel="noopener noreferrer">THIRDWEB</a>
          {" "}&amp;{" "}
          <a href="https://near-intents.org" target="_blank" rel="noopener noreferrer">NEAR INTENTS</a>
        </footer>
      </div>
    </>
  );
}

/* ─── ROOT EXPORT ─────────────────────────────────────────────── */
export default function GoldTokenPage() {
  return (
    <ThirdwebProvider>
      <GoldApp />
    </ThirdwebProvider>
  );
}
