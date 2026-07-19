"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import {
  buscarClienteVenta,
  sugerirClientesVenta,
  type ClienteVenta,
} from "@/lib/acciones/clientes";
import { ClienteVentaDialog } from "@/components/ventas/ClienteVentaDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  onSeleccion: (cliente: ClienteVenta) => void;
};

/**
 * Búsqueda de cliente por teléfono (paso 1, domicilio): a partir de 3
 * dígitos se sugieren coincidencias ("teléfono — nombre") navegables con
 * ↑/↓ y seleccionables con Enter. El botón "Buscar" conserva la búsqueda
 * exacta y, sin coincidencia, ofrece el alta rápida.
 */
export function BuscadorClienteTelefono({ onSeleccion }: Props) {
  const [telefono, setTelefono] = useState("");
  const [sugerencias, setSugerencias] = useState<ClienteVenta[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [activa, setActiva] = useState(0);
  const [sinResultado, setSinResultado] = useState(false);
  const [buscando, startTransition] = useTransition();
  // Descarta respuestas viejas si el cajero sigue tecleando
  const consulta = useRef(0);

  const digitos = telefono.replace(/\D/g, "");

  useEffect(() => {
    if (digitos.length < 3) {
      // La limpieza de sugerencias ocurre en onChange; aquí solo se evita buscar
      return;
    }
    const id = ++consulta.current;
    const timer = setTimeout(async () => {
      const resultado = await sugerirClientesVenta(digitos);
      if (id !== consulta.current || !resultado.ok) return;
      setSugerencias(resultado.clientes);
      setAbierto(resultado.clientes.length > 0);
      setActiva(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [digitos]);

  const seleccionar = (cliente: ClienteVenta) => {
    setAbierto(false);
    setSugerencias([]);
    setSinResultado(false);
    onSeleccion(cliente);
  };

  const buscarExacto = () => {
    setAbierto(false);
    startTransition(async () => {
      setSinResultado(false);
      const resultado = await buscarClienteVenta(telefono);
      if (!resultado.ok) {
        toast.error(resultado.error);
        return;
      }
      if (resultado.cliente) {
        seleccionar(resultado.cliente);
      } else {
        setSinResultado(true);
      }
    });
  };

  const alTeclear = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (abierto && sugerencias.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiva((i) => Math.min(i + 1, sugerencias.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiva((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        seleccionar(sugerencias[activa]);
        return;
      }
      if (e.key === "Escape") {
        setAbierto(false);
        return;
      }
    }
    if (e.key === "Enter" && telefono.trim().length >= 7) {
      buscarExacto();
    }
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="telefono-cliente">Teléfono del cliente</Label>
      <div className="relative max-w-md">
        <div className="flex gap-2">
          <Input
            id="telefono-cliente"
            className="h-11"
            inputMode="tel"
            placeholder="3311122233"
            role="combobox"
            aria-expanded={abierto}
            aria-controls="sugerencias-telefono"
            aria-activedescendant={
              abierto ? `sugerencia-${activa}` : undefined
            }
            autoComplete="off"
            value={telefono}
            onChange={(e) => {
              setTelefono(e.target.value);
              setSinResultado(false);
              if (e.target.value.replace(/\D/g, "").length < 3) {
                consulta.current += 1; // invalida búsquedas en vuelo
                setSugerencias([]);
                setAbierto(false);
              }
            }}
            onKeyDown={alTeclear}
          />
          <Button
            className="h-11"
            onClick={buscarExacto}
            disabled={buscando || telefono.trim().length < 7}
          >
            <Search className="size-4" />
            {buscando ? "Buscando…" : "Buscar"}
          </Button>
        </div>
        {abierto ? (
          <ul
            id="sugerencias-telefono"
            role="listbox"
            className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border bg-card shadow-md"
          >
            {sugerencias.map((c, indice) => (
              <li
                key={c.id}
                id={`sugerencia-${indice}`}
                role="option"
                aria-selected={indice === activa}
                className={cn(
                  "cursor-pointer px-3 py-2.5",
                  indice === activa ? "bg-primary/10" : "hover:bg-accent"
                )}
                onMouseEnter={() => setActiva(indice)}
                onMouseDown={(e) => {
                  e.preventDefault(); // no robar el foco del input
                  seleccionar(c);
                }}
              >
                <span className="font-medium tabular-nums">{c.telefono}</span>
                <span className="text-muted-foreground"> — {c.nombre}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {sinResultado ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed p-4">
          <p className="text-muted-foreground">
            No hay cliente con ese teléfono.
          </p>
          <ClienteVentaDialog
            telefonoInicial={telefono}
            onCreado={seleccionar}
          />
        </div>
      ) : null}
    </div>
  );
}
