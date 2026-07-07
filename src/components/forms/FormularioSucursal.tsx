"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { esquemaSucursal, type DatosSucursal } from "@/lib/esquemas/sucursales";
import { crearSucursal, actualizarSucursal } from "@/lib/acciones/sucursales";
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

type Props = {
  /** Si viene, es edición; si no, alta. */
  sucursal?: DatosSucursal & { id: string };
  onExito?: () => void;
};

export function FormularioSucursal({ sucursal, onExito }: Props) {
  const [pendiente, startTransition] = useTransition();

  const form = useForm<DatosSucursal>({
    resolver: zodResolver(esquemaSucursal),
    defaultValues: sucursal ?? {
      nombre: "",
      calle: "",
      colonia: "",
      ciudad: "",
      estado: "",
      codigoPostal: "",
      telefono: "",
      activa: true,
    },
  });

  const enviar = (datos: DatosSucursal) => {
    startTransition(async () => {
      const resultado = sucursal
        ? await actualizarSucursal(sucursal.id, datos)
        : await crearSucursal(datos);
      if (resultado.ok) {
        toast.success(sucursal ? "Sucursal actualizada." : "Sucursal creada.");
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
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input className="h-11" placeholder="Sucursal Centro" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="calle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Calle y número</FormLabel>
                <FormControl>
                  <Input className="h-11" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="colonia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Colonia</FormLabel>
                <FormControl>
                  <Input className="h-11" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ciudad"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ciudad</FormLabel>
                <FormControl>
                  <Input className="h-11" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="estado"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <FormControl>
                  <Input className="h-11" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="codigoPostal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código postal</FormLabel>
                <FormControl>
                  <Input className="h-11" inputMode="numeric" maxLength={5} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="telefono"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input className="h-11" inputMode="tel" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="activa"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <FormLabel>Sucursal activa</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" className="h-11 w-full" disabled={pendiente}>
          {pendiente ? "Guardando…" : sucursal ? "Guardar cambios" : "Crear sucursal"}
        </Button>
      </form>
    </Form>
  );
}
