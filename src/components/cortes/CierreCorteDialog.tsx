"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { esquemaCerrarCorte, type DatosCerrarCorte } from "@/lib/esquemas/cortes";
import { cerrarCorte } from "@/lib/acciones/cortes";
import { formatoMoneda } from "@/lib/utils";
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
import { Textarea } from "@/components/ui/textarea";

type Props = {
  saldoInicial: string;
  ingresos: string;
  egresos: string;
  saldoEsperado: string;
};

export function CierreCorteDialog({
  saldoInicial,
  ingresos,
  egresos,
  saldoEsperado,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, startTransition] = useTransition();

  const form = useForm<DatosCerrarCorte>({
    resolver: zodResolver(esquemaCerrarCorte),
    defaultValues: { notasCierre: "" },
  });

  const enviar = (datos: DatosCerrarCorte) => {
    startTransition(async () => {
      const resultado = await cerrarCorte(datos);
      if (resultado.ok) {
        toast.success("Corte cerrado.");
        setAbierto(false);
      } else {
        toast.error(resultado.error);
      }
    });
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="h-11">
          <Lock className="size-4" />
          Cerrar corte
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cerrar corte de caja</DialogTitle>
          <DialogDescription>
            Se guardará el snapshot de totales. Esta acción no se puede
            deshacer.
          </DialogDescription>
        </DialogHeader>
        <dl className="space-y-1 rounded-lg border p-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Saldo inicial</dt>
            <dd className="tabular-nums">{formatoMoneda(saldoInicial)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Ingresos activos</dt>
            <dd className="tabular-nums text-success">
              +{formatoMoneda(ingresos)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Egresos activos</dt>
            <dd className="tabular-nums text-destructive">
              −{formatoMoneda(egresos)}
            </dd>
          </div>
          <div className="flex justify-between border-t pt-1 font-semibold">
            <dt>Saldo esperado en caja</dt>
            <dd className="tabular-nums">{formatoMoneda(saldoEsperado)}</dd>
          </div>
        </dl>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(enviar)} className="space-y-4">
            <FormField
              control={form.control}
              name="notasCierre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas de cierre (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Diferencias, incidencias…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              variant="destructive"
              className="h-11 w-full"
              disabled={pendiente}
            >
              {pendiente ? "Cerrando…" : "Cerrar corte"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
