import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession, useIsAdmin } from "@/hooks/use-admin";
import {
  categoriesQuery,
  offersQuery,
  productsQuery,
  settingsQuery,
  type StoreSettings,
} from "@/lib/menu-data";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم — مِزْجَة للدهانات" },
      { name: "description", content: "تعديل أسعار الدهانات والعروض وبيانات المحل." },
      { property: "og:title", content: "لوحة التحكم — مِزْجَة للدهانات" },
      { property: "og:description", content: "إدارة قائمة الأسعار والعروض." },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: AdminPage,
});

const fieldClass =
  "w-full rounded-xl bg-cream/10 px-3 py-2 text-[13px] text-cream outline-none ring-1 ring-cream/20 placeholder:text-cream/40";

function AdminPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuthSession();
  const isAdmin = useIsAdmin(session);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return <Shell>جاري التحميل…</Shell>;
  }

  if (isAdmin === null) {
    return <Shell>جاري التحقق من الصلاحيات…</Shell>;
  }

  if (!isAdmin) {
    return (
      <Shell>
        <p>الحساب ده مش مسؤول عن المحل. كلّم صاحب المحل عشان يضيفك.</p>
        <SignOutButton />
      </Shell>
    );
  }

  return <AdminDashboard />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      dir="rtl"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center font-body text-sm text-muted-foreground"
    >
      {children}
    </div>
  );
}

function SignOutButton() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return (
    <button
      onClick={async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        await supabase.auth.signOut();
        navigate({ to: "/auth", replace: true });
      }}
      className="rounded-xl bg-ink px-4 py-2 text-[13px] font-bold text-cream"
    >
      تسجيل الخروج
    </button>
  );
}

function AdminDashboard() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"prices" | "offers" | "info">("prices");

  const { data: settings } = useQuery(settingsQuery);
  const { data: offers = [] } = useQuery(offersQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: products = [] } = useQuery(productsQuery);

  const refresh = () => {
    queryClient.invalidateQueries();
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-16 font-body">
      <header className="sticky top-0 z-40 flex items-center gap-3 bg-ink px-4 py-3 text-cream">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/60">
            لوحة الإدارة
          </div>
          <div className="font-display text-lg font-extrabold">{settings?.name}</div>
        </div>
        <Link to="/" className="ms-auto text-[12px] underline">
          عرض القائمة
        </Link>
        <SignOutButton />
      </header>

      <div className="flex gap-2 px-4 py-3 text-[12px] font-bold">
        {(
          [
            ["prices", "الأصناف والأسعار"],
            ["offers", "العروض"],
            ["info", "بيانات المحل"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="rounded-full px-3 py-1.5"
            style={{
              backgroundColor: tab === key ? "var(--ink)" : "var(--paper)",
              color: tab === key ? "var(--cream)" : "var(--muted-foreground)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <main className="px-4">
        {tab === "prices" && (
          <PricesTab categories={categories} products={products} onChange={refresh} />
        )}
        {tab === "offers" && <OffersTab offers={offers} onChange={refresh} />}
        {tab === "info" && settings && <InfoTab settings={settings} onChange={refresh} />}
      </main>
    </div>
  );
}

/* ---------------- Prices ---------------- */

function PricesTab({
  categories,
  products,
  onChange,
}: {
  categories: Array<{ id: string; name: string; chip_color: string }>;
  products: Array<{
    id: string;
    category_id: string;
    name: string;
    hex_color: string;
    description: string;
    is_available: boolean;
    product_prices: Array<{ id: string; size_label: string; price: number }>;
  }>;
  onChange: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState(categories[0]?.id ?? "");
  const [newColor, setNewColor] = useState("#1f4fd6");

  async function addProduct() {
    if (!newName.trim() || !newCategory) {
      toast.error("اكتب اسم الصنف واختر القسم.");
      return;
    }
    const { error } = await supabase.from("products").insert({
      name: newName.trim().slice(0, 80),
      category_id: newCategory,
      hex_color: newColor,
      sort_order: products.length + 1,
    });
    if (error) { toast.error(error.message); return; }
    setNewName("");
    toast.success("تمت إضافة الصنف.");
    onChange();
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-3xl bg-ink p-4 text-cream">
        <h2 className="font-display text-lg font-extrabold">إضافة صنف جديد</h2>
        <div className="mt-3 grid gap-2">
          <input
            className={fieldClass}
            placeholder="اسم الصنف"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <select
            className={fieldClass}
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="text-ink">
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-10 w-14 rounded-lg bg-transparent"
            />
            <button
              onClick={addProduct}
              className="flex-1 rounded-xl bg-mustard px-4 py-2.5 text-[13px] font-extrabold text-ink"
            >
              إضافة
            </button>
          </div>
        </div>
      </div>

      {categories.map((cat) => {
        const items = products.filter((p) => p.category_id === cat.id);
        if (items.length === 0) return null;
        return (
          <section key={cat.id}>
            <h2 className="font-display text-lg font-extrabold">{cat.name}</h2>
            <div className="mt-2 grid gap-3">
              {items.map((product) => (
                <ProductEditor key={product.id} product={product} onChange={onChange} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ProductEditor({
  product,
  onChange,
}: {
  product: {
    id: string;
    name: string;
    hex_color: string;
    description: string;
    is_available: boolean;
    product_prices: Array<{ id: string; size_label: string; price: number }>;
  };
  onChange: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [color, setColor] = useState(product.hex_color);
  const [available, setAvailable] = useState(product.is_available);
  const [prices, setPrices] = useState(product.product_prices);
  const [newSize, setNewSize] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("products")
      .update({
        name: name.trim().slice(0, 80),
        description: description.trim().slice(0, 160),
        hex_color: color,
        is_available: available,
      })
      .eq("id", product.id);

    for (const price of prices) {
      const original = product.product_prices.find((p) => p.id === price.id);
      if (original && (original.price !== price.price || original.size_label !== price.size_label)) {
        await supabase
          .from("product_prices")
          .update({ price: price.price, size_label: price.size_label.slice(0, 30) })
          .eq("id", price.id);
      }
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("اتحفظ.");
    onChange();
  }

  async function addPrice() {
    const value = Number(newPrice);
    if (!newSize.trim() || !Number.isFinite(value) || value < 0) {
      toast.error("اكتب المقاس والسعر صح.");
      return;
    }
    const { error } = await supabase.from("product_prices").insert({
      product_id: product.id,
      size_label: newSize.trim().slice(0, 30),
      price: value,
      sort_order: prices.length + 1,
    });
    if (error) { toast.error(error.message); return; }
    setNewSize("");
    setNewPrice("");
    onChange();
  }

  async function removePrice(id: string) {
    const { error } = await supabase.from("product_prices").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setPrices((prev) => prev.filter((p) => p.id !== id));
    onChange();
  }

  async function removeProduct() {
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم حذف الصنف.");
    onChange();
  }

  return (
    <div className="rounded-3xl bg-ink p-4 text-cream">
      <div className="flex items-center gap-3">
        <span
          className="h-10 w-10 shrink-0 rounded-xl ring-1 ring-cream/20"
          style={{ backgroundColor: color }}
        />
        <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <input
        className={`${fieldClass} mt-2`}
        value={description}
        placeholder="الوصف"
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="mt-2 flex items-center gap-3 text-[12px]">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-9 w-12 rounded-lg bg-transparent"
        />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
          />
          متاح للعرض
        </label>
      </div>

      <div className="mt-3 grid gap-2">
        {prices.map((price) => (
          <div key={price.id} className="flex items-center gap-2 rounded-xl bg-cream/10 p-2">
            <input
              className="w-24 rounded-lg bg-transparent px-2 py-1 text-[13px] outline-none ring-1 ring-cream/20"
              value={price.size_label}
              onChange={(e) =>
                setPrices((prev) =>
                  prev.map((p) =>
                    p.id === price.id ? { ...p, size_label: e.target.value } : p,
                  ),
                )
              }
            />
            <input
              type="number"
              min={0}
              className="w-20 rounded-lg bg-cream px-2 py-1 text-center font-mono text-[13px] text-ink"
              value={price.price}
              onChange={(e) =>
                setPrices((prev) =>
                  prev.map((p) =>
                    p.id === price.id ? { ...p, price: Number(e.target.value) } : p,
                  ),
                )
              }
            />
            <button
              onClick={() => removePrice(price.id)}
              className="ms-auto text-[12px] text-cream/60 underline"
            >
              حذف
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <input
            className={fieldClass}
            placeholder="مقاس جديد (مثال: ٤ لتر)"
            value={newSize}
            onChange={(e) => setNewSize(e.target.value)}
          />
          <input
            type="number"
            min={0}
            className="w-24 rounded-xl bg-cream px-2 py-2 text-center font-mono text-[13px] text-ink"
            placeholder="السعر"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
          />
          <button onClick={addPrice} className="rounded-xl bg-cream/10 px-3 py-2 text-[13px]">
            +
          </button>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 rounded-xl bg-mustard px-4 py-2.5 text-[13px] font-extrabold text-ink disabled:opacity-60"
        >
          {saving ? "جاري الحفظ…" : "حفظ التغييرات"}
        </button>
        <button
          onClick={removeProduct}
          className="rounded-xl bg-cream/10 px-4 py-2.5 text-[13px] font-bold ring-1 ring-cream/20"
        >
          حذف الصنف
        </button>
      </div>
    </div>
  );
}

/* ---------------- Offers ---------------- */

function OffersTab({
  offers,
  onChange,
}: {
  offers: Array<{ id: string; text: string; is_active: boolean }>;
  onChange: () => void;
}) {
  const [text, setText] = useState("");

  async function addOffer() {
    if (!text.trim()) { toast.error("اكتب نص العرض."); return; }
    const { error } = await supabase
      .from("offers")
      .insert({ text: text.trim().slice(0, 120), sort_order: offers.length + 1 });
    if (error) { toast.error(error.message); return; }
    setText("");
    onChange();
  }

  async function toggle(id: string, value: boolean) {
    const { error } = await supabase.from("offers").update({ is_active: value }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    onChange();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("offers").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    onChange();
  }

  return (
    <div className="rounded-3xl bg-ink p-4 text-cream">
      <h2 className="font-display text-lg font-extrabold">الشريط العلوي للعروض</h2>
      <p className="mt-1 text-[12px] text-cream/70">
        العروض المفعّلة بس هي اللي بتظهر في الشريط الأحمر أعلى الموقع.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          className={fieldClass}
          placeholder="مثال: خصم ١٥٪ على الدهانات الداخلية"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          onClick={addOffer}
          className="rounded-xl bg-mustard px-4 py-2 text-[13px] font-extrabold text-ink"
        >
          إضافة
        </button>
      </div>
      <div className="mt-3 grid gap-2">
        {offers.map((offer) => (
          <div key={offer.id} className="flex items-center gap-2 rounded-xl bg-cream/10 p-2">
            <label className="flex items-center gap-2 text-[12px]">
              <input
                type="checkbox"
                checked={offer.is_active}
                onChange={(e) => toggle(offer.id, e.target.checked)}
              />
              مفعّل
            </label>
            <span className="flex-1 text-[13px] font-bold">{offer.text}</span>
            <button
              onClick={() => remove(offer.id)}
              className="text-[12px] text-cream/60 underline"
            >
              حذف
            </button>
          </div>
        ))}
        {offers.length === 0 && (
          <p className="text-[12px] text-cream/60">مفيش عروض دلوقتي.</p>
        )}
      </div>
    </div>
  );
}

/* ---------------- Store info ---------------- */

function InfoTab({
  settings,
  onChange,
}: {
  settings: StoreSettings;
  onChange: () => void;
}) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("store_settings")
      .update({
        name: form.name.trim().slice(0, 60),
        latin_name: form.latin_name.trim().slice(0, 60),
        tagline: form.tagline.trim().slice(0, 100),
        phone: form.phone.trim().slice(0, 30),
        address: form.address.trim().slice(0, 120),
        hours: form.hours.trim().slice(0, 60),
        hero_title: form.hero_title.trim().slice(0, 100),
        hero_subtitle: form.hero_subtitle.trim().slice(0, 240),
      })
      .eq("id", settings.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("اتحفظت بيانات المحل.");
    onChange();
  }

  const fields: Array<[keyof StoreSettings, string]> = [
    ["name", "اسم المحل"],
    ["latin_name", "الاسم باللاتيني"],
    ["tagline", "وصف قصير"],
    ["phone", "رقم التليفون"],
    ["address", "العنوان"],
    ["hours", "مواعيد العمل"],
    ["hero_title", "عنوان الصفحة الرئيسية"],
    ["hero_subtitle", "الجملة التعريفية"],
  ];

  return (
    <div className="rounded-3xl bg-ink p-4 text-cream">
      <h2 className="font-display text-lg font-extrabold">بيانات المحل</h2>
      <div className="mt-3 grid gap-2">
        {fields.map(([key, label]) => (
          <label key={key} className="grid gap-1">
            <span className="text-[11px] text-cream/60">{label}</span>
            <input
              className={fieldClass}
              value={String(form[key] ?? "")}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </label>
        ))}
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="mt-4 w-full rounded-xl bg-mustard px-4 py-3 text-[14px] font-extrabold text-ink disabled:opacity-60"
      >
        {saving ? "جاري الحفظ…" : "حفظ البيانات"}
      </button>
    </div>
  );
}
