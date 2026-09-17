import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StoreSettings = {
  id: string;
  name: string;
  latin_name: string;
  tagline: string;
  phone: string;
  address: string;
  hours: string;
  hero_title: string;
  hero_subtitle: string;
};

export type Offer = {
  id: string;
  text: string;
  is_active: boolean;
  sort_order: number;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  chip_color: string;
  sort_order: number;
};

export type Price = {
  id: string;
  product_id: string;
  size_label: string;
  price: number;
  sort_order: number;
};

export type Product = {
  id: string;
  category_id: string;
  name: string;
  hex_color: string;
  description: string;
  is_available: boolean;
  sort_order: number;
  product_prices: Price[];
};

export const settingsQuery = queryOptions({
  queryKey: ["store_settings"],
  queryFn: async (): Promise<StoreSettings | null> => {
    const { data, error } = await supabase
      .from("store_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as StoreSettings | null;
  },
});

export const offersQuery = queryOptions({
  queryKey: ["offers"],
  queryFn: async (): Promise<Offer[]> => {
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Offer[];
  },
});

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Category[];
  },
});

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from("products")
      .select("*, product_prices(*)")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as Product[]).map((p) => ({
      ...p,
      product_prices: [...(p.product_prices ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
      ),
    }));
  },
});

export function formatPrice(value: number) {
  return new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(value);
}
