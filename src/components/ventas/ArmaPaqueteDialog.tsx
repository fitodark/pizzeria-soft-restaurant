"use client";

import { useState } from "react";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { aCents, formatoCents } from "@/components/ventas/carrito";
import type {
  ComponenteWizard,
  ProductoWizard,
  PromoWizard,
} from "@/lib/consultas/ventas";

type Props = {
  promo: PromoWizard;
  /** Catálogo completo (para nombres de componentes fijos). */
  productos: ProductoWizard[];
  esDomicilio: boolean;
  onAgregar: (datos: {
    promo: PromoWizard;
    componentes: { componenteId: string; productoId: string }[];
    notas: string;
    resumen: string;
  }) => void;
};

function etiquetaComponente(componente: ComponenteWizard): string {
  const cantidad = componente.cantidad > 1 ? `${componente.cantidad} × ` : "";
  const tamano = componente.tamano ? ` (${componente.tamano})` : "";
  return `${cantidad}${componente.categoriaPermitida ?? "producto"}${tamano}`;
}

/**
 * "Arma tu paquete": una elección por componente libre (filtrada por la
 * categoría permitida, tamaño ya fijado) + texto libre para cocina. Con
 * cantidad > 1 se elige UNA vez; si el cliente las quiere distintas, se
 * detalla en la nota. El servidor revalida todo en precios.ts.
 */
export function ArmaPaqueteDialog({
  promo,
  productos,
  esDomicilio,
  onAgregar,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [elecciones, setElecciones] = useState<Record<string, string>>({});
  const [notas, setNotas] = useState("");

  const libres = promo.componentes.filter((c) => !c.productoId);
  const fijos = promo.componentes.filter((c) => c.productoId);

  const nombreDe = (productoId: string | null) =>
    productos.find((p) => p.id === productoId)?.nombre ?? "—";

  const opcionesDe = (componente: ComponenteWizard) =>
    productos.filter(
      (p) =>
        (esDomicilio ? p.ventaDomicilio : p.ventaEstablecimiento) &&
        (!componente.categoriaPermitida ||
          p.categoria === componente.categoriaPermitida) &&
        (!componente.tamano ||
          p.variantes.some((v) => v.tamano === componente.tamano))
    );

  const listo = libres.every((c) => elecciones[c.id]);

  const agregar = () => {
    if (!listo) return;
    const componentes = libres.map((c) => ({
      componenteId: c.id,
      productoId: elecciones[c.id],
    }));
    const partes = promo.componentes.map((c) => {
      const nombre = c.productoId
        ? nombreDe(c.productoId)
        : nombreDe(elecciones[c.id]);
      const cantidad = c.cantidad > 1 ? `${c.cantidad}× ` : "";
      return `${cantidad}${nombre}${c.tamano ? ` (${c.tamano})` : ""}`;
    });
    onAgregar({
      promo,
      componentes,
      notas: notas.trim(),
      resumen: partes.join(" · "),
    });
    setAbierto(false);
    setElecciones({});
    setNotas("");
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="h-11">
          <Package className="size-4" />
          <Badge variant="outline" className="bg-card">
            {promo.tipo === "PAQUETE" ? "Paquete" : "Promo"}
          </Badge>
          {promo.nombre}
          {promo.precioEspecial ? (
            <span className="tabular-nums font-semibold">
              {formatoCents(aCents(promo.precioEspecial))}
            </span>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Arma tu paquete — {promo.nombre}</DialogTitle>
          <DialogDescription>
            {promo.descripcion ?? "Elige los productos que lo componen."}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {libres.map((componente) => (
            <div key={componente.id} className="space-y-2">
              <Label className="capitalize">
                {etiquetaComponente(componente)}
                {componente.maxSaboresOverride === 1 &&
                componente.categoriaPermitida === "alitas"
                  ? " — 1 solo sabor"
                  : ""}
              </Label>
              <Select
                value={elecciones[componente.id] ?? ""}
                onValueChange={(id) =>
                  setElecciones((actual) => ({ ...actual, [componente.id]: id }))
                }
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="Elige una opción" />
                </SelectTrigger>
                <SelectContent>
                  {opcionesDe(componente).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          {fijos.length > 0 ? (
            <div className="space-y-1 rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="font-medium">Incluye:</p>
              {fijos.map((componente) => (
                <p key={componente.id} className="text-muted-foreground">
                  {componente.cantidad} × {nombreDe(componente.productoId)}
                  {componente.tamano ? ` (${componente.tamano})` : ""}
                </p>
              ))}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="notas-paquete">
              Notas para cocina (sabores, diferencias, indicaciones)
            </Label>
            <Textarea
              id="notas-paquete"
              placeholder="Rebanada de pepperoni; 3 Hawaianas y 2 Jumay…"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>
          <Button
            className="h-11 w-full justify-between"
            disabled={!listo}
            onClick={agregar}
          >
            Agregar al pedido
            {promo.precioEspecial ? (
              <span className="tabular-nums font-semibold">
                {formatoCents(aCents(promo.precioEspecial))}
              </span>
            ) : null}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
