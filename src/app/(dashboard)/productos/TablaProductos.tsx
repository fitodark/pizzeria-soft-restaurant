"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/tables/DataTable";

export type FilaProducto = {
  id: string;
  nombre: string;
  categoria: string;
  tipo: "COMIDA" | "BEBIDA";
  tipoArticulo: "VENTA" | "EXTRA";
  precios: string;
  esEspecialidad: boolean;
  inventariable: boolean;
  ventaDomicilio: boolean;
  ventaEstablecimiento: boolean;
  activo: boolean;
  puedeGestionar: boolean;
};

const columnas: ColumnDef<FilaProducto>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) =>
      row.original.puedeGestionar ? (
        <Link
          href={`/productos/${row.original.id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.original.nombre}
        </Link>
      ) : (
        <span className="font-medium">{row.original.nombre}</span>
      ),
  },
  { accessorKey: "categoria", header: "Categoría" },
  {
    accessorKey: "tipo",
    header: "Tipo",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.tipo === "COMIDA" ? "Comida" : "Bebida"}
        {row.original.tipoArticulo === "EXTRA" ? (
          <Badge variant="secondary" className="ml-2">
            Extra
          </Badge>
        ) : null}
      </span>
    ),
  },
  {
    accessorKey: "precios",
    header: "Precios",
    cell: ({ row }) => (
      <span className="tabular-nums text-sm">{row.original.precios}</span>
    ),
  },
  {
    id: "banderas",
    header: "Banderas",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.esEspecialidad ? (
          <Badge variant="outline">Especialidad</Badge>
        ) : null}
        {row.original.inventariable ? (
          <Badge variant="outline">Inventariable</Badge>
        ) : null}
        {!row.original.ventaDomicilio ? (
          <Badge variant="outline" className="text-muted-foreground">
            Sin domicilio
          </Badge>
        ) : null}
        {!row.original.ventaEstablecimiento ? (
          <Badge variant="outline" className="text-muted-foreground">
            Sin establecimiento
          </Badge>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: "activo",
    header: "Estatus",
    cell: ({ row }) =>
      row.original.activo ? (
        <Badge variant="outline" className="text-success border-success/40">
          Activo
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">
          Inactivo
        </Badge>
      ),
  },
];

const TODOS = "todos";

export function TablaProductos({ datos }: { datos: FilaProducto[] }) {
  const [tipo, setTipo] = useState(TODOS);
  const [articulo, setArticulo] = useState(TODOS);
  const [categoria, setCategoria] = useState(TODOS);

  const categorias = useMemo(
    () => [...new Set(datos.map((d) => d.categoria))].sort(),
    [datos]
  );

  const filtrados = datos.filter(
    (d) =>
      (tipo === TODOS || d.tipo === tipo) &&
      (articulo === TODOS || d.tipoArticulo === articulo) &&
      (categoria === TODOS || d.categoria === categoria)
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="h-11 w-40" aria-label="Filtrar por tipo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todo tipo</SelectItem>
            <SelectItem value="COMIDA">Comida</SelectItem>
            <SelectItem value="BEBIDA">Bebida</SelectItem>
          </SelectContent>
        </Select>
        <Select value={articulo} onValueChange={setArticulo}>
          <SelectTrigger className="h-11 w-40" aria-label="Filtrar por artículo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Venta y extras</SelectItem>
            <SelectItem value="VENTA">Solo venta</SelectItem>
            <SelectItem value="EXTRA">Solo extras</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger className="h-11 w-44" aria-label="Filtrar por categoría">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Toda categoría</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DataTable
        columns={columnas}
        data={filtrados}
        filtro={{ columna: "nombre", placeholder: "Buscar por nombre…" }}
        tamanoPagina={15}
      />
    </div>
  );
}
