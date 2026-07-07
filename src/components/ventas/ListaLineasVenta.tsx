import { cn, formatoFecha, formatoMoneda } from "@/lib/utils";
import { InactivarLineaDialog } from "@/components/ventas/InactivarLineaDialog";
import type { LineaVentaDTO } from "@/lib/consultas/ventas";

type Props = {
  lineas: LineaVentaDTO[];
  /** Solo en ventas PENDIENTE con permiso ventas.inactivarLinea. */
  puedeInactivar: boolean;
};

function Linea({
  linea,
  puedeInactivar,
  esExtra,
}: {
  linea: LineaVentaDTO;
  puedeInactivar: boolean;
  esExtra?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3",
        esExtra && "pl-6",
        !linea.activo && "rounded-lg bg-destructive/5 px-2 py-1"
      )}
    >
      <div className={cn("min-w-0", !linea.activo && "line-through opacity-60")}>
        <p className="font-medium">
          {linea.cantidad > 1 ? `${linea.cantidad} × ` : ""}
          {esExtra ? "+ " : ""}
          {linea.titulo}
        </p>
        {linea.subtitulo ? (
          <p className="text-sm text-muted-foreground">{linea.subtitulo}</p>
        ) : null}
        {linea.notas ? (
          <p className="text-sm text-secondary">Nota: {linea.notas}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <p
          className={cn(
            "font-semibold tabular-nums",
            !linea.activo && "line-through opacity-60"
          )}
        >
          {formatoMoneda(
            (Number(linea.precioUnitario) * linea.cantidad).toFixed(2)
          )}
        </p>
        {linea.activo && puedeInactivar ? (
          <InactivarLineaDialog detalleId={linea.id} titulo={linea.titulo} />
        ) : null}
      </div>
    </div>
  );
}

/** Líneas de la venta; las inactivas llegan solo para ADMINISTRADOR. */
export function ListaLineasVenta({ lineas, puedeInactivar }: Props) {
  if (lineas.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        La venta no tiene líneas.
      </p>
    );
  }
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {lineas.map((linea) => (
        <li key={linea.id} className="space-y-2 p-3">
          <Linea linea={linea} puedeInactivar={puedeInactivar} />
          {linea.extras.map((extra) => (
            <Linea
              key={extra.id}
              linea={extra}
              puedeInactivar={puedeInactivar}
              esExtra
            />
          ))}
          {!linea.activo && linea.inactivadaPor ? (
            <p className="text-xs text-destructive">
              Inactivada por {linea.inactivadaPor}
              {linea.fechaInactivacion
                ? ` · ${formatoFecha(linea.fechaInactivacion)}`
                : ""}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
