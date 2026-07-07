"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Receipt } from "lucide-react";
import { toast } from "sonner";
import { esquemaGasto, type DatosGasto } from "@/lib/esquemas/cortes";
import { registrarGasto } from "@/lib/acciones/cortes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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

export function GastoDialog() {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, startTransition] = useTransition();

  const form = useForm<DatosGasto>({
    resolver: zodResolver(esquemaGasto),
    defaultValues: { descripcion: "", monto: "" },
  });

  const enviar = (datos: DatosGasto) => {
    startTransition(async () => {
      const resultado = await registrarGasto(datos);
      if (resultado.ok) {
        toast.success("Gasto registrado.");
        setAbierto(false);
        form.reset();
      } else {
        toast.error(resultado.error);
      }
    });
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11">
          <Receipt className="size-4" />
          Registrar gasto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar gasto</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(enviar)} className="space-y-4">
            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Input
                      className="h-11"
                      placeholder="Gas, bolsas, servilletas…"
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
              name="monto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto</FormLabel>
                  <FormControl>
                    <Input
                      className="h-11 text-right tabular-nums"
                      inputMode="decimal"
                      placeholder="150.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="h-11 w-full" disabled={pendiente}>
              {pendiente ? "Guardando…" : "Registrar gasto"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
