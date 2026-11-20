// Listas de precios: cada producto tiene un precio por lista y cada cliente una lista asignada.
import { policies } from "./config";

export type Priced = {
  retailPrice: number;
  wholesalePrice?: number;
  contractorPrice?: number;
  prices?: Record<string, number>;
};

export const PUBLIC_LIST = "publico";

/** Lista de un cliente: la asignada o, si no tiene, la que corresponde a su tipo */
export const listForCustomer = (customer?: { type?: string; priceList?: string } | null) => {
  const exists = (id?: string) => !!id && policies.priceLists.some((l) => l.id === id);
  if (exists(customer?.priceList)) return customer!.priceList!;
  if (customer?.priceList) return PUBLIC_LIST; // su lista se eliminó
  const byType = customer?.type === "Mayorista" ? "mayoreo" : customer?.type === "Contratista" ? "plomero" : PUBLIC_LIST;
  return exists(byType) ? byType : PUBLIC_LIST;
};

/** Precio de un producto en una lista (si no tiene precio en esa lista, se usa el público) */
export const priceFor = (product: Priced, listId: string = PUBLIC_LIST) => {
  if (listId === PUBLIC_LIST) return product.retailPrice;
  const own = product.prices?.[listId];
  if (own) return own;
  if (listId === "mayoreo" && product.wholesalePrice) return product.wholesalePrice;
  if ((listId === "plomero" || listId === "contratista") && product.contractorPrice) return product.contractorPrice;
  return product.retailPrice;
};

/** Todos los precios de un producto por lista configurada */
export const pricesOf = (product: Priced) =>
  Object.fromEntries(policies.priceLists.filter((l) => l.id !== PUBLIC_LIST).map((l) => [l.id, priceFor(product, l.id)]));

export const listName = (id?: string) => policies.priceLists.find((l) => l.id === id)?.name ?? (id ? id : "Público");
