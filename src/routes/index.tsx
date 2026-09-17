import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  categoriesQuery,
  formatPrice,
  offersQuery,
  productsQuery,
  settingsQuery,
  type Product,
} from "@/lib/menu-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "مِزْجَة للدهانات — قائمة الأسعار" },
      {
        name: "description",
        content:
          "قائمة أسعار محدثة لدهانات الحوائط والخشب والمعدن والأساسات، بشرائح ألوان حقيقية وأسعار بالجنيه المصري.",
      },
      { property: "og:title", content: "مِزْجَة للدهانات — قائمة الأسعار" },
      {
        property: "og:description",
        content: "أسعار الدهانات والأساسات والأدوات محدثة أولاً بأول مع عروض المحل.",
      },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(settingsQuery),
      context.queryClient.ensureQueryData(offersQuery),
      context.queryClient.ensureQueryData(categoriesQuery),
      context.queryClient.ensureQueryData(productsQuery),
    ]);
  },
  errorComponent: ({ error }) => (
    <div className="p-6 text-center text-sm text-muted-foreground" role="alert">
      تعذّر تحميل القائمة: {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-6 text-center">لا توجد أصناف بعد.</div>,
  component: MenuPage,
});

function ProductCard({ product, delay }: { product: Product; delay: number }) {
  return (
    <div
      className="rise rounded-2xl bg-paper p-3 ring-1 ring-foreground/5 transition-transform duration-200 hover:-translate-y-1"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3">
        <div
          className="h-16 w-16 shrink-0 rounded-xl outline-1 -outline-offset-1 outline-black/10"
          style={{ backgroundColor: product.hex_color }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold">{product.name}</span>
            <span className="font-mono text-[10px] text-muted-foreground" dir="ltr">
              {product.hex_color.toUpperCase()}
            </span>
          </div>
          <div className="text-[12px] text-muted-foreground">{product.description}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
            {product.product_prices.map((price) => (
              <span key={price.id} className="rounded bg-background px-1.5 py-0.5 font-mono">
                {price.size_label} {formatPrice(price.price)}
              </span>
            ))}
            {product.product_prices.length === 0 && (
              <span className="text-muted-foreground">السعر عند الطلب</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuPage() {
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const { data: offers } = useSuspenseQuery(offersQuery);
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const { data: products } = useSuspenseQuery(productsQuery);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const activeOffers = offers.filter((o) => o.is_active);

  const visible = useMemo(() => {
    const term = search.trim();
    return products.filter((p) => {
      if (!p.is_available) return false;
      if (activeCategory && p.category_id !== activeCategory) return false;
      if (!term) return true;
      return (
        p.name.includes(term) ||
        p.description.includes(term) ||
        p.hex_color.toLowerCase().includes(term.toLowerCase()) ||
        p.product_prices.some((pr) => pr.size_label.includes(term))
      );
    });
  }, [products, search, activeCategory]);

  let delay = 0;

  return (
    <div dir="rtl" className="min-h-screen bg-background font-body text-foreground">
      {activeOffers.length > 0 && (
        <div className="overflow-hidden bg-primary py-2 text-primary-foreground">
          <div className="marquee flex w-max gap-10 whitespace-nowrap text-[13px] font-extrabold">
            {[...activeOffers, ...activeOffers].map((offer, i) => (
              <span key={`${offer.id}-${i}`} className="flex items-center gap-10">
                {offer.text}
                <span>✦</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-background/95 ring-1 ring-foreground/5 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-display text-xl font-black text-primary-foreground">
            {settings?.name?.trim().charAt(0) ?? "م"}
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-extrabold">{settings?.name}</div>
            <div className="font-mono text-[11px] text-muted-foreground" dir="ltr">
              {settings?.latin_name}
            </div>
          </div>
          <span className="ms-auto rounded-lg bg-mustard/20 px-2 py-1 text-[11px] font-bold text-ink">
            {formatPrice(products.length)} صنف
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 pb-3 text-[11px] text-muted-foreground">
          <span className="font-mono" dir="ltr">
            {settings?.phone}
          </span>
          <span className="text-line">|</span>
          <span>{settings?.address}</span>
          <span className="ms-auto font-mono">{settings?.hours}</span>
        </div>
      </header>

      <main className="px-4 pt-6 pb-10">
        <h1 className="rise text-balance font-display text-[34px] font-black leading-[1.05]">
          {settings?.hero_title}
        </h1>
        <p className="rise mt-2 max-w-[40ch] text-pretty text-[14px] text-muted-foreground [animation-delay:80ms]">
          {settings?.hero_subtitle}
        </p>

        <div className="rise mt-4 flex items-center gap-2 rounded-2xl bg-paper px-3 py-2 ring-1 ring-foreground/5 [animation-delay:120ms]">
          <span className="text-sm text-muted-foreground">⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value.slice(0, 60))}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="ابحث عن لون أو مقاس…"
          />
        </div>

        <div className="sticky top-[104px] z-30 -mx-4 mt-3 overflow-x-auto bg-background/95 px-4 py-2 backdrop-blur">
          <div className="flex gap-2 whitespace-nowrap text-[12px] font-bold">
            <button
              onClick={() => setActiveCategory(null)}
              className="rounded-full px-3 py-1.5"
              style={{
                backgroundColor: activeCategory === null ? "var(--ink)" : "var(--paper)",
                color: activeCategory === null ? "var(--cream)" : "var(--muted-foreground)",
              }}
            >
              الكل
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="rounded-full px-3 py-1.5"
                style={{
                  backgroundColor: activeCategory === cat.id ? cat.chip_color : "var(--paper)",
                  color:
                    activeCategory === cat.id ? "var(--paper)" : "var(--muted-foreground)",
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {categories.map((cat, index) => {
          const items = visible.filter((p) => p.category_id === cat.id);
          if (items.length === 0) return null;
          return (
            <section key={cat.id}>
              <div className="mt-6 flex items-baseline gap-2">
                <h2 className="font-display text-xl font-extrabold">{cat.name}</h2>
                <span className="font-mono text-[11px] text-muted-foreground">
                  ({String.fromCharCode(97 + index)})
                </span>
              </div>
              <div className="mt-3 grid gap-3">
                {items.map((product) => {
                  delay += 60;
                  return <ProductCard key={product.id} product={product} delay={delay} />;
                })}
              </div>
            </section>
          );
        })}

        {visible.length === 0 && (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            مفيش نتائج مطابقة للبحث.
          </p>
        )}
      </main>

      <footer className="border-t border-line px-4 py-6 text-center">
        <div className="font-display text-[13px] font-bold">{settings?.name}</div>
        <div className="mt-1 font-mono text-[11px] text-muted-foreground">
          {settings?.address}
        </div>
        <Link
          to="/admin"
          className="mt-3 inline-block font-mono text-[11px] text-muted-foreground underline"
        >
          دخول الإدارة
        </Link>
      </footer>
    </div>
  );
}
