"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";

export type FilaCliente = {
  id: string;
  nombre: string;
  telefono: string;
  direcciones: number;
};

const columnas: ColumnDef<FilaCliente>[] = [
  {
    accessorKey: "telefono",
    header: "Teléfono",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.telefono}</span>
    ),
  },
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => (
      <Link
        href={`/clientes/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.nombre}
      </Link>
    ),
  },
  {
    accessorKey: "direcciones",
    header: () => <div className="text-right">Direcciones</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{row.original.direcciones}</div>
    ),
  },
];

export function TablaClientes({ datos }: { datos: FilaCliente[] }) {
  return <DataTable columns={columnas} data={datos} />;
}
