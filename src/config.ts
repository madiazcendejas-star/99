// Configuración de la empresa y políticas del negocio.
// App guarda el estado y llama a applyConfig en cada render; módulos y documentos leen
// `company` y `policies` (igual que staff.ts), así cada empresa define sus propias reglas.

export type CompanyConfig = {
  commercialName: string;
  legalName: string;
  rfc: string;
  taxRegime: string;
  phone: string;
  email: string;
  website: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  branch: string;
  warehouse: string;
  /** Logotipo como data URL (vacío = iniciales) */
  logo: string;
};

export type PriceList = { id: string; name: string };

export type Policies = {
  /** Listas de precios (la primera, "publico", es el precio de mostrador) */
  priceLists: PriceList[];
  /** Minutos sin uso antes de pedir el PIN otra vez (0 = nunca) */
  lockMinutes: number;
  /** Apartados */
  layawayMinPct: number;
  layawayDays: number;
  layawayExtensionDays: number;
  /** Pedidos especiales */
  specialDepositPct: number;
  specialPickupDays: number;
  /** Devoluciones */
  returnDays: number;
  returnAuthLimit: number;
  /** Kits */
  kitDiscountPct: number;
  kitMinMarginPct: number;
  /** Cotizaciones */
  quoteValidityDays: number;
};

export const initialCompany: CompanyConfig = {
  commercialName: "Aquaplus",
  legalName: "Comercializadora Aquaplus, S.A. de C.V.",
  rfc: "CAQ180624KQ2",
  taxRegime: "601 · General de Ley Personas Morales",
  phone: "55 4182 9050",
  email: "operaciones@aquaplus.mx",
  website: "aquaplus.mx",
  street: "Av. Central 145, Col. Industrial",
  city: "Ciudad de México",
  state: "CDMX",
  postalCode: "02300",
  branch: "Sucursal principal",
  warehouse: "Almacén principal",
  logo: "",
};

export const initialPolicies: Policies = {
  priceLists: [
    { id: "publico", name: "Público" },
    { id: "mayoreo", name: "Mayoreo" },
    { id: "plomero", name: "Plomero" },
    { id: "distribuidor", name: "Distribuidor" },
  ],
  lockMinutes: 10,
  layawayMinPct: 20,
  layawayDays: 30,
  layawayExtensionDays: 15,
  specialDepositPct: 50,
  specialPickupDays: 7,
  returnDays: 30,
  returnAuthLimit: 5000,
  kitDiscountPct: 5,
  kitMinMarginPct: 20,
  quoteValidityDays: 7,
};

export const fullAddress = (c: CompanyConfig) => [c.street, c.city, c.postalCode && `C.P. ${c.postalCode}`].filter(Boolean).join(", ");

/** Datos vivos de la empresa (los documentos leen `company.address` ya armado) */
export const company: CompanyConfig & { address: string } = { ...initialCompany, address: fullAddress(initialCompany) };
/** Políticas vivas del negocio */
export const policies: Policies = { ...initialPolicies };

export function applyConfig(c: CompanyConfig, p: Policies) {
  Object.assign(company, c, { address: fullAddress(c) });
  Object.assign(policies, p);
}

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "99";
