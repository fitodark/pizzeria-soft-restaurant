import { Badge } from "@/components/ui/badge";
import { formatoCents } from "@/components/ventas/carrito";

/** Línea ya registrada en la venta (solo presentación en el modo agregar). */
export type LineaPrevia = {
  id: string;
  ronda: number;
  titulo: string;
  subtitulo: string | null;
  cantidad: number;
  /** cantidad × precio unitario, sin extras. */
  importeCents: number;
  notas: string | null;
  extras: { id: string; titulo: string; cantidad: number; importeCents: number }[];
};

type Props = {
  lineas: LineaPrevia[];
  esDomicilio: boolean;
};

/**
 * Rondas ya atendidas por cocina: se muestran atenuadas y sin edición.
 * Quitar algo de aquí sigue siendo inactivación con PIN en el detalle.
 */
export function RondasPrevias({ lineas, esDomicilio }: Props) {
  const rondas = [...new Set(lineas.map((l) => l.ronda))].sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {rondas.map((ronda) => (
        <div key={ronda} className="space-y-1 opacity-70">
          <Badge variant="outline">
            {esDomicilio ? "Pedido original" : `Ronda ${ronda} · atendida`}
          </Badge>
          <ul className="divide-y rounded-xl border bg-muted/30">
            {lineas
              .filter((l) => l.ronda === ronda)
              .map((linea) => (
                <li
                  key={linea.id}
                  className="flex items-start justify-between gap-3 p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {linea.cantidad > 1 ? `${linea.cantidad} × ` : ""}
                      {linea.titulo}
                    </p>
                    {linea.subtitulo ? (
                      <p className="text-sm text-muted-foreground">
                        {linea.subtitulo}
                      </p>
                    ) : null}
                    {linea.notas ? (
                      <p className="text-sm text-muted-foreground">
                        Nota: {linea.notas}
                      </p>
                    ) : null}
                    {linea.extras.map((extra) => (
                      <p key={extra.id} className="text-sm text-muted-foreground">
                        + {extra.cantidad} × {extra.titulo} (
                        {formatoCents(extra.importeCents)})
                      </p>
                    ))}
                  </div>
                  <p className="shrink-0 font-semibold tabular-nums">
                    {formatoCents(
                      linea.importeCents +
                        linea.extras.reduce((t, e) => t + e.importeCents, 0)
                    )}
                  </p>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
