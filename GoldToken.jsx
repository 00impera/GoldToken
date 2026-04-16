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

const MONAD_MAINNET = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpc: "https://rpc.monad.xyz",
  blockExplorers: [{ name: "Monadscan", url: "https://monadscan.com" }],
});

const client = createThirdwebClient({ clientId: CLIENT_ID });

const ERC20_ABI = [
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf",   outputs: [{ name: "", type: "uint256" }], stateMutability: "view",        type: "function" },
  { inputs: [],                                      name: "name",        outputs: [{ name: "", type: "string"  }], stateMutability: "view",        type: "function" },
  { inputs: [],                                      name: "symbol",      outputs: [{ name: "", type: "string"  }], stateMutability: "view",        type: "function" },
  { inputs: [],                                      name: "totalSupply", outputs: [{ name: "", type: "uint256" }], stateMutability: "view",        type: "function" },
  { inputs: [],                                      name: "decimals",    outputs: [{ name: "", type: "uint8"   }], stateMutability: "view",        type: "function" },
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

/* ─── VIBRATE HELPER ──────────────────────────────────────────── */
function vibrate() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([40, 15, 40, 15, 20]);
  }
}

/* ─── GOLD COIN LOGO ──────────────────────────────────────────── */
function GoldCoinLogo({ size }) {
  var s  = size || 48;
  var cx = s / 2, cy = s / 2, r = s * 0.46;
  var r2 = s * 0.40, r3 = s * 0.34, r4 = s * 0.24;
  var fs = s * 0.30;

  return (
    <svg width={s} height={s} viewBox={"0 0 " + s + " " + s} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={"cg" + s} cx="40%" cy="35%" r="65%">
          <stop offset="0%"   stopColor="#FFE066" />
          <stop offset="40%"  stopColor="#D4A017" />
          <stop offset="75%"  stopColor="#B8860B" />
          <stop offset="100%" stopColor="#7A5500" />
        </radialGradient>
        <radialGradient id={"ig" + s} cx="40%" cy="35%" r="60%">
          <stop offset="0%"   stopColor="#E8B820" />
          <stop offset="55%"  stopColor="#B8860B" />
          <stop offset="100%" stopColor="#8B6500" />
        </radialGradient>
        <filter id={"ng" + s} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={s * 0.04} result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <circle cx={cx + s * 0.02} cy={cy + s * 0.02} r={r} fill="rgba(0,0,0,0.45)" />
      <circle cx={cx} cy={cy} r={r} fill={"url(#cg" + s + ")"} />
      <circle cx={cx} cy={cy} r={r - s * 0.01} fill="none" stroke="#C8960C" strokeWidth={s * 0.012} strokeDasharray={s * 0.025 + " " + s * 0.018} />
      <circle cx={cx} cy={cy} r={r2} fill={"url(#ig" + s + ")"} />
      <circle cx={cx} cy={cy} r={r2 - s * 0.01} fill="none" stroke="#39FF14" strokeWidth={s * 0.05}  opacity="0.35" filter={"url(#ng" + s + ")"} />
      <circle cx={cx} cy={cy} r={r2 - s * 0.01} fill="none" stroke="#39FF14" strokeWidth={s * 0.025} opacity="1" />

      {s >= 60 && (
        <>
          <line x1={cx - r3} y1={cy - r3 * 0.3} x2={cx + r3} y2={cy - r3 * 0.3} stroke="#39FF14" strokeWidth={s * 0.008} opacity="0.2" />
          <line x1={cx - r3} y1={cy + r3 * 0.3} x2={cx + r3} y2={cy + r3 * 0.3} stroke="#39FF14" strokeWidth={s * 0.008} opacity="0.2" />
          <line x1={cx - r3 * 0.3} y1={cy - r3}  x2={cx - r3 * 0.3} y2={cy + r3}  stroke="#39FF14" strokeWidth={s * 0.008} opacity="0.2" />
          <line x1={cx + r3 * 0.3} y1={cy - r3}  x2={cx + r3 * 0.3} y2={cy + r3}  stroke="#39FF14" strokeWidth={s * 0.008} opacity="0.2" />
          <circle cx={cx - r3 * 0.3} cy={cy - r3 * 0.3} r={s * 0.018} fill="#39FF14" opacity="0.4" />
          <circle cx={cx + r3 * 0.3} cy={cy + r3 * 0.3} r={s * 0.018} fill="#39FF14" opacity="0.4" />
        </>
      )}

      <circle cx={cx} cy={cy} r={r4} fill="none" stroke="#39FF14" strokeWidth={s * 0.018} opacity="0.4" filter={"url(#ng" + s + ")"} />
      <circle cx={cx} cy={cy} r={r4} fill="none" stroke="#39FF14" strokeWidth={s * 0.012} opacity="0.7" />

      <text x={cx} y={cy + fs * 0.38} textAnchor="middle" fontSize={fs} fontWeight="900" fontFamily="Arial Black,sans-serif" fill="#39FF14" opacity="0.3" filter={"url(#ng" + s + ")"}>$</text>
      <text x={cx} y={cy + fs * 0.38} textAnchor="middle" fontSize={fs} fontWeight="900" fontFamily="Arial Black,sans-serif" fill="#39FF14" opacity="0.97">$</text>

      {s >= 80 && (
        <>
          <text x={cx} y={cy - r + s * 0.09}  textAnchor="middle" fontSize={s * 0.07}  fontWeight="900" fontFamily="Arial Black,sans-serif" fill="#FFE066" letterSpacing={s * 0.015}>GOLD</text>
          <text x={cx} y={cy + r - s * 0.04}  textAnchor="middle" fontSize={s * 0.065} fontWeight="900" fontFamily="Arial Black,sans-serif" fill="#FFE066" letterSpacing={s * 0.012}>TOKEN</text>
          <circle cx={cx - r * 0.52} cy={cy - r + s * 0.05} r={s * 0.018} fill="#39FF14" opacity="0.8" />
          <circle cx={cx + r * 0.52} cy={cy - r + s * 0.05} r={s * 0.018} fill="#39FF14" opacity="0.8" />
        </>
      )}

      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,240,150,0.25)" strokeWidth={s * 0.03} />
    </svg>
  );
}

/* ─── MATRIX PARTICLES ────────────────────────────────────────── */
function MatrixParticles() {
  var items = [];
  for (var i = 0; i < 22; i++) {
    items.push(
      <div key={i} className={"mp mp" + (i % 4)} style={{
        left: ((i * 41 + 7) % 100) + "%",
        animationDelay:    ((i * 0.6) % 7) + "s",
        animationDuration: (5 + (i * 0.4) % 7) + "s",
      }} />
    );
  }
  return <div className="matrix-bg">{items}</div>;
}

/* ─── BUY GOLD WITH CARD ──────────────────────────────────────── */
// Uses thirdweb BuyWidget (replaces deprecated pay.thirdweb.com/buy URL)
function BuyGoldWithCard({ account, sym }) {
  const [showWidget, setShowWidget] = useState(false);

  if (!account) return null;

  return (
    <div style={{ marginTop: 12, marginBottom: 4 }}>
      {!showWidget ? (
        <button
          className="btn-buy"
          onClick={() => { vibrate(); setShowWidget(true); }}
        >
          💳 BUY {sym || "GOLD"} WITH CARD
        </button>
      ) : (
        <>
          <button
            className="btn-outline"
            style={{ marginTop: 0, marginBottom: 12, fontSize: 10 }}
            onClick={() => setShowWidget(false)}
          >
            ✕ CLOSE
          </button>
          <div style={{
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid rgba(57,255,20,0.28)",
            background: "rgba(5,10,14,0.95)",
          }}>
            <BuyWidget
              client={client}
              chain={MONAD_MAINNET}
              tokenAddress={PROXY_ADDRESS}
              theme="dark"
            />
          </div>
        </>
      )}
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
      var destAsset    = "nep141:monad-" + PROXY_ADDRESS.toLowerCase() + ".omft.near";
      var originToken  = swapTokens.find(function (t) { return t.assetId === swapOrigin; });
      var decimals     = originToken && originToken.decimals ? originToken.decimals : 18;
      var amountRaw    = (BigInt(Math.round(parseFloat(swapAmount) * Math.pow(10, decimals)))).toString();
      var quote        = await getNearIntentsQuote({ originAsset: swapOrigin, destinationAsset: destAsset, amount: amountRaw, recipient: account.address });
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
          --neon:        #39FF14;
          --neon-bright: #6FFF45;
          --neon-dim:    rgba(57,255,20,0.55);
          --neon-faint:  rgba(57,255,20,0.10);
          --neon-glow:   rgba(57,255,20,0.20);
          --black:       #050A0E;
          --navy:        #080D18;
          --navy-mid:    #0C1422;
          --navy-card:   #0a2e12;
          --navy-border: rgba(57,255,20,0.28);
          --gold:        #C8960C;
          --gold-light:  #FFD700;
          --gold-pale:   #FFE066;
          --white:       #E8FFF0;
          --white-dim:   rgba(232,255,240,0.50);
          --white-faint: rgba(232,255,240,0.20);
        }

        body { background: var(--black); color: var(--white); font-family: 'Rajdhani', sans-serif; }

        .app {
          min-height: 100vh;
          background:
            radial-gradient(ellipse 80% 60% at 10% 0%,  rgba(0,40,10,0.7)  0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 90% 100%, rgba(0,30,8,0.5)   0%, transparent 55%),
            var(--black);
          position: relative; overflow: hidden;
        }

        .app::before {
          content: ''; position: fixed; inset: 0; z-index: 1; pointer-events: none;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px);
        }

        .matrix-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
        .mp { position: absolute; bottom: -10px; border-radius: 2px; animation: mrise linear infinite; }
        .mp0 { width: 2px; background: var(--neon);  height: 16px; opacity: 0.65; }
        .mp1 { width: 1px; background: var(--neon);  height: 9px;  opacity: 0.35; }
        .mp2 { width: 2px; background: #00FF88;      height: 22px; opacity: 0.28; }
        .mp3 { width: 1px; background: var(--white); height: 6px;  opacity: 0.15; }
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
          border-bottom: 1px solid var(--navy-border);
          background: rgba(5,10,14,0.92);
          backdrop-filter: blur(18px);
          box-shadow: 0 1px 0 rgba(57,255,20,0.08), 0 4px 24px rgba(0,0,0,0.5);
        }
        .logo { display: flex; align-items: center; gap: 14px; }
        .logo-text {
          font-family: 'Orbitron', monospace; font-size: 20px; font-weight: 700;
          color: var(--neon); letter-spacing: 3px;
          text-shadow: 0 0 14px rgba(57,255,20,0.55), 0 0 28px rgba(57,255,20,0.25);
        }
        .logo-sub {
          font-size: 9px; color: var(--white-faint); letter-spacing: 4px;
          text-transform: uppercase; margin-top: 3px; font-family: 'Orbitron', monospace;
        }
        .chain-badge {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 5px 16px; border-radius: 20px;
          background: var(--neon-faint); border: 1px solid rgba(57,255,20,0.25);
          font-size: 10px; color: var(--neon); letter-spacing: 2px;
          font-family: 'Orbitron', monospace;
          box-shadow: inset 0 0 10px rgba(57,255,20,0.06);
        }
        .chain-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--neon); box-shadow: 0 0 6px var(--neon);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%,100% { opacity: 1;    box-shadow: 0 0 6px var(--neon); }
          50%      { opacity: 0.35; box-shadow: none; }
        }

        .hero { position: relative; z-index: 5; text-align: center; padding: 52px 20px 30px; }
        .hero-coin { display: flex; justify-content: center; margin-bottom: 22px; }
        .hero-coin svg {
          filter: drop-shadow(0 0 22px rgba(57,255,20,0.65)) drop-shadow(0 0 6px rgba(200,150,12,0.4));
          animation: coinFloat 4.5s ease-in-out infinite;
        }
        @keyframes coinFloat {
          0%,100% { transform: translateY(0)    rotate(-1deg); }
          50%      { transform: translateY(-12px) rotate(1deg);  }
        }
        .hero-title {
          font-family: 'Orbitron', monospace;
          font-size: clamp(38px, 8vw, 76px); font-weight: 900; letter-spacing: 8px;
          color: var(--neon);
          text-shadow: 0 0 20px rgba(57,255,20,0.6), 0 0 50px rgba(57,255,20,0.3), 0 0 100px rgba(57,255,20,0.12);
        }
        .hero-sub {
          margin-top: 10px; font-size: 12px; letter-spacing: 6px;
          text-transform: uppercase; color: var(--white-dim); font-family: 'Orbitron', monospace;
        }
        .hero-divider {
          margin: 26px auto; width: 140px; height: 1px;
          background: linear-gradient(90deg, transparent, var(--neon), transparent);
          box-shadow: 0 0 8px rgba(57,255,20,0.4);
        }

        .stats {
          position: relative; z-index: 5;
          display: flex; justify-content: center; flex-wrap: wrap;
          gap: 12px; padding: 0 40px 36px;
        }
        .stat-card {
          background: linear-gradient(135deg, #0a2e12 0%, #050A0E 100%);
          border: 1px solid var(--navy-border);
          border-radius: 10px; padding: 16px 28px; min-width: 160px; text-align: center;
          transition: border-color .25s, box-shadow .25s, transform .25s;
          position: relative; overflow: hidden;
        }
        .stat-card::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(57,255,20,0.06) 0%, transparent 60%);
          pointer-events: none;
        }
        .stat-card:hover {
          border-color: rgba(57,255,20,0.55);
          box-shadow: 0 0 20px rgba(57,255,20,0.14), 0 0 40px rgba(57,255,20,0.06);
          transform: translateY(-2px);
        }
        .stat-label { font-size: 9px; letter-spacing: 3px; text-transform: uppercase; color: var(--white-faint); font-family: 'Orbitron', monospace; }
        .stat-value { font-family: 'Orbitron', monospace; font-size: 18px; font-weight: 700; color: var(--neon); margin-top: 6px; text-shadow: 0 0 10px rgba(57,255,20,0.35); }

        .tabs { position: relative; z-index: 5; display: flex; justify-content: center; gap: 4px; padding: 0 20px 22px; }
        .tab-btn {
          padding: 9px 28px; border-radius: 6px;
          border: 1px solid var(--navy-border);
          background: transparent; color: var(--white-dim);
          font-family: 'Orbitron', monospace; font-size: 10px;
          letter-spacing: 2px; text-transform: uppercase; cursor: pointer; transition: all .2s;
        }
        .tab-btn.active {
          background: var(--neon-faint); color: var(--neon);
          border-color: rgba(57,255,20,0.5);
          box-shadow: 0 0 14px rgba(57,255,20,0.2), inset 0 0 10px rgba(57,255,20,0.08);
        }
        .tab-btn:not(.active):hover { border-color: var(--neon-dim); color: var(--white); background: rgba(57,255,20,0.04); }

        .panel { position: relative; z-index: 5; max-width: 540px; margin: 0 auto; padding: 0 20px 60px; }
        .card {
          background: linear-gradient(135deg, #0a2e12 0%, #050A0E 100%);
          border: 1px solid var(--navy-border);
          border-radius: 16px; padding: 28px;
          box-shadow: 0 4px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(57,255,20,0.08);
          animation: fadeUp .35s ease;
          position: relative; overflow: hidden;
        }
        .card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(57,255,20,0.4), transparent);
        }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

        .card-title {
          font-family: 'Orbitron', monospace; font-size: 12px; font-weight: 700;
          color: var(--neon); margin-bottom: 22px;
          display: flex; align-items: center; gap: 10px; letter-spacing: 2px;
          text-shadow: 0 0 8px rgba(57,255,20,0.4);
        }
        .card-title::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, rgba(57,255,20,0.4), transparent); }

        .balance-display {
          text-align: center; padding: 30px 20px;
          background: rgba(57,255,20,0.05);
          border-radius: 12px; border: 1px solid rgba(57,255,20,0.15);
          margin-bottom: 22px;
          box-shadow: inset 0 0 30px rgba(57,255,20,0.05);
        }
        .balance-amount {
          font-family: 'Orbitron', monospace; font-size: 44px; font-weight: 900; color: var(--neon);
          text-shadow: 0 0 24px rgba(57,255,20,0.45), 0 0 50px rgba(57,255,20,0.2);
        }
        .balance-symbol { font-size: 18px; color: var(--neon-dim); margin-left: 8px; font-family: 'Orbitron', monospace; }
        .balance-addr   { font-size: 11px; color: var(--white-faint); margin-top: 8px; letter-spacing: 1px; font-family: monospace; }

        .field { margin-bottom: 14px; }
        .field label {
          display: block; font-size: 9px; letter-spacing: 3px; text-transform: uppercase;
          color: var(--white-faint); margin-bottom: 6px; font-family: 'Orbitron', monospace;
        }
        .field input, .field select {
          width: 100%; padding: 11px 14px; border-radius: 8px;
          background: rgba(5,10,14,0.85); border: 1px solid var(--navy-border);
          color: var(--white); font-family: 'Rajdhani', sans-serif; font-size: 15px;
          outline: none; transition: border-color .2s, box-shadow .2s;
        }
        .field input:focus, .field select:focus {
          border-color: rgba(57,255,20,0.5);
          box-shadow: 0 0 0 2px rgba(57,255,20,0.10);
        }
        .field select option { background: #0a2e12; color: var(--white); }

        @keyframes vibrate {
          0%,100% { transform: translateX(0)     rotate(0deg);    }
          15%      { transform: translateX(-4px)  rotate(-1.2deg); }
          30%      { transform: translateX(4px)   rotate(1.2deg);  }
          45%      { transform: translateX(-3px)  rotate(-0.8deg); }
          60%      { transform: translateX(3px)   rotate(0.8deg);  }
          75%      { transform: translateX(-1.5px) rotate(-0.3deg); }
          90%      { transform: translateX(1.5px)  rotate(0.3deg);  }
        }

        .btn-neon {
          width: 100%; padding: 13px; border-radius: 8px;
          border: none; cursor: pointer;
          background: linear-gradient(90deg, #39FF14 0%, #00FF88 100%);
          color: #050A0E;
          font-family: 'Orbitron', monospace; font-size: 11px; font-weight: 700;
          letter-spacing: 3px; text-transform: uppercase;
          transition: background .2s, box-shadow .2s, transform .15s;
          box-shadow: 0 0 16px rgba(57,255,20,0.45), 0 0 32px rgba(0,255,136,0.2);
          -webkit-tap-highlight-color: transparent;
        }
        .btn-neon:hover:not(:disabled) {
          background: linear-gradient(90deg, #6FFF45 0%, #39FF14 100%);
          box-shadow: 0 0 28px rgba(57,255,20,0.7), 0 0 50px rgba(0,255,136,0.3);
          transform: scale(1.02);
        }
        .btn-neon:active:not(:disabled) { transform: scale(0.97); animation: vibrate 0.32s ease; }
        .btn-neon:disabled { opacity: 0.3; cursor: not-allowed; }

        .btn-buy {
          width: 100%; padding: 13px; border-radius: 8px;
          border: none; cursor: pointer;
          background: linear-gradient(90deg, #FFD700 0%, #C8960C 100%);
          color: #050A0E;
          font-family: 'Orbitron', monospace; font-size: 11px; font-weight: 700;
          letter-spacing: 3px; text-transform: uppercase;
          transition: background .2s, box-shadow .2s, transform .15s;
          box-shadow: 0 0 16px rgba(255,215,0,0.4), 0 0 32px rgba(200,150,12,0.2);
          -webkit-tap-highlight-color: transparent;
        }
        .btn-buy:hover:not(:disabled) {
          background: linear-gradient(90deg, #FFE566 0%, #FFD700 100%);
          box-shadow: 0 0 28px rgba(255,215,0,0.6), 0 0 50px rgba(200,150,12,0.3);
          transform: scale(1.02);
        }
        .btn-buy:active:not(:disabled) { transform: scale(0.97); animation: vibrate 0.32s ease; }
        .btn-buy:disabled { opacity: 0.3; cursor: not-allowed; }

        .btn-outline {
          width: 100%; padding: 11px; border-radius: 8px; margin-top: 10px;
          border: 1px solid rgba(57,255,20,0.35); background: transparent;
          color: var(--white-dim); font-family: 'Orbitron', monospace;
          font-size: 10px; font-weight: 600; cursor: pointer;
          transition: all .2s; letter-spacing: 2px;
          -webkit-tap-highlight-color: transparent;
        }
        .btn-outline:hover { border-color: rgba(57,255,20,0.55); color: var(--neon); background: var(--neon-faint); }
        .btn-outline:active { animation: vibrate 0.32s ease; transform: scale(0.97); }

        .status {
          margin-top: 12px; padding: 11px 14px; border-radius: 8px;
          font-size: 11px; font-weight: 700; text-align: center;
          font-family: 'Orbitron', monospace; letter-spacing: 2px;
        }
        .status.pending { background: rgba(255,165,0,.08); color: #FFA500; border: 1px solid rgba(255,165,0,.25); }
        .status.success { background: rgba(57,255,20,.08);  color: var(--neon); border: 1px solid rgba(57,255,20,.25); }
        .status.error   { background: rgba(255,50,50,.08);  color: #FF5050;     border: 1px solid rgba(255,50,50,.25); }

        .quote-box {
          margin-top: 14px; padding: 14px; border-radius: 10px;
          background: rgba(57,255,20,0.04); border: 1px solid var(--navy-border);
        }
        .quote-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 7px 0; border-bottom: 1px solid rgba(57,255,20,0.07); font-size: 13px;
        }
        .quote-row:last-child { border-bottom: none; }
        .quote-row span:first-child { color: var(--white-dim); }
        .quote-row span:last-child  { color: var(--neon); font-weight: 700; font-family: 'Orbitron', monospace; font-size: 11px; }
        .deposit-box {
          margin-top: 14px; padding: 14px; border-radius: 8px;
          background: rgba(57,255,20,0.05); border: 1px solid rgba(57,255,20,0.25);
          word-break: break-all; font-size: 11px; color: var(--neon);
          font-family: monospace; line-height: 1.7;
        }

        .info-row {
          display: flex; justify-content: space-between;
          padding: 11px 0; border-bottom: 1px solid rgba(57,255,20,0.07); font-size: 13px;
        }
        .info-row:last-child { border-bottom: none; }
        .info-row .k { color: var(--white-faint); font-family: 'Orbitron', monospace; font-size: 9px; letter-spacing: 2px; }
        .info-row .v { color: var(--neon); font-weight: 600; font-family: monospace; word-break: break-all; text-align: right; max-width: 62%; }

        .connect-prompt { text-align: center; padding: 46px 20px; }
        .connect-icon   { font-size: 48px; margin-bottom: 16px; }
        .connect-msg    { color: var(--white-dim); font-size: 14px; margin-bottom: 24px; line-height: 1.7; }

        .footer {
          position: relative; z-index: 5; text-align: center; padding: 20px;
          border-top: 1px solid var(--navy-border);
          font-size: 9px; color: var(--white-faint); letter-spacing: 3px;
          font-family: 'Orbitron', monospace;
        }
        .footer a { color: rgba(57,255,20,0.6); text-decoration: none; transition: color .2s; }
        .footer a:hover { color: var(--neon); }

        @media (max-width: 600px) {
          .header { padding: 14px 16px; }
          .stats  { padding: 0 12px 28px; }
          .hero   { padding: 36px 16px 20px; }
        }
      `}</style>

      <div className="app">
        <MatrixParticles />

        {/* ── HEADER ── */}
        <header className="header">
          <div className="logo">
            <GoldCoinLogo size={48} />
            <div>
              <div className="logo-text">{tokenName || "GOLD"}</div>
              <div className="logo-sub">Monad Network</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="chain-badge">
              <span className="chain-dot" />
              Monad
            </div>
            <ConnectButton client={client} chain={MONAD_MAINNET} theme="dark" btnTitle="Connect" />
          </div>
        </header>

        {/* ── HERO ── */}
        <section className="hero">
          <div className="hero-coin">
            <GoldCoinLogo size={108} />
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
            { label: "Network",      value: "Monad", small: true },
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
                {t === "wallet" ? "WALLET" : t === "swap" ? "SWAP" : "INFO"}
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
                    <input
                      placeholder="0x..."
                      value={transferTo}
                      onChange={function (e) { setTransferTo(e.target.value); }}
                    />
                  </div>
                  <div className="field">
                    <label>Amount</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={transferAmt}
                      onChange={function (e) { setTransferAmt(e.target.value); }}
                    />
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
                      {txStatus === "pending" && "TRANSACTION PENDING..."}
                      {txStatus === "success" && "✅ TRANSFER CONFIRMED"}
                      {txStatus === "error"   && "❌ TRANSACTION FAILED"}
                    </div>
                  )}

                  {/* Buy with Card — uses BuyWidget (pay.thirdweb.com/buy is deprecated) */}
                  <BuyGoldWithCard account={account} sym={sym} />

                  <a
                    href={"https://monadscan.com/address/" + account.address}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <button className="btn-outline">VIEW ON MONADSCAN</button>
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
                  <div className="connect-msg">
                    Connect your wallet to swap any token for {sym} via NEAR Intents.
                  </div>
                  <ConnectButton client={client} chain={MONAD_MAINNET} theme="dark" btnTitle="Connect Wallet" />
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: "var(--white-dim)", marginBottom: 18, lineHeight: 1.7 }}>
                    Powered by <strong style={{ color: "var(--neon)" }}>NEAR Intents</strong> — swap ETH, BTC, SOL, USDC and more into {sym}.
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
                    <input
                      type="number"
                      placeholder="0.00"
                      value={swapAmount}
                      onChange={function (e) { setSwapAmount(e.target.value); }}
                    />
                  </div>
                  <button
                    className="btn-neon"
                    onClick={handleGetQuote}
                    disabled={!swapOrigin || !swapAmount || swapLoading}
                  >
                    {swapLoading ? "FETCHING QUOTE..." : "GET BEST QUOTE"}
                  </button>

                  {swapError && <div className="status error">{swapError}</div>}

                  {swapQuote && !swapError && (
                    <>
                      <div className="quote-box">
                        <div className="quote-row">
                          <span>You Send</span>
                          <span>
                            {swapAmount}{" "}
                            {swapTokens.find(function (t) { return t.assetId === swapOrigin; })
                              ? swapTokens.find(function (t) { return t.assetId === swapOrigin; }).symbol
                              : ""}
                          </span>
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
                          <div style={{ color: "var(--neon)", marginBottom: 6, fontFamily: "Rajdhani", fontWeight: 700 }}>
                            DEPOSIT ADDRESS:
                          </div>
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
                  <button className="btn-outline" style={{ marginTop: 0, fontSize: 10 }}>MONADVISIO</button>
                </a>
              </div>
            </div>
          )}

        </div>

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
