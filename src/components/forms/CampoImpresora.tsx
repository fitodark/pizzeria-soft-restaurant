"use client";

import { useTransition } from "react";
import { useFormContext } from "react-hook-form";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { probarImpresora } from "@/lib/acciones/configuracion";
import type { DatosConfiguracion } from "@/lib/esquemas/configuracion";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Prefijo = "impresoraPrincipal" | "impresoraCocina" | "impresoraBebidas";

type Props = {
  prefijo: Prefijo;
  etiqueta: string;
  descripcion: string;
};

/** Modo + ruta + "Imprimir prueba" de una impresora en /configuracion. */
export function CampoImpresora({ prefijo, etiqueta, descripcion }: Props) {
  const form = useFormContext<DatosConfiguracion>();
  const [probando, startTransition] = useTransition();

  const campoModo = `${prefijo}Modo` as const;
  const campoRuta = `${prefijo}Ruta` as const;
  const modo = form.watch(campoModo);

  const probar = () => {
    startTransition(async () => {
      const resultado = await probarImpresora({
        modo: form.getValues(campoModo),
        ruta: form.getValues(campoRuta),
        impresora: etiqueta,
      });
      if (resultado.ok) {
        toast.success(`Prueba enviada a ${etiqueta.toLowerCase()}.`);
      } else {
        toast.error(resultado.error);
      }
    });
  };

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div>
        <p className="font-semibold">{etiqueta}</p>
        <p className="text-sm text-muted-foreground">{descripcion}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr_auto]">
        <FormField
          control={form.control}
          name={campoModo}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Modo</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="tcp">Red (TCP 9100)</SelectItem>
                  <SelectItem value="share">Compartida Windows</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={campoRuta}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ruta</FormLabel>
              <FormControl>
                <Input
                  className="h-11"
                  placeholder={
                    modo === "share" ? "\\\\EQUIPO\\Tickets" : "192.168.1.50"
                  }
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={probar}
            disabled={probando}
          >
            <Printer className="size-4" />
            {probando ? "Imprimiendo…" : "Imprimir prueba"}
          </Button>
        </div>
      </div>
    </div>
  );
}
