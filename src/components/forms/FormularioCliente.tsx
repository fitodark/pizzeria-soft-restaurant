"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { esquemaCliente, type DatosCliente } from "@/lib/esquemas/clientes";
import { actualizarCliente, crearCliente } from "@/lib/acciones/clientes";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  /** Si viene, es edición (solo nombre y teléfono). */
  cliente?: { id: string; nombre: string; telefono: string };
  onExito?: () => void;
};

export function FormularioCliente({ cliente, onExito }: Props) {
  const [pendiente, startTransition] = useTransition();
  const esEdicion = Boolean(cliente);

  const form = useForm<DatosCliente>({
    resolver: zodResolver(esquemaCliente),
    defaultValues: {
      nombre: cliente?.nombre ?? "",
      telefono: cliente?.telefono ?? "",
      direccion: "",
      referencia: "",
    },
  });

  const enviar = (datos: DatosCliente) => {
    startTransition(async () => {
      const resultado = cliente
        ? await actualizarCliente(cliente.id, {
            nombre: datos.nombre,
            telefono: datos.telefono,
          })
        : await crearCliente(datos);
      if (resultado.ok) {
        toast.success(cliente ? "Cliente actualizado." : "Cliente creado.");
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
          name="telefono"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <Input
                  className="h-11 tabular-nums"
                  inputMode="tel"
                  placeholder="3312345678"
                  autoFocus
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!esEdicion ? (
          <>
            <FormField
              control={form.control}
              name="direccion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Calle, número, colonia"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Obligatoria solo para ventas a domicilio; puedes agregarla
                    después.
                  </FormDescription>
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
          </>
        ) : null}
        <Button type="submit" className="h-11 w-full" disabled={pendiente}>
          {pendiente ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear cliente"}
        </Button>
      </form>
    </Form>
  );
}
