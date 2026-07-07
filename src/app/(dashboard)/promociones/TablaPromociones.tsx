"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/tables/DataTable";

export type FilaPromocion = {
  id: string;
  nombre: string;
  tipo: string;
  precio: string;
  vigencia: string;
  canales: string;
  vigenteHoy: boolean;
  activa: boolean;
  puedeGestionar: boolean;
};

const columnas: ColumnDef<FilaPromocion>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) =>
      row.original.puedeGestionar ? (
        <Link
          href={`/promociones/${row.original.id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.original.nombre}
        </Link>
      ) : (
        <span className="font-medium">{row.original.nombre}</span>
      ),
  },
  {
    accessorKey: "tipo",
    header: "Tipo",
    cell: ({ row }) => <Badge variant="secondary">{row.original.tipo}</Badge>,
  },
  {
    accessorKey: "precio",
    header: () => <div className="text-right">Precio</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{row.original.precio}</div>
    ),
  },
  { accessorKey: "vigencia", header: "Vigencia" },
  { accessorKey: "canales", header: "Canales" },
  {
    accessorKey: "vigenteHoy",
    header: "Hoy",
    cell: ({ row }) =>
      !row.original.activa ? (
        <Badge variant="outline" className="text-muted-foreground">
          Inactiva
        </Badge>
      ) : row.original.vigenteHoy ? (
        <Badge variant="outline" className="text-success border-success/40">
          Vigente
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">
          No aplica hoy
        </Badge>
      ),
  },
];

export function TablaPromociones({ datos }: { datos: FilaPromocion[] }) {
  return (
    <DataTable
      columns={columnas}
      data={datos}
      filtro={{ columna: "nombre", placeholder: "Buscar promoción…" }}
    />
  );
}
