"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LockOpen } from "lucide-react";
import { toast } from "sonner";
import { esquemaAbrirCorte, type DatosAbrirCorte } from "@/lib/esquemas/cortes";
import { abrirCorte } from "@/lib/acciones/cortes";
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

export function AperturaCorteDialog() {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, startTransition] = useTransition();

  const form = useForm<DatosAbrirCorte>({
    resolver: zodResolver(esquemaAbrirCorte),
    defaultValues: { saldoInicial: "" },
  });

  const enviar = (datos: DatosAbrirCorte) => {
    startTransition(async () => {
      const resultado = await abrirCorte(datos);
      if (resultado.ok) {
        toast.success("Corte abierto.");
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
        <Button className="h-11">
          <LockOpen className="size-4" />
          Abrir corte
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Abrir corte de caja</DialogTitle>
          <DialogDescription>
            Captura el efectivo con el que inicia la caja.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(enviar)} className="space-y-4">
            <FormField
              control={form.control}
              name="saldoInicial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Saldo inicial</FormLabel>
                  <FormControl>
                    <Input
                      className="h-11 text-right tabular-nums"
                      inputMode="decimal"
                      placeholder="500.00"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="h-11 w-full" disabled={pendiente}>
              {pendiente ? "Abriendo…" : "Abrir corte"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
