// Customa product catalog — the single source of truth for what a customer
// can compose. Prices are in THB. The server recomputes every price from this
// file, so the client can never set its own price.

export type L10n = { en: string; th: string };

export type Profile = {
  fresh: number;
  herbal: number;
  spicy: number;
  sweet: number;
  whitening: number;
  gum: number;
};

export type HerbShape =
  | "mint"
  | "leaf"
  | "neem"
  | "clove"
  | "turmeric"
  | "cinnamon"
  | "salt"
  | "stalk"
  | "slice"
  | "berry";

export type Base = {
  id: string;
  name: L10n;
  note: L10n;
  color: string;
  price: number;
  profile: Partial<Profile>;
};

export type Herb = {
  id: string;
  no: number;
  name: L10n;
  latin: string;
  benefit: L10n;
  color: string; // tint it gives the paste
  leaf: string; // color of the 3D object
  shape: HerbShape;
  price: number; // per intensity level
  profile: Partial<Profile>;
};

export type Booster = {
  id: string;
  name: L10n;
  note: L10n;
  price: number;
  profile: Partial<Profile>;
};

export const BASES: Base[] = [
  {
    id: "calcium",
    name: { en: "Calcium Carbonate", th: "แคลเซียมคาร์บอเนต" },
    note: { en: "Classic, gentle polish", th: "เนื้อคลาสสิก ขัดเบาๆ" },
    color: "#f4f1ea",
    price: 0,
    profile: { whitening: 1 },
  },
  {
    id: "silica",
    name: { en: "Hydrated Silica", th: "ไฮเดรตซิลิกา" },
    note: { en: "Smooth gel, low abrasion", th: "เจลเนียน ถนอมเคลือบฟัน" },
    color: "#e8efe9",
    price: 20,
    profile: { gum: 1 },
  },
  {
    id: "soda",
    name: { en: "Baking Soda", th: "เบกกิ้งโซดา" },
    note: { en: "Lifts surface stains", th: "ขจัดคราบ ฟันดูขาวสะอาด" },
    color: "#fbfaf6",
    price: 20,
    profile: { whitening: 3, fresh: 1 },
  },
  {
    id: "charcoal",
    name: { en: "Bamboo Charcoal", th: "ถ่านไม้ไผ่" },
    note: { en: "Polishes off surface stains", th: "ขัดคราบบนผิวฟัน" },
    color: "#2b2a28",
    price: 40,
    profile: { whitening: 2 },
  },
];

export const HERBS: Herb[] = [
  {
    id: "mint",
    no: 1,
    name: { en: "Peppermint", th: "สะระแหน่" },
    latin: "Mentha piperita",
    benefit: { en: "Cooling, fresh breath", th: "เย็นสดชื่น ลมหายใจหอม" },
    color: "#a9d8b8",
    leaf: "#4f8a5b",
    shape: "mint",
    price: 15,
    profile: { fresh: 3 },
  },
  {
    id: "clove",
    no: 2,
    name: { en: "Clove", th: "กานพลู" },
    latin: "Syzygium aromaticum",
    benefit: { en: "Warm clove spice", th: "รสเผ็ดอุ่นของกานพลู" },
    color: "#c9a27e",
    leaf: "#5a3a26",
    shape: "clove",
    price: 20,
    profile: { spicy: 2, herbal: 2, gum: 1 },
  },
  {
    id: "turmeric",
    no: 3,
    name: { en: "Thai Turmeric", th: "ขมิ้นชัน" },
    latin: "Curcuma longa",
    benefit: { en: "Earthy, golden herbal", th: "สมุนไพรรสนุ่มลึก สีทอง" },
    color: "#f1c75a",
    leaf: "#d98a1c",
    shape: "turmeric",
    price: 20,
    profile: { herbal: 2, gum: 3 },
  },
  {
    id: "neem",
    no: 4,
    name: { en: "Neem", th: "สะเดา" },
    latin: "Azadirachta indica",
    benefit: { en: "Bold, bitter-herbal clean", th: "สมุนไพรขมเข้ม สะอาดสดชื่น" },
    color: "#b7cf97",
    leaf: "#3f6b34",
    shape: "neem",
    price: 20,
    profile: { herbal: 3, gum: 2 },
  },
  {
    id: "guava",
    no: 5,
    name: { en: "Guava Leaf", th: "ใบฝรั่ง" },
    latin: "Psidium guajava",
    benefit: { en: "Green, gently tart", th: "หอมใบไม้สด ฝาดนิดๆ" },
    color: "#c4d8a4",
    leaf: "#6e8f45",
    shape: "leaf",
    price: 15,
    profile: { herbal: 2, gum: 2 },
  },
  {
    id: "salt",
    no: 6,
    name: { en: "Sea Salt", th: "เกลือสมุทร" },
    latin: "Sal marinum",
    benefit: { en: "Thai-classic clean taste", th: "รสเค็มสะอาดแบบไทยดั้งเดิม" },
    color: "#f2f2ee",
    leaf: "#e9ecef",
    shape: "salt",
    price: 10,
    profile: { fresh: 1, gum: 1, whitening: 1 },
  },
  {
    id: "cinnamon",
    no: 7,
    name: { en: "Cinnamon", th: "อบเชย" },
    latin: "Cinnamomum verum",
    benefit: { en: "Warm spice, fresh breath", th: "อุ่นๆ ลมหายใจหอม" },
    color: "#d7a982",
    leaf: "#8a4b26",
    shape: "cinnamon",
    price: 20,
    profile: { spicy: 2, sweet: 1 },
  },
  {
    id: "licorice",
    no: 8,
    name: { en: "Licorice Root", th: "ชะเอมเทศ" },
    latin: "Glycyrrhiza glabra",
    benefit: { en: "Natural sweetness", th: "หวานธรรมชาติ ไม่ใช้น้ำตาล" },
    color: "#e2c79a",
    leaf: "#a5733f",
    shape: "stalk",
    price: 15,
    profile: { sweet: 3 },
  },
  {
    id: "lemongrass",
    no: 9,
    name: { en: "Lemongrass", th: "ตะไคร้" },
    latin: "Cymbopogon citratus",
    benefit: { en: "Citrus zing, deodorizing", th: "หอมซิตรัส ดับกลิ่น" },
    color: "#dfe7a8",
    leaf: "#8aa64a",
    shape: "stalk",
    price: 15,
    profile: { fresh: 2, herbal: 1 },
  },
  {
    id: "ginger",
    no: 10,
    name: { en: "Ginger", th: "ขิง" },
    latin: "Zingiber officinale",
    benefit: { en: "Warm, zesty kick", th: "อุ่น เผ็ดสดชื่น" },
    color: "#ecd8a6",
    leaf: "#c9a35f",
    shape: "slice",
    price: 15,
    profile: { spicy: 3 },
  },
  {
    id: "mangosteen",
    no: 11,
    name: { en: "Mangosteen Peel", th: "เปลือกมังคุด" },
    latin: "Garcinia mangostana",
    benefit: { en: "Mild, fruity-astringent", th: "ฝาดอ่อนๆ จากผลไม้ไทย" },
    color: "#c9a3b4",
    leaf: "#5b2437",
    shape: "berry",
    price: 25,
    profile: { gum: 3, herbal: 1 },
  },
  {
    id: "greentea",
    no: 12,
    name: { en: "Green Tea", th: "ชาเขียว" },
    latin: "Camellia sinensis",
    benefit: { en: "Catechins, fresh finish", th: "คาเทชิน สดชื่นยาวนาน" },
    color: "#bcd59a",
    leaf: "#557a2f",
    shape: "leaf",
    price: 20,
    profile: { fresh: 2, gum: 1 },
  },
];

export const BOOSTERS: Booster[] = [
  {
    id: "xylitol",
    name: { en: "Birch Xylitol", th: "ไซลิทอลจากเบิร์ช" },
    note: { en: "Sugar-free birch sweetness", th: "หวานจากไม้เบิร์ช ไม่ใช้น้ำตาล" },
    price: 25,
    profile: { sweet: 1 },
  },
  {
    id: "nha",
    name: { en: "Nano-Hydroxyapatite", th: "นาโนไฮดรอกซีอะพาไทต์" },
    note: { en: "Fluoride-free, smooth feel", th: "ไม่ใช้ฟลูออไรด์ ผิวฟันลื่นเรียบ" },
    price: 60,
    profile: { whitening: 1 },
  },
  {
    id: "fluoride",
    name: { en: "Sodium Fluoride 1000ppm", th: "ฟลูออไรด์ 1000ppm" },
    note: { en: "Classic cavity protection", th: "ป้องกันฟันผุแบบมาตรฐาน" },
    price: 0,
    profile: {},
  },
  {
    id: "coconut",
    name: { en: "Virgin Coconut Oil", th: "น้ำมันมะพร้าวสกัดเย็น" },
    note: { en: "Oil-pull smoothness", th: "เนื้อนุ่ม ชุ่มชื้น" },
    price: 20,
    profile: { sweet: 1, gum: 1 },
  },
];

export type Size = { id: "50" | "100"; grams: number; price: number };
export const SIZES: Size[] = [
  { id: "50", grams: 50, price: 220 },
  { id: "100", grams: 100, price: 360 },
];

export type PaperFinish = {
  id: string;
  name: L10n;
  color: string;
  fiber: string; // fleck color for the procedural paper texture
  price: number;
};

export const TUBE_PAPERS: PaperFinish[] = [
  { id: "kraft", name: { en: "Natural Kraft", th: "คราฟท์ธรรมชาติ" }, color: "#c8a77c", fiber: "#8d6a43", price: 0 },
  { id: "unbleached", name: { en: "Unbleached Ivory", th: "งาช้างไม่ฟอกสี" }, color: "#ece3d2", fiber: "#b9a98a", price: 0 },
  { id: "sage", name: { en: "Sage Pulp", th: "เยื่อสีเสจ" }, color: "#b8c4a8", fiber: "#7d8c6c", price: 10 },
  { id: "ink", name: { en: "Charcoal Pulp", th: "เยื่อสีถ่าน" }, color: "#3b3936", fiber: "#5f5b55", price: 10 },
];

export const CAPS = [
  { id: "bamboo", name: { en: "Bamboo Cap", th: "ฝาไม้ไผ่" }, color: "#d8b47a", price: 15 },
  { id: "paper", name: { en: "Moulded Paper Cap", th: "ฝากระดาษอัด" }, color: "#e9e1d0", price: 0 },
  { id: "cork", name: { en: "Cork Cap", th: "ฝาไม้ก๊อก" }, color: "#b98b5b", price: 15 },
] as const;

export type BoxShape = "tuck" | "sleeve" | "cylinder";

export const BOX_SHAPES: { id: BoxShape; name: L10n; note: L10n; price: number }[] = [
  { id: "tuck", name: { en: "Tuck-end Box", th: "กล่องฝาเสียบ" }, note: { en: "Classic, flat-packs, zero glue", th: "คลาสสิก พับได้ ไม่ใช้กาว" }, price: 0 },
  { id: "sleeve", name: { en: "Slide Sleeve", th: "กล่องสวมสไลด์" }, note: { en: "Drawer + sleeve, gift-ready", th: "ลิ้นชัก+ปลอก เหมาะเป็นของขวัญ" }, price: 35 },
  { id: "cylinder", name: { en: "Paper Cylinder", th: "กระบอกกระดาษ" }, note: { en: "Rolled tube with lid", th: "กระบอกม้วนพร้อมฝา" }, price: 45 },
];

export const BOX_PAPERS: PaperFinish[] = [
  { id: "kraft", name: { en: "Recycled Kraft", th: "คราฟท์รีไซเคิล" }, color: "#bf9a6c", fiber: "#7d5a35", price: 0 },
  { id: "seed", name: { en: "Plantable Seed Paper", th: "กระดาษฝังเมล็ดพันธุ์" }, color: "#efe8d8", fiber: "#9a8f6e", price: 40 },
  { id: "washi", name: { en: "Washi White", th: "วาชิขาว" }, color: "#f5f2ea", fiber: "#d6cfbf", price: 20 },
  { id: "sage", name: { en: "Sage Cotton Rag", th: "กระดาษฝ้ายสีเสจ" }, color: "#a9b79a", fiber: "#6f7d62", price: 20 },
  { id: "ink", name: { en: "Ink Black Recycled", th: "ดำรีไซเคิล" }, color: "#2f2d2b", fiber: "#4b4845", price: 20 },
];

export const MAX_HERBS = 5;
export const SHIPPING_THB = 50;
export const FREE_SHIPPING_FROM = 800;
export const SUBSCRIPTION_DISCOUNT = 0.1; // 10% off refills
export const RETURN_TUBE_DISCOUNT = 20; // THB per tube returned

export const byId = <T extends { id: string }>(list: readonly T[], id: string) =>
  list.find((x) => x.id === id);

/** Where every formula is compounded — printed as "lieu" on tube and box labels. */
export const LIEU = "KHON KAEN";
