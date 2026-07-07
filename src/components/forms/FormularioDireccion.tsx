"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { esquemaDireccion, type DatosDireccion } from "@/lib/esquemas/clientes";
import { actualizarDireccion, agregarDireccion } from "@/lib/acciones/clientes";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  clienteId: string;
  /** Si viene, es edición. */
  direccion?: DatosDireccion & { id: string };
  onExito?: () => void;
};

export function FormularioDireccion({ clienteId, direccion, onExito }: Props) {
  const [pendiente, startTransition] = useTransition();

  const form = useForm<DatosDireccion>({
    resolver: zodResolver(esquemaDireccion),
    defaultValues: direccion ?? { direccion: "", referencia: "", activa: true },
  });

  const enviar = (datos: DatosDireccion) => {
    startTransition(async () => {
      const resultado = direccion
        ? await actualizarDireccion(direccion.id, datos)
        : await agregarDireccion(clienteId, datos);
      if (resultado.ok) {
        toast.success(direccion ? "Dirección actualizada." : "Dirección agregada.");
        onExito?.();
      } else {
        toast.error(resultado.error);
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(enviar)} className="space-y-4">
        <FormField
          control={form.control}
          name="direccion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección</FormLabel>
              <FormControl>
                <Textarea placeholder="Calle, número, colonia" autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="referencia"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Referencia (opcional)</FormLabel>
              <FormControl>
                <Input
                  className="h-11"
                  placeholder="Portón negro, entre calles…"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="activa"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <FormLabel>Dirección activa</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" className="h-11 w-full" disabled={pendiente}>
          {pendiente ? "Guardando…" : direccion ? "Guardar cambios" : "Agregar dirección"}
        </Button>
      </form>
    </Form>
  );
}
