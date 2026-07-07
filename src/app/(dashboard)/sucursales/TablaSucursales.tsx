"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/tables/DataTable";

export type FilaSucursal = {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  usuarios: number;
  activa: boolean;
};

const columnas: ColumnDef<FilaSucursal>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => (
      <Link
        href={`/sucursales/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.nombre}
      </Link>
    ),
  },
  { accessorKey: "direccion", header: "Dirección" },
  { accessorKey: "telefono", header: "Teléfono" },
  {
    accessorKey: "usuarios",
    header: () => <div className="text-right">Usuarios</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{row.original.usuarios}</div>
    ),
  },
  {
    accessorKey: "activa",
    header: "Estatus",
    cell: ({ row }) =>
      row.original.activa ? (
        <Badge variant="outline" className="text-success border-success/40">
          Activa
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">
          Inactiva
        </Badge>
      ),
  },
];

export function TablaSucursales({ datos }: { datos: FilaSucursal[] }) {
  return (
    <DataTable
      columns={columnas}
      data={datos}
      filtro={{ columna: "nombre", placeholder: "Buscar por nombre…" }}
    />
  );
}
