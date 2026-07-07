"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  esquemaAjusteInventario,
  type DatosAjusteInventario,
} from "@/lib/esquemas/inventario";
import { ajustarInventario } from "@/lib/acciones/inventario";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  productoId: string;
  nombreProducto: string;
  existenciaActual: string;
};

export function DialogoAjuste({
  productoId,
  nombreProducto,
  existenciaActual,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, startTransition] = useTransition();

  const form = useForm<DatosAjusteInventario>({
    resolver: zodResolver(esquemaAjusteInventario),
    defaultValues: {
      productoId,
      nuevaExistencia: existenciaActual,
      motivo: "",
    },
  });

  const enviar = (datos: DatosAjusteInventario) => {
    startTransition(async () => {
      const resultado = await ajustarInventario(datos);
      if (resultado.ok) {
        toast.success("Existencia ajustada.");
        setAbierto(false);
        form.reset({ productoId, nuevaExistencia: datos.nuevaExistencia, motivo: "" });
      } else {
        toast.error(resultado.error);
      }
    });
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontal className="size-4" />
          Ajustar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajustar existencia</DialogTitle>
          <DialogDescription>
            {nombreProducto} — existencia actual: {existenciaActual}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(enviar)} className="space-y-4">
            <FormField
              control={form.control}
              name="nuevaExistencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva existencia</FormLabel>
                  <FormControl>
                    <Input
                      className="h-11 text-right tabular-nums"
                      inputMode="decimal"
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
              name="motivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <Input
                      className="h-11"
                      placeholder="Conteo físico, merma, caducidad…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="h-11 w-full" disabled={pendiente}>
              {pendiente ? "Guardando…" : "Guardar ajuste"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
