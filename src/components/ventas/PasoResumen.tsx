"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ExtrasNotasDialog } from "@/components/ventas/ExtrasNotasDialog";
import { RondasPrevias, type LineaPrevia } from "@/components/ventas/RondasPrevias";
import {
  formatoCents,
  totalCarritoCents,
  type ExtraCarrito,
  type LineaCarrito,
} from "@/components/ventas/carrito";
import { cn } from "@/lib/utils";
import type { ExtraWizard } from "@/lib/consultas/ventas";
import type { MetodoPago } from "@/generated/prisma/enums";

type Props = {
  lineas: LineaCarrito[];
  mesa: string;
  /** Solo DOMICILIO: datos de entrega y pago anticipado. */
  domicilio: { cliente: string; direccion: string; pagaCon: string } | null;
  /** Modo agregar a venta existente: rondas previas y sin sección de pago. */
  agregar?: {
    esDomicilio: boolean;
    ronda: number;
    lineasPrevias: LineaPrevia[];
    totalPrevioCents: number;
  };
  metodoPago: MetodoPago;
  extrasDisponibles: ExtraWizard[];
  onMetodoPago: (metodo: MetodoPago) => void;
  /** "Paga con" se pregunta aquí, al leer la confirmación al cliente. */
  onPagaCon: (pagaCon: string) => void;
  onCantidad: (uid: string, delta: number) => void;
  onQuitar: (uid: string) => void;
  onExtrasNotas: (uid: string, extras: ExtraCarrito[], notas: string) => void;
};

/** Paso 4: resumen, método de pago y confirmación. */
export function PasoResumen({
  lineas,
  mesa,
  domicilio,
  agregar,
  metodoPago,
  extrasDisponibles,
  onMetodoPago,
  onPagaCon,
  onCantidad,
  onQuitar,
  onExtrasNotas,
}: Props) {
  const totalCents = totalCarritoCents(lineas);
  const pagaConCents =
    domicilio && /^\d+(\.\d{1,2})?$/.test(domicilio.pagaCon.trim())
      ? Math.round(Number(domicilio.pagaCon.trim()) * 100)
      : null;

  if (lineas.length === 0 && !agregar) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        El pedido está vacío. Regresa a bebidas o comida para agregar productos.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {agregar ? (
        <>
          <RondasPrevias
            lineas={agregar.lineasPrevias}
            esDomicilio={agregar.esDomicilio}
          />
          <Badge>
            {agregar.esDomicilio
              ? "Productos nuevos"
              : `Ronda ${agregar.ronda} · nueva`}
          </Badge>
        </>
      ) : null}
      {lineas.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">
          Aún no hay productos nuevos. Regresa a bebidas o comida para
          agregarlos.
        </p>
      ) : null}
      <ul
        className={cn(
          "divide-y rounded-xl border bg-card",
          agregar && "border-primary",
          lineas.length === 0 && "hidden"
        )}
      >
        {lineas.map((linea) => (
          <li key={linea.uid} className="space-y-2 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{linea.titulo}</p>
                {linea.subtitulo ? (
                  <p className="text-sm text-muted-foreground">
                    {linea.subtitulo}
                  </p>
                ) : null}
                {linea.notas ? (
                  <p className="text-sm text-secondary">Nota: {linea.notas}</p>
                ) : null}
                {linea.extras.map((extra) => (
                  <p
                    key={extra.productoId}
                    className="text-sm text-muted-foreground"
                  >
                    + {extra.cantidad} × {extra.nombre} (
                    {formatoCents(extra.precioCents * extra.cantidad)})
                  </p>
                ))}
              </div>
              <p className="shrink-0 font-semibold tabular-nums">
                {formatoCents(linea.precioCents * linea.cantidad)}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9"
                  onClick={() => onCantidad(linea.uid, -1)}
                  disabled={linea.cantidad <= 1}
                  aria-label="Disminuir cantidad"
                >
                  <Minus className="size-4" />
                </Button>
                <span className="w-6 text-center tabular-nums">
                  {linea.cantidad}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9"
                  onClick={() => onCantidad(linea.uid, 1)}
                  aria-label="Aumentar cantidad"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <div className="flex items-center gap-1">
                {linea.permiteExtrasNotas ? (
                  <ExtrasNotasDialog
                    titulo={linea.titulo}
                    extrasDisponibles={extrasDisponibles}
                    extras={linea.extras}
                    notas={linea.notas}
                    onGuardar={(extras, notas) =>
                      onExtrasNotas(linea.uid, extras, notas)
                    }
                  />
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 text-destructive"
                  onClick={() => onQuitar(linea.uid)}
                  aria-label="Quitar línea"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div
          className={cn("flex flex-wrap items-start gap-4", agregar && "hidden")}
        >
          <div className="w-56 space-y-2">
            <Label>Método de pago</Label>
            <Select
              value={metodoPago}
              onValueChange={(v) => onMetodoPago(v as MetodoPago)}
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                <SelectItem value="TRANSFERENCIA">
                  Transferencia (por validar)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {domicilio ? (
            <div className="w-56 space-y-2">
              <Label htmlFor="paga-con">Paga con (opcional)</Label>
              <Input
                id="paga-con"
                className="h-11 text-right tabular-nums"
                inputMode="decimal"
                placeholder="500.00"
                value={domicilio.pagaCon}
                onChange={(e) => onPagaCon(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Pregúntalo al confirmar el pedido; el repartidor lleva el
                cambio calculado.
              </p>
            </div>
          ) : null}
        </div>
        <div className="text-right">
          {domicilio ? (
            <p className="text-sm text-muted-foreground">
              {domicilio.cliente} · {domicilio.direccion}
            </p>
          ) : mesa ? (
            <p className="text-sm text-muted-foreground">Mesa: {mesa}</p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {agregar
              ? agregar.esDomicilio
                ? "Productos nuevos"
                : `Total ronda ${agregar.ronda}`
              : "Total"}
          </p>
          <p className="text-3xl font-semibold tabular-nums">
            {formatoCents(totalCents)}
          </p>
          {agregar ? (
            <p className="text-sm text-muted-foreground tabular-nums">
              Nuevo total de la venta:{" "}
              {formatoCents(agregar.totalPrevioCents + totalCents)}
            </p>
          ) : null}
          {pagaConCents !== null ? (
            pagaConCents >= totalCents ? (
              <p className="text-sm text-muted-foreground tabular-nums">
                Paga con {formatoCents(pagaConCents)} · Cambio a llevar:{" "}
                {formatoCents(pagaConCents - totalCents)}
              </p>
            ) : (
              <p className="text-sm text-destructive tabular-nums">
                El monto no cubre el total del pedido.
              </p>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
