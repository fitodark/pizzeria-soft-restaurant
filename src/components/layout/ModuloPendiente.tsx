type Props = {
  titulo: string;
  paso: number;
  descripcion?: string;
};

/** Placeholder de módulo aún no construido (se reemplaza en pasos siguientes). */
export function ModuloPendiente({ titulo, paso, descripcion }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{titulo}</h1>
        {descripcion ? (
          <p className="text-muted-foreground">{descripcion}</p>
        ) : null}
      </div>
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed">
        <p className="text-muted-foreground">
          Este módulo se construye en el Paso {paso}.
        </p>
      </div>
    </div>
  );
}
