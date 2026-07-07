"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { DialogoAjuste } from "./DialogoAjuste";

export type FilaInventario = {
  productoId: string;
  nombre: string;
  categoria: string;
  existencia: string;
  actualizado: string;
  puedeAjustar: boolean;
};

const columnas: ColumnDef<FilaInventario>[] = [
  {
    accessorKey: "nombre",
    header: "Producto",
    cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span>,
  },
  { accessorKey: "categoria", header: "Categoría" },
  {
    accessorKey: "existencia",
    header: () => <div className="text-right">Existencia</div>,
    cell: ({ row }) => (
      <div
        className={`text-right font-semibold tabular-nums ${
          Number(row.original.existencia) <= 0 ? "text-destructive" : ""
        }`}
      >
        {row.original.existencia}
      </div>
    ),
  },
  {
    accessorKey: "actualizado",
    header: "Último movimiento",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.actualizado}
      </span>
    ),
  },
  {
    id: "acciones",
    header: "",
    cell: ({ row }) =>
      row.original.puedeAjustar ? (
        <div className="text-right">
          <DialogoAjuste
            productoId={row.original.productoId}
            nombreProducto={row.original.nombre}
            existenciaActual={row.original.existencia}
          />
        </div>
      ) : null,
  },
];

export function TablaInventario({ datos }: { datos: FilaInventario[] }) {
  return (
    <DataTable
      columns={columnas}
      data={datos}
      filtro={{ columna: "nombre", placeholder: "Buscar producto…" }}
      tamanoPagina={15}
    />
  );
}
