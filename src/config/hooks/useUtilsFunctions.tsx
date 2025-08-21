import React from "react";
import type { RouteConfig } from "../routes";
import  { supabase } from "../supabaseClient";
import type { ItemMenu, Mesa } from "../types";

const clean = (p: string) => p.replace(/^\/|\/$/g, '') // quita / al inicio/fin

export const flattenRoutes = (routes: RouteConfig[]): RouteConfig[] => {
  const out: RouteConfig[] = []
  routes.forEach((r) => {
    // padre absoluto
    const parentPath = `/${clean(r.path)}`
    out.push({ ...r, path: parentPath })

    if (r.children?.length) {
      r.children.forEach((c) => {
        const childPath = `/${clean(r.path)}/${clean(c.path)}`
        out.push({ ...c, path: childPath })
      })
    }
  })
  return out
}
export const getRandomInt = (max: number): number => {
    if (typeof max !== "number" || max <= 0) {
      throw new Error("El parámetro 'max' debe ser un número positivo.");
    }
    return Math.floor(Math.random() * max);
  };
  
  export const formatoMoneda = (value: string | number): string => {
    if (!value) return ""; 
    const numericValue = value.toString().replace(/[^0-9.]/g, "");
    const parsedValue = parseFloat(numericValue);
    if (isNaN(parsedValue)) return "";
    return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    }).format(parsedValue);
};
  

export const normalizeFileName = (filename: string): string => {
  const normalized = filename.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return normalized.replace(/[^a-zA-Z0-9_.-]/g, "_");
};

export const handleVerDocumento = async (
    path: string,
    bucket: string 
  ) => {
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60);
  
    if (error) {
      return;
    }
  
    window.open(data.signedUrl, "_blank");
  };

  export async function getSignedUrl(
    path: string,
    bucket: string,
    expires = 60 * 60
  ): Promise<string | null> {
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .createSignedUrl(path, expires)
  
    if (error) {
      return null
    }
    return data.signedUrl
  }
  

  export type MenuGrouped = Record<string, Record<string, ItemMenu[]>>

type Options = {
  fallbackCategory?: string
  fallbackSubcategory?: string
}

/** Normaliza claves (recorta, aplica fallback si queda vacío). */
function normalizeKey(value: string | null | undefined, fallback: string) {
  const v = (value ?? '').trim()
  return v.length ? v : fallback
}

/** Función pura (no depende de React). */
export function groupMenu(
  items: ItemMenu[],
  opts: Options = {}
): MenuGrouped {
  const catFallback = opts.fallbackCategory ?? 'General'
  const subFallback = opts.fallbackSubcategory ?? '—'

  const out: MenuGrouped = {}
  for (const item of items) {
    const cat = normalizeKey(item.categoria, catFallback)
    const sub = normalizeKey(item.subcategoria, subFallback)
    if (!out[cat]) out[cat] = {}
    if (!out[cat][sub]) out[cat][sub] = []
    out[cat][sub].push(item)
  }
  return out
}

/** Hook de conveniencia para componentes React. */
export function useMenuAgrupado(
  items: ItemMenu[],
  opts: Options = {}
): MenuGrouped {
  const deps = [
    items,
    opts.fallbackCategory ?? 'General',
    opts.fallbackSubcategory ?? '—',
  ] as const

  return React.useMemo(() => groupMenu(items, opts), deps)
}

export function getMesaLabel(mesas: Mesa[], id?: string | null) {
  if (!id) return 'Sin asignar'
  const m = mesas.find(x => x.id === id)
  if (!m) return `#${String(id).slice(0, 6)}`
  // intenta varios campos comunes
  const nombre =
    (m as any).nomesa ??
    (m as any).nombre ??
    (m as any).numero ??
    (m as any).etiqueta ??
    ''
  return nombre || `#${String(id).slice(0, 6)}`
}
