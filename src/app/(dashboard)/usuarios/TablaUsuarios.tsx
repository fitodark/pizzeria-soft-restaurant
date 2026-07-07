"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/tables/DataTable";

export type FilaUsuario = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  sueldo: string;
  sucursales: string;
  activo: boolean;
};

const columnas: ColumnDef<FilaUsuario>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => (
      <Link
        href={`/usuarios/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.nombre}
      </Link>
    ),
  },
  { accessorKey: "email", header: "Correo" },
  {
    accessorKey: "rol",
    header: "Rol",
    cell: ({ row }) => <Badge variant="outline">{row.original.rol}</Badge>,
  },
  {
    accessorKey: "sueldo",
    header: () => <div className="text-right">Sueldo</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{row.original.sueldo}</div>
    ),
  },
  { accessorKey: "sucursales", header: "Sucursales" },
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

export function TablaUsuarios({ datos }: { datos: FilaUsuario[] }) {
  return (
    <DataTable
      columns={columnas}
      data={datos}
      filtro={{ columna: "nombre", placeholder: "Buscar por nombre…" }}
    />
  );
}
