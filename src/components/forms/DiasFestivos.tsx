"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  esquemaDiaFestivo,
  type DatosDiaFestivo,
} from "@/lib/esquemas/festivos";
import { crearDiaFestivo, eliminarDiaFestivo } from "@/lib/acciones/festivos";
import type { DiaFestivoDTO } from "@/lib/consultas/festivos";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

type Props = {
  festivos: DiaFestivoDTO[];
};

/** Fecha "yyyy-MM-dd" en formato legible es-MX sin corrimiento de zona. */
function fechaLegible(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function DiasFestivos({ festivos }: Props) {
  const [pendiente, startTransition] = useTransition();

  const form = useForm<DatosDiaFestivo>({
    resolver: zodResolver(esquemaDiaFestivo),
    defaultValues: { fecha: "", descripcion: "" },
  });

  const agregar = (datos: DatosDiaFestivo) => {
    startTransition(async () => {
      const resultado = await crearDiaFestivo(datos);
      if (resultado.ok) {
        toast.success("Día festivo agregado.");
        form.reset();
      } else {
        toast.error(resultado.error);
      }
    });
  };

  const eliminar = (id: string) => {
    startTransition(async () => {
      const resultado = await eliminarDiaFestivo({ id });
      if (resultado.ok) {
        toast.success("Día festivo eliminado.");
      } else {
        toast.error(resultado.error);
      }
    });
  };

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div>
        <h2 className="font-semibold">Días festivos</h2>
        <p className="text-sm text-muted-foreground">
          Catálogo global (todas las sucursales). Las promociones y paquetes
          marcados como &quot;no aplica en festivos&quot; no se venden en estas
          fechas.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(agregar)}
          className="flex flex-wrap items-end gap-3"
        >
          <FormField
            control={form.control}
            name="fecha"
            render={({ field }) => (
              <FormItem className="w-44">
                <FormLabel>Fecha</FormLabel>
                <FormControl>
                  <Input className="h-11" type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="descripcion"
            render={({ field }) => (
              <FormItem className="min-w-56 flex-1">
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Input
                    className="h-11"
                    placeholder="25 de diciembre — Navidad"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="h-11" disabled={pendiente}>
            <Plus className="size-4" />
            Agregar
          </Button>
        </form>
      </Form>

      {festivos.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          Sin días festivos registrados: todas las promociones aplican todos
          los días.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {festivos.map((festivo) => (
            <li
              key={festivo.id}
              className="flex items-center justify-between gap-3 p-3"
            >
              <div>
                <p className="text-sm font-medium capitalize">
                  {fechaLegible(festivo.fecha)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {festivo.descripcion}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-destructive"
                aria-label={`Eliminar ${festivo.descripcion}`}
                disabled={pendiente}
                onClick={() => eliminar(festivo.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
