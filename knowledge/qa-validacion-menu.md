# QA — Guía de validación del menú normalizado

**Fecha**: 2026-07-06 · **Fuente**: `knowledge/menu barbosa.xlsx` (solo Hoja1) · **Documento a validar**: `knowledge/menu-normalizado.md`

## Objetivo

Validar que la tabla normalizada refleja la carta real ANTES de insertarla en la base de datos del POS. **Nada del Excel se ha insertado aún** (solo existen en BD: 6 especialidades de pizza demo, 4 bebidas embotelladas, 4 sabores de alitas y 3 extras). Una vez aprobado este documento, se generará el script de inserción.

## Contexto: por qué se normalizó

1. **El Excel es un acomodo visual, no una tabla.** En las categorías de pizza, la columna Tamaño/Precio es una lista de la *categoría* que corre en paralelo a la lista de productos; no se corresponden fila por fila. Ejemplo real: la fila 8 dice "Arrachera | Mediana $230", pero la lectura correcta es que las 9 pizzas con pollo se venden en los 7 tamaños de su tabla (Mega $500 … Chica $200). Un import automático fila-a-fila habría asignado precios incorrectos.
2. **Hay datos fuera de lugar**: los precios de Texas Chilli (filas 53–56) estaban en la columna Descripción; la categoría de hamburguesas estaba en una celda con formato especial.
3. **El modelo del POS no representa 4 conceptos del menú** (ver sección "Huecos del modelo").

## Qué debe validar QA

### A. Decisiones de interpretación (D1–D11 en `menu-normalizado.md`)

| # | Decisión | Cómo validarla |
|---|---|---|
| D1 | Toda pizza se vende en TODOS los tamaños de su categoría | Confirmar con operación/cocina; marcar excepciones por pizza |
| D2 | Las 3 filas "Vegetariana" ¿son 3 pizzas distintas? | Confirmar nombres reales de carta |
| D3 | 7 tamaños canónicos de pizza (mega … chica) | Los nombres deben ser idénticos entre pizzas — requisito técnico de la pizza personalizada |
| D4 | Qué categorías son "especialidad" (mitades de personalizada) | Definir con el negocio: ¿solo Especialidades o también pollo/vegetarianas? |
| D5 | Sabores de precio único como variantes (frappes, boneless, etc.) | Validar que ningún sabor cambia el precio |
| D6 | Orilla de queso: 5 extras separados por tamaño | Confirmar y conseguir el precio del tamaño familiar (falta en Excel) |
| D7 | Paquetes L-V como tipo PROMOCIÓN | Confirmar días hábiles y definir composición exacta (ver C) |
| D8 | Correcciones de typos aplicadas | Revisar la lista; ningún nombre debe quedar mal en el ticket impreso |
| D9 | 11 sabores de alitas faltantes por dar de alta | Confirmar la lista de 15 contra la carta vigente |
| D10 | "Atún" y "Bacon Chicken Ranch" quedan en "Pizzas con pollo" | Confirmar categoría real |
| D11 | Extras no restringidos por producto (control por capacitación) | Decidir si se acepta o se pide cambio de sistema |

### B. Precios con anomalía (vienen así en el Excel — confirmar o corregir)

- [ ] Especialidades: **familiar $280 > cuadrada $255** (rompe la progresión por tamaño).
- [ ] **Pan de Ajo $95** la orden de 6 pzas (vs pasta completa $140).
- [ ] **Chilli dogs $35** (vs Hot Dog especial $28) — confirmar que no falta un dígito.
- [ ] Rellena especial **sin tamaño chica**; vegetarianas **sin familiar** — confirmar que es intencional.

### C. Datos faltantes en el Excel (sin esto el import queda incompleto)

- [ ] Precio de **"Fruta Extra"** (crepas).
- [ ] Precio de **orilla de queso familiar**.
- [ ] **Composición exacta de los 10 paquetes**: producto y tamaño de cada componente ("pizza grande" ¿cuál?, "refresco familiar" no existe como producto en BD, "rebanada de pizza" tampoco).
- [ ] Componentes de las 2 promociones "Para el antojo" (¿qué pizza cuadrada?, ¿alitas de cuántas piezas?).
- [ ] **Burrito de Costilla BBQ**: tiene tamaño (mediano/grande) Y sabor (3 salsas); el modelo soporta una dimensión. Elegir: 3 productos con 2 tamaños c/u, o 2 tamaños + sabor como nota del cajero.

### D. Verificación de totales

Contra la carta física/vigente:

- [ ] ~115 productos en ~30 categorías (ninguno de la carta falta en `menu-normalizado.md`).
- [ ] Muestreo de precios: al menos 2 productos por categoría contra la carta.
- [ ] Canal: solo "Para el antojo en sucursal" quedó marcada como exclusiva de establecimiento — ¿algún otro producto no se entrega a domicilio?

## Huecos del modelo (informativo — ya tienen propuesta)

1. **Sabores** no existen como concepto; se usarán variantes (mismo precio, un botón por sabor en el punto de venta). Alitas ya quedaron modeladas aparte (sabores combinables 2-3 según la orden, implementado y probado).
2. **Extras con precio dependiente del tamaño del padre** (orilla): se resuelve con un extra por tamaño.
3. **Paquetes con vigencia por días**: el tipo PAQUETE del sistema ignora días; se registrarán como PROMOCIÓN (respeta L-V).
4. **Extras dirigidos a productos específicos**: el sistema no restringe; control operativo.

## Criterio de aceptación para proceder al import

Todos los checkboxes de A, B y C resueltos (marcados o corregidos en `menu-normalizado.md`). Con eso se genera un script de inserción **idempotente** (no duplica si se corre dos veces, no toca los productos ya existentes en BD) y se ejecuta primero en desarrollo para revisión visual en el wizard de ventas antes de darlo por bueno.

---
*Documento generado a partir del análisis automático del Excel; ante cualquier discrepancia, la carta vigente del negocio manda.*
