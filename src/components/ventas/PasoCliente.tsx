"use client";

import { useState, useTransition } from "react";
import { Home, Search, Store, X } from "lucide-react";
import { toast } from "sonner";
import { buscarClienteVenta, type ClienteVenta } from "@/lib/acciones/clientes";
import { ClienteVentaDialog } from "@/components/ventas/ClienteVentaDialog";
import { DireccionVentaDialog } from "@/components/ventas/DireccionVentaDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CanalVenta } from "@/generated/prisma/enums";

type Props = {
  canal: CanalVenta;
  onCanal: (canal: CanalVenta) => void;
  mesa: string;
  onMesa: (mesa: string) => void;
  cliente: ClienteVenta | null;
  onCliente: (cliente: ClienteVenta | null) => void;
  direccionId: string;
  onDireccion: (direccionId: string) => void;
};

/** Paso 1: canal + referencia (mesa) o cliente/dirección a domicilio. */
export function PasoCliente({
  canal,
  onCanal,
  mesa,
  onMesa,
  cliente,
  onCliente,
  direccionId,
  onDireccion,
}: Props) {
  const [telefono, setTelefono] = useState("");
  const [sinResultado, setSinResultado] = useState(false);
  const [buscando, startTransition] = useTransition();

  const buscar = () => {
    startTransition(async () => {
      setSinResultado(false);
      const resultado = await buscarClienteVenta(telefono);
      if (!resultado.ok) {
        toast.error(resultado.error);
        return;
      }
      if (resultado.cliente) {
        seleccionarCliente(resultado.cliente);
      } else {
        setSinResultado(true);
      }
    });
  };

  const seleccionarCliente = (encontrado: ClienteVenta) => {
    onCliente(encontrado);
    onDireccion(encontrado.direcciones[0]?.id ?? "");
    setSinResultado(false);
    if (encontrado.direcciones.length === 0) {
      toast.info('El cliente no tiene direcciones activas; regístrale una con "Nueva dirección".');
    }
  };

  // Regla: un cliente puede tener n direcciones y el pedido puede ir a una
  // nueva capturada aquí mismo — se agrega a la lista y queda seleccionada.
  const agregarDireccion = (
    actual: ClienteVenta,
    nueva: ClienteVenta["direcciones"][number]
  ) => {
    onCliente({ ...actual, direcciones: [...actual.direcciones, nueva] });
    onDireccion(nueva.id);
  };

  const canales: {
    valor: CanalVenta;
    titulo: string;
    detalle: string;
    Icono: typeof Store;
  }[] = [
    {
      valor: CanalVenta.ESTABLECIMIENTO,
      titulo: "Establecimiento",
      detalle: "Mesa o mostrador",
      Icono: Store,
    },
    {
      valor: CanalVenta.DOMICILIO,
      titulo: "Domicilio",
      detalle: "Requiere cliente y dirección",
      Icono: Home,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {canales.map(({ valor, titulo, detalle, Icono }) => (
          <button key={valor} type="button" onClick={() => onCanal(valor)}>
            <Card
              className={cn(
                "border-2 transition-colors",
                canal === valor ? "border-primary" : "hover:bg-accent"
              )}
            >
              <CardContent className="flex items-center gap-3 py-1 text-left">
                <Icono
                  className={cn("size-6", canal === valor && "text-primary")}
                />
                <div>
                  <p className="font-semibold">{titulo}</p>
                  <p className="text-sm text-muted-foreground">{detalle}</p>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {canal === CanalVenta.ESTABLECIMIENTO ? (
        <div className="max-w-xs space-y-2">
          <Label htmlFor="mesa">Mesa (opcional)</Label>
          <Input
            id="mesa"
            className="h-11"
            placeholder="5, barra, mostrador…"
            value={mesa}
            onChange={(e) => onMesa(e.target.value)}
          />
        </div>
      ) : cliente ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{cliente.nombre}</p>
              <p className="text-sm text-muted-foreground">{cliente.telefono}</p>
            </div>
            <Button
              variant="ghost"
              className="h-11"
              onClick={() => {
                onCliente(null);
                onDireccion("");
              }}
            >
              <X className="size-4" />
              Cambiar
            </Button>
          </div>
          <div className="space-y-2">
            <Label>Dirección de entrega</Label>
            <div className="grid gap-2">
              {cliente.direcciones.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onDireccion(d.id)}
                  className={cn(
                    "rounded-lg border-2 p-3 text-left transition-colors",
                    direccionId === d.id
                      ? "border-primary bg-primary/5"
                      : "bg-card hover:bg-accent"
                  )}
                >
                  <p className="font-medium">{d.direccion}</p>
                  {d.referencia ? (
                    <p className="text-sm text-muted-foreground">{d.referencia}</p>
                  ) : null}
                </button>
              ))}
            </div>
            <DireccionVentaDialog
              cliente={cliente}
              onCreada={(nueva) => agregarDireccion(cliente, nueva)}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Label htmlFor="telefono-cliente">Teléfono del cliente</Label>
          <div className="flex max-w-md gap-2">
            <Input
              id="telefono-cliente"
              className="h-11"
              inputMode="tel"
              placeholder="3311122233"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscar()}
            />
            <Button
              className="h-11"
              onClick={buscar}
              disabled={buscando || telefono.trim().length < 7}
            >
              <Search className="size-4" />
              {buscando ? "Buscando…" : "Buscar"}
            </Button>
          </div>
          {sinResultado ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed p-4">
              <p className="text-muted-foreground">
                No hay cliente con ese teléfono.
              </p>
              <ClienteVentaDialog
                telefonoInicial={telefono}
                onCreado={seleccionarCliente}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
