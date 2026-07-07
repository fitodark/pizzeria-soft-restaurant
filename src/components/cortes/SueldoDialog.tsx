"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HandCoins } from "lucide-react";
import { toast } from "sonner";
import { esquemaSueldo, type DatosSueldo } from "@/lib/esquemas/cortes";
import { registrarSueldo } from "@/lib/acciones/cortes";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type EmpleadoParaSueldo = {
  id: string;
  nombre: string;
  sueldo: string;
  periodo: string;
};

export function SueldoDialog({ empleados }: { empleados: EmpleadoParaSueldo[] }) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, startTransition] = useTransition();

  const form = useForm<DatosSueldo>({
    resolver: zodResolver(esquemaSueldo),
    defaultValues: { empleadoId: "", monto: "" },
  });

  const alElegirEmpleado = (empleadoId: string) => {
    form.setValue("empleadoId", empleadoId);
    const empleado = empleados.find((e) => e.id === empleadoId);
    if (empleado && Number(empleado.sueldo) > 0) {
      form.setValue("monto", empleado.sueldo);
    }
  };

  const enviar = (datos: DatosSueldo) => {
    startTransition(async () => {
      const resultado = await registrarSueldo(datos);
      if (resultado.ok) {
        toast.success("Sueldo registrado.");
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
          <HandCoins className="size-4" />
          Registrar sueldo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar pago de sueldo</DialogTitle>
          <DialogDescription>
            Sale como egreso del corte actual.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(enviar)} className="space-y-4">
            <FormField
              control={form.control}
              name="empleadoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empleado</FormLabel>
                  <Select onValueChange={alElegirEmpleado} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue placeholder="Selecciona al empleado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {empleados.map((empleado) => (
                        <SelectItem key={empleado.id} value={empleado.id}>
                          {empleado.nombre} — {empleado.periodo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      placeholder="300.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="h-11 w-full" disabled={pendiente}>
              {pendiente ? "Guardando…" : "Registrar sueldo"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
