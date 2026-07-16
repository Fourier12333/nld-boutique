import { useState, useEffect } from "react";
import { ShoppingBag, X, Plus, Minus, Settings, Trash2, Pencil, Lock, Check, ChevronLeft } from "lucide-react";
import { db } from "./firebase";
import {
  collection, doc, onSnapshot, setDoc, deleteDoc, addDoc, getDoc,
} from "firebase/firestore";

const ADMIN_PASSWORD = "GELE2026";

const SEED_PRODUCTS = [
  { id: "p1", name: "Mocassin bicolore", category: "Chaussures Homme", price: 13000, sizes: "40-46", images: [], desc: "Cuir premium, coupe moderne, finition bicolore noir & blanc.", stock: true },
  { id: "p2", name: "Derby motif signature", category: "Chaussures Homme", price: 12000, sizes: "40-45", images: [], desc: "Élégance intemporelle, semelle confort.", stock: true },
  { id: "p3", name: "Escarpin satin", category: "Chaussures Femme", price: 11000, sizes: "36-41", images: [], desc: "Talon fin, finition satinée, pour toutes vos sorties.", stock: true },
  { id: "p4", name: "Ensemble chemise & pantalon", category: "Habits Homme", price: 15000, sizes: "S-XL", images: [], desc: "Coupe droite, tissu respirant.", stock: true },
];
const DEFAULT_SETTINGS = { shopName: "NLD Boutique", whatsapp: "237600000000" };
const CATEGORIES = ["Tout", "Chaussures Homme", "Chaussures Femme", "Habits Homme", "Habits Femme", "Autres"];

function fcfa(n) {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

function resizeImageFile(file, maxDim = 900) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
          else { width = Math.round((width * maxDim) / height); height = maxDim; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function ProductImage({ images, name }) {
  const [idx, setIdx] = useState(0);
  const list = images && images.length ? images : [];
  return (
    <div
      className="relative aspect-square bg-[#221D18] flex items-center justify-center overflow-hidden"
      onClick={() => list.length > 1 && setIdx((i) => (i + 1) % list.length)}
    >
      {list.length ? (
        <img src={list[idx]} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="serif text-2xl text-[#3A3226]">NLD</span>
      )}
      {list.length > 1 && (
        <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
          {list.map((_, i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i === idx ? "#C9A227" : "rgba(243,236,223,0.4)" }} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [products, setProducts] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [cart, setCart] = useState([]);
  const [view, setView] = useState("catalog");
  const [category, setCategory] = useState("Tout");
  const [showCart, setShowCart] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);

  // Live sync: any change made in the admin panel appears instantly for
  // every visitor, on every device, as long as they have the page open.
  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, "products"), async (snap) => {
      if (snap.empty) {
        for (const p of SEED_PRODUCTS) await setDoc(doc(db, "products", p.id), p);
        return;
      }
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubSettings = onSnapshot(doc(db, "settings", "shop"), async (snap) => {
      if (!snap.exists()) {
        await setDoc(doc(db, "settings", "shop"), DEFAULT_SETTINGS);
        return;
      }
      setSettings(snap.data());
    });

    return () => { unsubProducts(); unsubSettings(); };
  }, []);

  async function saveProductDoc(p) {
    await setDoc(doc(db, "products", p.id), p);
  }
  async function deleteProductDoc(id) {
    await deleteDoc(doc(db, "products", id));
  }
  async function saveSettingsDoc(s) {
    await setDoc(doc(db, "settings", "shop"), s);
  }
  async function logOrder(order) {
    await addDoc(collection(db, "orders"), order);
  }

  function addToCart(product) {
    setCart((c) => {
      const found = c.find((i) => i.id === product.id);
      if (found) return c.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      return [...c, { ...product, qty: 1 }];
    });
  }
  function changeQty(id, delta) {
    setCart((c) => c.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)).filter((i) => i.qty > 0));
  }
  function removeFromCart(id) {
    setCart((c) => c.filter((i) => i.id !== id));
  }
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  if (view === "admin") {
    return (
      <AdminPanel
        adminUnlocked={adminUnlocked}
        pwInput={pwInput}
        setPwInput={setPwInput}
        pwError={pwError}
        onUnlock={() => {
          if (pwInput === ADMIN_PASSWORD) { setAdminUnlocked(true); setPwError(false); }
          else setPwError(true);
        }}
        products={products || []}
        settings={settings}
        onSaveProduct={saveProductDoc}
        onDeleteProduct={deleteProductDoc}
        onSaveSettings={saveSettingsDoc}
        onBack={() => setView("catalog")}
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#12100E", color: "#F3ECDF", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        .serif { font-family: 'Playfair Display', serif; }
        .gold { color: #C9A227; }
        .card-hover { transition: transform .25s ease, border-color .25s ease; }
        .card-hover:hover { transform: translateY(-4px); border-color: #C9A227; }
      `}</style>

      <header className="sticky top-0 z-20 backdrop-blur border-b" style={{ background: "rgba(18,16,14,0.9)", borderColor: "#2A241C" }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="serif text-xl gold tracking-wide">{settings.shopName}</h1>
            <p className="text-[11px] text-[#8A8478]">L'élégance, notre promesse</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setView("admin")} className="text-[#8A8478] hover:text-[#C9A227]" aria-label="Admin">
              <Settings size={20} />
            </button>
            <button onClick={() => setShowCart(true)} className="relative text-[#F3ECDF] hover:text-[#C9A227]" aria-label="Panier">
              <ShoppingBag size={22} />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#C9A227] text-[#12100E] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cart.reduce((s, i) => s + i.qty, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="whitespace-nowrap text-xs px-3 py-1.5 rounded-full border transition-colors"
              style={category === c
                ? { background: "#C9A227", color: "#12100E", borderColor: "#C9A227" }
                : { borderColor: "#3A3226", color: "#B8B0A0" }}
            >
              {c}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {products === null ? (
          <p className="text-center text-[#8A8478] py-16">Chargement du catalogue…</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {products
              .filter((p) => category === "Tout" || p.category === category)
              .map((p) => (
                <div key={p.id} className="card-hover border rounded-lg overflow-hidden flex flex-col" style={{ borderColor: "#2A241C", background: "#181512" }}>
                  <ProductImage images={p.images} name={p.name} />
                  <div className="p-3 flex flex-col gap-1 flex-1">
                    <h3 className="text-sm font-medium leading-snug">{p.name}</h3>
                    <p className="text-[11px] text-[#8A8478]">Pointures {p.sizes}</p>
                    <p className="gold serif text-base mt-1">{fcfa(p.price)}</p>
                    <button
                      disabled={!p.stock}
                      onClick={() => addToCart(p)}
                      className="mt-auto text-xs font-medium py-2 rounded"
                      style={p.stock
                        ? { background: "#C9A227", color: "#12100E" }
                        : { background: "#2A241C", color: "#6B6355", cursor: "not-allowed" }}
                    >
                      {p.stock ? "Ajouter au panier" : "Rupture de stock"}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </main>

      {showCart && (
        <CartDrawer
          cart={cart}
          total={total}
          settings={settings}
          onClose={() => setShowCart(false)}
          onChangeQty={changeQty}
          onRemove={removeFromCart}
          onOrdered={async (order) => {
            await logOrder(order);
            setCart([]);
          }}
        />
      )}

      <footer className="text-center text-[10px] text-[#5C5548] py-6">
        {settings.shopName} · Yaoundé, Cameroun
      </footer>
    </div>
  );
}

function CartDrawer({ cart, total, settings, onClose, onChangeQty, onRemove, onOrdered }) {
  const [step, setStep] = useState("cart");
  const [form, setForm] = useState({ name: "", phone: "", quartier: "" });

  function buildMessage() {
    const lines = cart.map((i) => `• ${i.name} x${i.qty} — ${fcfa(i.price * i.qty)}`).join("\n");
    return `Bonjour ${settings.shopName}, je souhaite commander :\n${lines}\n\nTotal : ${fcfa(total)}\n\nNom : ${form.name}\nTéléphone : ${form.phone}\nQuartier : ${form.quartier}`;
  }

  async function confirmOrder() {
    const message = buildMessage();
    await onOrdered({ ...form, items: cart, total, date: new Date().toISOString() });
    const url = `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex justify-end" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="w-full max-w-sm h-full flex flex-col" style={{ background: "#181512", color: "#F3ECDF" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "#2A241C" }}>
          <h2 className="serif text-lg gold">{step === "cart" ? "Votre panier" : "Vos informations"}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        {step === "cart" ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 && <p className="text-[#8A8478] text-sm">Votre panier est vide.</p>}
              {cart.map((i) => (
                <div key={i.id} className="flex items-center gap-3 border-b pb-3" style={{ borderColor: "#2A241C" }}>
                  <div className="flex-1">
                    <p className="text-sm">{i.name}</p>
                    <p className="text-xs gold">{fcfa(i.price)}</p>
                  </div>
                  <button onClick={() => onChangeQty(i.id, -1)} className="p-1 border rounded" style={{ borderColor: "#3A3226" }}><Minus size={12} /></button>
                  <span className="text-sm w-4 text-center">{i.qty}</span>
                  <button onClick={() => onChangeQty(i.id, 1)} className="p-1 border rounded" style={{ borderColor: "#3A3226" }}><Plus size={12} /></button>
                  <button onClick={() => onRemove(i.id)} className="text-[#8A8478] hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="p-4 border-t" style={{ borderColor: "#2A241C" }}>
                <div className="flex justify-between mb-3 text-sm">
                  <span>Total</span>
                  <span className="gold serif text-lg">{fcfa(total)}</span>
                </div>
                <button onClick={() => setStep("form")} className="w-full py-3 rounded font-medium" style={{ background: "#C9A227", color: "#12100E" }}>
                  Passer commande
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <button onClick={() => setStep("cart")} className="flex items-center gap-1 text-xs text-[#8A8478] mb-2"><ChevronLeft size={14} /> Retour au panier</button>
            <input placeholder="Nom complet" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full p-2 rounded text-sm" style={{ background: "#221D18", border: "1px solid #3A3226", color: "#F3ECDF" }} />
            <input placeholder="Numéro de téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full p-2 rounded text-sm" style={{ background: "#221D18", border: "1px solid #3A3226", color: "#F3ECDF" }} />
            <input placeholder="Quartier / Ville" value={form.quartier} onChange={(e) => setForm({ ...form, quartier: e.target.value })}
              className="w-full p-2 rounded text-sm" style={{ background: "#221D18", border: "1px solid #3A3226", color: "#F3ECDF" }} />
            <button
              disabled={!form.name || !form.phone}
              onClick={confirmOrder}
              className="w-full py-3 rounded font-medium mt-2 disabled:opacity-40"
              style={{ background: "#C9A227", color: "#12100E" }}
            >
              Envoyer la commande sur WhatsApp
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminPanel({ adminUnlocked, pwInput, setPwInput, pwError, onUnlock, products, settings, onSaveProduct, onDeleteProduct, onSaveSettings, onBack }) {
  const [tab, setTab] = useState("products");
  const [editing, setEditing] = useState(null);
  const [localSettings, setLocalSettings] = useState(settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => setLocalSettings(settings), [settings]);

  if (!adminUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#12100E", color: "#F3ECDF", fontFamily: "'Inter', sans-serif" }}>
        <div className="w-full max-w-xs p-6 border rounded-lg" style={{ borderColor: "#2A241C", background: "#181512" }}>
          <div className="flex justify-center mb-3"><Lock className="gold" size={28} /></div>
          <h2 className="serif text-lg text-center mb-4 gold">Accès administrateur</h2>
          <input
            type="password"
            placeholder="Mot de passe"
            value={pwInput}
            onChange={(e) => setPwInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onUnlock()}
            className="w-full p-2 rounded text-sm mb-2"
            style={{ background: "#221D18", border: "1px solid #3A3226", color: "#F3ECDF" }}
          />
          {pwError && <p className="text-xs text-red-400 mb-2">Mot de passe incorrect.</p>}
          <button onClick={onUnlock} className="w-full py-2 rounded font-medium mb-2" style={{ background: "#C9A227", color: "#12100E" }}>Se connecter</button>
          <button onClick={onBack} className="w-full text-xs text-[#8A8478]">Retour à la boutique</button>
        </div>
      </div>
    );
  }

  function blankProduct() {
    return { id: "p" + Date.now(), name: "", category: CATEGORIES[1], price: 0, sizes: "", images: [], desc: "", stock: true };
  }

  async function saveProduct(p) {
    await onSaveProduct(p);
    setEditing(null);
  }

  return (
    <div className="min-h-screen" style={{ background: "#12100E", color: "#F3ECDF", fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-3xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="serif text-xl gold">Panneau admin</h1>
          <button onClick={onBack} className="text-xs text-[#8A8478] flex items-center gap-1"><ChevronLeft size={14} /> Boutique</button>
        </div>
        <div className="flex gap-2 mb-5">
          {["products", "settings"].map((t) => (
            <button key={t} onClick={() => setTab(t)} className="text-xs px-3 py-1.5 rounded-full border"
              style={tab === t ? { background: "#C9A227", color: "#12100E", borderColor: "#C9A227" } : { borderColor: "#3A3226", color: "#B8B0A0" }}>
              {t === "products" ? "Produits" : "Réglages"}
            </button>
          ))}
        </div>

        {tab === "products" && (
          <div>
            <button onClick={() => setEditing(blankProduct())} className="mb-4 text-xs px-3 py-2 rounded font-medium" style={{ background: "#C9A227", color: "#12100E" }}>
              + Ajouter un article
            </button>
            <div className="space-y-2">
              {products.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 border rounded" style={{ borderColor: "#2A241C", background: "#181512" }}>
                  <div className="flex-1">
                    <p className="text-sm">{p.name} {!p.stock && <span className="text-red-400 text-[10px]">(rupture)</span>}</p>
                    <p className="text-[11px] text-[#8A8478]">{p.category} · {fcfa(p.price)}</p>
                  </div>
                  <button onClick={() => onSaveProduct({ ...p, stock: !p.stock })} className="text-[10px] px-2 py-1 border rounded" style={{ borderColor: "#3A3226" }}>
                    {p.stock ? "Marquer rupture" : "Remettre en stock"}
                  </button>
                  <button onClick={() => setEditing(p)} className="text-[#8A8478] hover:text-[#C9A227]"><Pencil size={14} /></button>
                  <button onClick={() => onDeleteProduct(p.id)} className="text-[#8A8478] hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>

            {editing && (
              <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
                <div className="w-full max-w-md p-5 border rounded-lg space-y-2 max-h-[85vh] overflow-y-auto" style={{ borderColor: "#2A241C", background: "#181512" }}>
                  <h3 className="serif gold mb-2">{products.some((x) => x.id === editing.id) ? "Modifier" : "Nouvel"} article</h3>
                  {[
                    ["name", "Nom de l'article"],
                    ["price", "Prix (FCFA)"],
                    ["sizes", "Tailles / Pointures (ex: 40-46)"],
                    ["desc", "Description"],
                  ].map(([field, label]) => (
                    <input
                      key={field}
                      placeholder={label}
                      value={editing[field]}
                      type={field === "price" ? "number" : "text"}
                      onChange={(e) => setEditing({ ...editing, [field]: field === "price" ? Number(e.target.value) : e.target.value })}
                      className="w-full p-2 rounded text-sm"
                      style={{ background: "#221D18", border: "1px solid #3A3226", color: "#F3ECDF" }}
                    />
                  ))}

                  <p className="text-xs text-[#8A8478] pt-1">Catégorie</p>
                  <select
                    value={editing.category}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                    className="w-full p-2 rounded text-sm"
                    style={{ background: "#221D18", border: "1px solid #3A3226", color: "#F3ECDF" }}
                  >
                    {CATEGORIES.filter((c) => c !== "Tout").map((c) => <option key={c}>{c}</option>)}
                  </select>

                  <p className="text-xs text-[#8A8478] pt-1">Images de l'article</p>
                  {(editing.images || []).map((url, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <img src={url} alt="" className="w-10 h-10 object-cover rounded" style={{ background: "#221D18" }} />
                      <input
                        placeholder={`Lien image ${i + 1} (URL)`}
                        value={url.startsWith("data:") ? "(photo importée)" : url}
                        readOnly={url.startsWith("data:")}
                        onChange={(e) => {
                          const next = [...editing.images];
                          next[i] = e.target.value;
                          setEditing({ ...editing, images: next });
                        }}
                        className="flex-1 p-2 rounded text-sm"
                        style={{ background: "#221D18", border: "1px solid #3A3226", color: "#F3ECDF" }}
                      />
                      <button
                        onClick={() => setEditing({ ...editing, images: editing.images.filter((_, j) => j !== i) })}
                        className="text-[#8A8478] hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <label
                      className="text-xs px-2 py-1.5 border rounded self-start cursor-pointer"
                      style={{ borderColor: "#C9A227", color: "#C9A227" }}
                    >
                      📷 Insérer une photo depuis l'appareil
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          const dataUrls = await Promise.all(files.map((f) => resizeImageFile(f)));
                          setEditing((cur) => ({ ...cur, images: [...(cur.images || []), ...dataUrls] }));
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <button
                      onClick={() => setEditing({ ...editing, images: [...(editing.images || []), ""] })}
                      className="text-xs px-2 py-1.5 border rounded self-start"
                      style={{ borderColor: "#3A3226", color: "#B8B0A0" }}
                    >
                      + Lien URL
                    </button>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button onClick={() => saveProduct(editing)} className="flex-1 py-2 rounded font-medium text-sm" style={{ background: "#C9A227", color: "#12100E" }}>Enregistrer</button>
                    <button onClick={() => setEditing(null)} className="flex-1 py-2 rounded font-medium text-sm border" style={{ borderColor: "#3A3226" }}>Annuler</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "settings" && (
          <div className="space-y-3 max-w-sm">
            <label className="text-xs text-[#8A8478]">Nom de la boutique</label>
            <input value={localSettings.shopName} onChange={(e) => setLocalSettings({ ...localSettings, shopName: e.target.value })}
              className="w-full p-2 rounded text-sm" style={{ background: "#221D18", border: "1px solid #3A3226", color: "#F3ECDF" }} />
            <label className="text-xs text-[#8A8478]">Numéro WhatsApp (format international, ex: 237655370404)</label>
            <input value={localSettings.whatsapp} onChange={(e) => setLocalSettings({ ...localSettings, whatsapp: e.target.value })}
              className="w-full p-2 rounded text-sm" style={{ background: "#221D18", border: "1px solid #3A3226", color: "#F3ECDF" }} />
            <button
              onClick={async () => { await onSaveSettings(localSettings); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
              className="py-2 px-4 rounded font-medium text-sm flex items-center gap-1"
              style={{ background: "#C9A227", color: "#12100E" }}
            >
              {saved ? <><Check size={14} /> Enregistré</> : "Enregistrer"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
