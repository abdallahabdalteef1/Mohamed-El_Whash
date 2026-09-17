-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users read own roles" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "admins manage roles" ON public.user_roles
FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- STORE SETTINGS (singleton)
CREATE TABLE public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'مِزْجَة للدهانات',
  latin_name text NOT NULL DEFAULT 'MAZGA · PAINT',
  tagline text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  hours text NOT NULL DEFAULT '',
  hero_title text NOT NULL DEFAULT 'قائمة الأسعار بألوان الصبغة',
  hero_subtitle text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read settings" ON public.store_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins update settings" ON public.store_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER store_settings_updated BEFORE UPDATE ON public.store_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- OFFERS
CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.offers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read offers" ON public.offers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage offers" ON public.offers FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER offers_updated BEFORE UPDATE ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CATEGORIES
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  chip_color text NOT NULL DEFAULT '#1F4FD6',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage categories" ON public.categories FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER categories_updated BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PRODUCTS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  hex_color text NOT NULL DEFAULT '#1F4FD6',
  description text NOT NULL DEFAULT '',
  is_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON public.products(category_id);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read products" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage products" ON public.products FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PRICES
CREATE TABLE public.product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size_label text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_prices_product_idx ON public.product_prices(product_id);
GRANT SELECT ON public.product_prices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_prices TO authenticated;
GRANT ALL ON public.product_prices TO service_role;
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read prices" ON public.product_prices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage prices" ON public.product_prices FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER product_prices_updated BEFORE UPDATE ON public.product_prices
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SEED
INSERT INTO public.store_settings (name, latin_name, tagline, phone, address, hours, hero_title, hero_subtitle)
VALUES ('مِزْجَة للدهانات','MAZGA · PAINT','دهانات وتشطيبات','0100 123 4567','٢٣ شارع الجمهورية، طنطا','مفتوح ٩ص–٩م','قائمة الأسعار بألوان الصبغة','كل صنف له شريحة لون حقيقية. الأسعار بالجنيه المصري، محدّثة من المحل مباشرة.');

INSERT INTO public.offers (text, is_active, sort_order) VALUES
('خصم ١٥٪ على الدهانات الداخلية', true, 1),
('توصيل مجاني للطلبات فوق ١٥٠٠ ج.م', true, 2),
('أسعار الجملة متاحة للنجارين', true, 3);

INSERT INTO public.categories (id, name, slug, chip_color, sort_order) VALUES
('11111111-1111-1111-1111-111111111111','داخلية','interior','#1F4FD6',1),
('22222222-2222-2222-2222-222222222222','خارجية','exterior','#F2A900',2),
('33333333-3333-3333-3333-333333333333','خشب ومعدن','wood-metal','#5B3A24',3),
('44444444-4444-4444-4444-444444444444','أساسات','primers','#7A1F57',4),
('55555555-5555-5555-5555-555555555555','أدوات','tools','#37B6E0',5);

INSERT INTO public.products (id, category_id, name, hex_color, description, sort_order) VALUES
('aaaaaaa1-0000-4000-8000-000000000001','11111111-1111-1111-1111-111111111111','أزرق ملكي ساتان','#1F4FD6','تغطية ١٢ م²/لتر · لمعة منخفضة',1),
('aaaaaaa1-0000-4000-8000-000000000002','11111111-1111-1111-1111-111111111111','كريمي مطفي','#F3E9CF','تغطية ١٤ م²/لتر · بلا لمعة',2),
('aaaaaaa1-0000-4000-8000-000000000003','11111111-1111-1111-1111-111111111111','أخضر نعناعي','#1F9D57','تغطية ١٣ م²/لتر · قابل للغسل',3),
('aaaaaaa1-0000-4000-8000-000000000004','22222222-2222-2222-2222-222222222222','واجهات فينيليك','#37B6E0','مقاوم للشمس والرطوبة',1),
('aaaaaaa1-0000-4000-8000-000000000005','33333333-3333-3333-3333-333333333333','لاكيه خشب بني','#5B3A24','لمعة عالية · للأبواب والشبابيك',1),
('aaaaaaa1-0000-4000-8000-000000000006','44444444-4444-4444-4444-444444444444','أساس لاصق أصفر','#F2A900','لأسطح الجبس · تجفيف ٢س',1),
('aaaaaaa1-0000-4000-8000-000000000007','44444444-4444-4444-4444-444444444444','أساس مضاد للصدأ','#7A1F57','للمعادن · مقاوم للرطوبة',2),
('aaaaaaa1-0000-4000-8000-000000000008','55555555-5555-5555-5555-555555555555','رولة دهان ٢٣سم','#D8CDB6','وبر متوسط · مقبض خشب',1);

INSERT INTO public.product_prices (product_id, size_label, price, sort_order) VALUES
('aaaaaaa1-0000-4000-8000-000000000001','١ لتر',145,1),
('aaaaaaa1-0000-4000-8000-000000000001','٤ لتر',490,2),
('aaaaaaa1-0000-4000-8000-000000000001','١٦ لتر',1750,3),
('aaaaaaa1-0000-4000-8000-000000000002','١ لتر',120,1),
('aaaaaaa1-0000-4000-8000-000000000002','٤ لتر',420,2),
('aaaaaaa1-0000-4000-8000-000000000002','١٦ لتر',1500,3),
('aaaaaaa1-0000-4000-8000-000000000003','١ لتر',155,1),
('aaaaaaa1-0000-4000-8000-000000000003','٤ لتر',520,2),
('aaaaaaa1-0000-4000-8000-000000000003','١٦ لتر',1900,3),
('aaaaaaa1-0000-4000-8000-000000000004','٤ لتر',600,1),
('aaaaaaa1-0000-4000-8000-000000000004','١٨ لتر',1950,2),
('aaaaaaa1-0000-4000-8000-000000000005','١ لتر',180,1),
('aaaaaaa1-0000-4000-8000-000000000005','٤ لتر',640,2),
('aaaaaaa1-0000-4000-8000-000000000006','١ لتر',95,1),
('aaaaaaa1-0000-4000-8000-000000000006','٤ لتر',340,2),
('aaaaaaa1-0000-4000-8000-000000000006','١٦ لتر',1250,3),
('aaaaaaa1-0000-4000-8000-000000000007','١ لتر',130,1),
('aaaaaaa1-0000-4000-8000-000000000007','٤ لتر',470,2),
('aaaaaaa1-0000-4000-8000-000000000007','١٦ لتر',1680,3),
('aaaaaaa1-0000-4000-8000-000000000008','قطعة',85,1);