# Menú Barbosa — tabla normalizada (derivada de `menu barbosa.xlsx`, Hoja1)

> **Propósito**: validar esta interpretación ANTES de insertar nada en la base de datos.
> Corrige directamente en este archivo lo que no coincida con la operación real.
>
> Convenciones: una fila = un producto; sus tamaños/precios van en la columna
> "Variantes". En las categorías de pizza, el Excel lista los tamaños en columnas
> paralelas a los productos: aquí se asume que **todos los productos de la categoría
> existen en todos los tamaños de su tabla** (decisión D1).

---

## ⚠️ Decisiones pendientes (marcar antes del import)

- [ ] **D1 — Expansión pizzas × tamaños**: cada pizza de una categoría se vende en TODOS los tamaños de la tabla de su categoría (así se interpretó el Excel). ¿Correcto?
- [ ] **D2 — "Vegetariana" aparece 3 veces con descripciones distintas** (¿son 3 pizzas diferentes que necesitan nombre propio, o una sola?).
- [ ] **D3 — Tamaños canónicos de pizza** propuestos: `mega` (45×55, 30 reb) · `cuadrada grande` (45×45, 20 cuadros) · `cuadrada` (42 cm, 16 reb) · `familiar` (12 reb) · `grande` (40 cm, 8-10 reb) · `mediana` (35 cm, 8 reb) · `chica` (30 cm, 6 reb). Los nombres deben ser idénticos entre pizzas para que funcione la pizza personalizada.
- [ ] **D4 — ¿Qué categorías son "especialidad"** (elegibles como mitad de pizza personalizada)? Propuesta: Pizzas Especialidades + Pizzas con pollo + Vegetarianas (todas menos Calzone/Stromboli y Rellena).
- [ ] **D5 — Sabores de precio único** (frappes, boneless, q-tiras, costillas, quesadilla, torta de milanesa, crepas sencillas, sodas…): se propone registrarlos como **variantes** del producto (un botón por sabor en el wizard, mismo precio). Las alitas ya quedaron como productos por sabor (se combinan entre sí).
- [ ] **D6 — Orilla/deditos de queso**: su precio depende del tamaño de la pizza; los extras del sistema tienen precio único. Propuesta: 5 productos EXTRA separados ("Orilla de queso mega" $85, "…cuadrada" $65, "…grande/mediana/chica" $45) y el cajero elige el que corresponde. Falta definir el precio en tamaño **familiar** (no aparece en el Excel).
- [ ] **D7 — Paquetes Lunes–Viernes**: la regla actual del sistema hace que el tipo PAQUETE ignore los días; se registrarán como tipo **PROMOCIÓN** con días L-V. Además hay que definir la composición exacta (qué pizza/refresco entra en cada paquete) — ver sección Paquetes.
- [ ] **D8 — Typos corregidos** (validar): reresco→refresco · quezo→queso · Lemon Peper→Lemon Pepper · BQQ Habanero→BBQ Habanero · Hanbanero→Habanero · Chilli fies→Chilli fries · pasor→pastor · Brocoli→Brócoli · Peperoni se dejó como "Pepperoni" · en Frappes el Excel repite "Fresa" dos veces (se dejó una).
- [ ] **D9 — Alitas**: el menú trae **15 sabores**; en BD ya existen 4 (BBQ, Búfalo, Habanero, Lemon Pepper). Faltan 11 por dar de alta: Agridulce, Mango Habanero, Queso Cheddar, Takis Fuego, Flamin Hot, Diego Splash, Valentina, BBQ Habanero, Parmesano, Piña Mango Habanero, Wild Lemon.
- [ ] **D10 — "Atún" y "Bacon Chicken Ranch"** aparecen en el bloque de "Pizzas con pollo" (¿se quedan en esa categoría?).
- [ ] **D11 — Extras dirigidos**: el sistema hoy permite agregar cualquier extra a cualquier producto que admita extras; el menú sugiere extras específicos (Pan de Ajo→pastas, Fruta Extra→crepas, Extra con papas→boneless/tortas/burritos BBQ). Se maneja por capacitación del cajero, salvo que quieras restringirlo en sistema (cambio de modelo).

---

## 1. Pizzas con pollo — tipo COMIDA

**Tamaños/precios de la categoría** (aplican a las 9 pizzas):

| mega | cuadrada grande | cuadrada | familiar | grande | mediana | chica |
|---:|---:|---:|---:|---:|---:|---:|
| $500 | $360 | $300 | $300 | $280 | $230 | $200 |

| Producto | Descripción |
|---|---|
| Barbosa Mexicana | Pollo, chorizo, champiñones, cebolla, jalapeños |
| Brócoli con pollo | Pizza blanca base de ajo |
| Champipollo | Pollo, champiñones, queso cheddar |
| BBQ | Pollo, BBQ y aderezo ranch |
| Parrillada | Asada, pollo, carne al pastor, chorizo, cebolla, salsa de la casa y cilantro |
| Arrachera | Frijoles, aderezo picoso, queso |
| Búfalo | Pollo, aderezo picoso, queso |
| Bacon Chicken Ranch | Pollo, tocino, aderezo ranch |
| Atún | Jitomate, cebolla, aderezo y aguacate *(ver D10)* |

## 2. Pizzas Vegetarianas — tipo COMIDA

**Tamaños/precios** (sin familiar):

| mega | cuadrada grande | cuadrada | grande | mediana | chica |
|---:|---:|---:|---:|---:|---:|
| $460 | $310 | $225 | $195 | $170 | $140 |

| Producto | Descripción |
|---|---|
| Vegetariana (¿espinaca?) | Espinacas con jitomate *(ver D2)* |
| Vegetariana (¿especial?) | Brócoli, jitomate, cebolla, jalapeño y champiñones *(ver D2)* |
| Vegetariana (¿sencilla?) | Brócoli, jitomate y jalapeño *(ver D2)* |

## 3. Pizza especial — tipo COMIDA

| Producto | Variantes |
|---|---|
| Calzone | pieza → $110 |
| Stromboli | pieza → $110 |

## 4. Pizzas Especialidades — tipo COMIDA · `es_especialidad`

**Tamaños/precios** (aplican a las 14 pizzas):

| mega | cuadrada grande | cuadrada | familiar | grande | mediana | chica |
|---:|---:|---:|---:|---:|---:|---:|
| $440 | $310 | $255 | $280 | $210 | $190 | $170 |

*(Ojo: familiar $280 > cuadrada $255 — así viene en el Excel, validar.)*

| Producto | Descripción |
|---|---|
| Barbosa Combinada | Jamón, salami, chorizo, champiñones, pimiento |
| Barbosa Especial | Jamón, chorizo, champiñones, cebolla, jalapeño |
| Pepperoni | Pepperoni |
| Pepperoni Especial | Pepperoni, champiñones, jalapeños |
| Italiana | Pepperoni, champiñones, jamón |
| Americana | Pepperoni, jamón, aceitunas negras, pimiento |
| Hawaiana | Jamón y piña |
| Azteca | Frijoles, cebolla, tocino, jalapeños, champiñones y aguacate |
| Ranchera | Jalapeños, chorizo, frijoles, tocino y aguacate |
| Carnes Frías | Salami, jamón, chorizo y pepperoni |
| Pastor | Carne al pastor, piña, cebolla y cilantro |
| Boloñesa | Carne molida, tocino y cebolla |
| California | Pepperoni, piña y jalapeño |
| Oaxaqueña | Jalapeños, chorizo y frijoles |

## 5. Orilla o deditos de queso — tipo COMIDA · EXTRA *(ver D6)*

| Extra propuesto | Precio |
|---|---:|
| Orilla de queso (mega) | $85 |
| Orilla de queso (cuadrada) | $65 |
| Orilla de queso (grande) | $45 |
| Orilla de queso (mediana) | $45 |
| Orilla de queso (chica) | $45 |
| Orilla de queso (familiar) | **¿?** falta en el Excel |

## 6. Especial de la casa — tipo COMIDA

| Producto | Descripción | Variantes |
|---|---|---|
| Rellena especial | Carne al pastor, jamón, aceitunas negras y chile morrón | mega → $470 · cuadrada grande → $340 · cuadrada → $285 · familiar → $310 · grande → $245 · mediana → $215 *(sin chica)* |

## 7. Texas Chilli — tipo COMIDA *(precios estaban en la columna Descripción)*

| Producto | Variantes |
|---|---|
| Chilli nachos | orden → $120 |
| Chilli dogs | orden → $35 |
| Chilli fries | orden → $100 |
| Tazón de Chilli | orden → $100 |

## 8. Snacks Papas — tipo COMIDA

| Producto | Descripción | Precio (orden) |
|---|---|---:|
| Papas a la francesa | | $50 |
| Papas horneadas con queso mozzarella | | $75 |
| Papas con queso cheddar | | $75 |
| Papas pizza | Salsa marinara, queso mozzarella y pepperoni | $100 |
| Papas en gajos | | $65 |

## 9. Snacks Bocadillos — tipo COMIDA

| Producto | Sabores (variantes, ver D5) | Precio (orden) |
|---|---|---:|
| Palomitas de camarón | | $100 |
| Jalapeños rellenos | | $70 |
| Dedos de queso con mozzarella | | $70 |
| Aros de cebolla | | $70 |
| Nuggets de pollo | | $80 |
| Combo Delipan | | $190 |
| Q-tiras | Búfalo · Agridulce · BBQ Habanero · Mango Habanero | $100 |

## 10. Snacks Costillas — tipo COMIDA

| Producto | Sabores (variantes) | Precio (orden) |
|---|---|---:|
| Costillas BBQ | BBQ · BBQ Piquín · BBQ Habanero | $100 |

## 11. Snacks Boneless — tipo COMIDA · admite "Extra con papas"

| Producto | Sabores (variantes) | Precio (orden) |
|---|---|---:|
| Boneless | Búfalo · Agridulce · Orientales · BBQ Habanero · Mango Habanero · Lemon Pepper · Diego Splash · Piña Mango Habanero | $100 |

## 12. Snacks Nachos — tipo COMIDA

| Producto | Descripción | Precio (orden) |
|---|---|---:|
| Nachos Sencillos | Queso cheddar, jalapeños, lechuga y jitomate | $65 |
| Nachos Especiales | Pollo, queso gratinado, frijoles, jalapeños, lechuga y jitomate | $85 |

## 13. Alitas — tipo COMIDA · YA MODELADO *(ver D9)*

15 sabores como productos; cada uno con 4 variantes de orden:

| Orden | Precio | Máx. sabores combinables |
|---|---:|---:|
| 7 pzas | $110 | 1 |
| 10 pzas | $150 | 2 |
| 14 pzas | $210 | 3 |
| 20 pzas | $290 | 3 |

Sabores: Agridulce · Búfalo✔ · BBQ✔ · Habanero✔ · Mango Habanero · Lemon Pepper✔ · Queso Cheddar · Takis Fuego · Flamin Hot · Diego Splash · Valentina · BBQ Habanero · Parmesano · Piña Mango Habanero · Wild Lemon *(✔ = ya en BD)*

## 14. Bebidas — tipo BEBIDA *(sabores como variantes, ver D5)*

| Producto | Sabores | Precio |
|---|---|---:|
| Frappes | Ferrero · Rompope · Capuchino · Vainilla · Chocoreta · Moka · Baileys · Mazapán · Gansito · Cajeta · Fresa · Chocolate Blanco · Oreo | $80 |
| Smoothies / Fruta natural | Frambuesa · Manzana Verde · Blueberry Banana · Fresa · Arándano · Mango | $85 |
| Sodas con perlas explosivas | Fresa · Mango · Kiwi · Frutos Rojos · Mora Azul · Manzana Verde · Sandía · Arándano · Frambuesa | $50 |
| Soda Glitter | Mora Azul · Bubaloo *(el Excel dice "Bubalo")* · Frutos Rojos · Fresa · Chicle · Frambuesa · Mango | $50 |
| Granizados | Mango · Fresa · Limón pepino | $80 |
| Ice Especiales | Cereza · Mora Azul | $60 |

## 15. Hamburguesas — tipo COMIDA *(el Excel dice "Hamburguesa")*

| Producto | Descripción | Precio (unidad) |
|---|---|---:|
| Barbosa Furiosa | Lechuga, jitomate, aros de cebolla, tocino, salsa picante y queso amarillo | $100 |
| California | Lechuga, jitomate, queso y cebolla | $100 |
| Barbosa Especial | Champiñones, cebolla caramelizada, tocino y queso | $100 |
| Hawaiana | Lechuga, jitomate, piña, jamón y queso mozzarella | $100 |
| Jumay | Lechuga, jitomate, aderezo, tocino y queso amarillo | $100 |
| Queso y tocino | | $100 |
| Arrachera | Lechuga, jitomate, cebolla, aguacate, jalapeños y queso mozzarella | $110 |

*(Nota: "California", "Hawaiana", "Barbosa Especial" y "Arrachera" repiten nombre con pizzas: se sugiere anteponer "Hamburguesa …" en el nombre del producto.)*

## 16. Hamburguesas de pollo — tipo COMIDA

| Producto | Descripción | Precio (unidad) |
|---|---|---:|
| Pechuga a la plancha | Lechuga y jitomate | $105 |
| Pechuga frita | Lechuga y jitomate | $105 |
| Popeye | Pechuga a la plancha, espinacas y queso gratinado | $105 |
| A la rancherita | Lechuga, jitomate, tocino, champiñones, queso y salsa BBQ | $105 |
| Búfalo | Lechuga, jitomate, tocino, queso y salsa búfalo | $105 |
| BBQ | Lechuga, jitomate, tocino, queso y salsa BBQ con aros de cebolla | $105 |

## 17. Club Sandwich — tipo COMIDA

| Producto | Descripción | Precio (unidad) |
|---|---|---:|
| Club Mixto | Lechuga, jitomate, jamón, pollo, tocino y queso amarillo | $95 |
| Club de Jamón | Lechuga, jitomate, tocino y queso amarillo | $85 |

## 18. Baguettes — tipo COMIDA

| Producto | Descripción | Precio (unidad) |
|---|---|---:|
| Pizza Steak | Queso y salsa marinara | $100 |
| Cheesesteak | Tocino y queso | $100 |
| Cheesesteak Barbosa | Cebolla frita, champiñones, chile morrón y queso | $100 |
| Cheesesteak de pollo | Cebolla frita, lechuga, jitomate y jalapeños | $100 |
| Pepperoni Cheesesteak | Pepperoni, cebolla, jalapeño y queso | $100 |

## 19. Pastas — tipo COMIDA · admiten extra "Pan de Ajo"

| Producto | Variantes | Precio |
|---|---|---:|
| Pasta de Res | orden (spaguetti con albóndigas) | $140 |
| Pasta a la Diabla | con pollo → $140 · con camarones → $180 | |
| Pasta con Pollo parmesano | orden | $140 |
| Pasta Alfredo | con pollo → $140 · con camarones → $180 | |
| Pasta Chow Mein | orden | $140 |
| Lasagna Italiana | orden (acompañada con pan de ajo) | $130 |

## 20. Ensaladas — tipo COMIDA

| Producto | Precio (orden) |
|---|---:|
| Ensalada Chef | $110 |
| Ensalada César | $110 |
| Ensalada Mediterránea | $120 |
| Ensalada César estilo Cajún | $120 |
| Ensalada Tropical | $120 |
| Ensalada de Atún | $120 |

## 21. Postres — tipo COMIDA

| Producto | Sabores (variantes) | Precio |
|---|---|---:|
| Crepas sencillas (1 ingrediente) — admite "Fruta Extra" | Crema de avellana · Lechera · Cajeta · Mermelada de fresa · Crema de maní · Philadelphia | $45 |
| Crepas especiales dulces: Light · Golosa · Princesa · Vaquera · Philadelphia · Gringa | (productos individuales con su descripción) | $75 c/u |
| Crepas saladas: Hawaiano · Chrepizza · Crepocino · Choriqueso · Mexicana | (productos individuales con su descripción) | $85 c/u |

## 22. Burritos — tipo COMIDA *(cada uno: mediano → $85 · grande → $100)*

Rollito Primavera · Rollito Ranchero · Rollito Oaxaqueño · Rollito Pastor · Rollito Supremo · Burrito Cubano · Burrito Mexicano · Burrito California *(descripciones según Excel)*

## 23. Burritos de Arrachera — tipo COMIDA *(mediano → $90 · grande → $110)*

Burrito de Arrachera · Arrachera Especial

## 24. Burritos de Costilla BBQ — tipo COMIDA · admite "Extra con papas"

| Producto | Sabores (variantes de salsa) | Variantes de tamaño |
|---|---|---|
| Burrito de Costilla BBQ | BBQ · BBQ Habanero · BBQ Mango Habanero | mediano → $90 · grande → $110 |

*(⚠️ este producto tiene DOS dimensiones: tamaño Y sabor — el modelo solo soporta una. Propuesta: variantes por tamaño y el sabor como nota/selección del cajero, o 3 productos "Burrito Costilla BBQ", "…Habanero", "…Mango Habanero" con 2 tamaños c/u. Decidir.)*

## 25. Tortas — tipo COMIDA · admiten "Extra con papas"

| Producto | Precio (unidad) |
|---|---:|
| Torta al Pastor | $90 |
| Torta Cubana | $110 |
| Torta Barbosa | $110 |
| Italian Hogie | $80 |
| Milanesa de Pollo estilo Italiano | $100 |
| Torta de Milanesa (Rollo · Res · Puerco como variantes) | $90 |

## 26. Hot Dogs — tipo COMIDA

Clásico $18 · Con queso $20 · Con tocino $20 · Especial $28

## 27. Quesadillas — tipo COMIDA

| Producto | Sabores (variantes) | Precio |
|---|---|---:|
| Quesadilla | Res · Pollo | $75 |

## 28. Extras (tipo_articulo = EXTRA)

| Extra | Precio | Sugerido para |
|---|---:|---|
| Extra con papas | $20 | Boneless, tortas, burritos de costilla |
| Pan de Ajo (orden de 6 pzas) | $95 | Pastas — *(¿$95 es correcto? validar)* |
| Fruta Extra (crepas) | **¿?** | Crepas sencillas — precio no viene en el Excel |
| Orilla de queso (5 tamaños) | ver sección 5 | Pizzas |
| Queso extra ✔ ya en BD | $25 | |
| Aderezo Ranch / Blue Cheese ✔ ya en BD | $15 | Alitas |

## 29. Paquetes — registrar como PROMOCIÓN con días L-V *(ver D7)*

| Paquete | Contenido (texto del menú) | Precio | Por definir |
|---|---|---:|---|
| Paquete 1 | Rebanada de pizza + hot dog + refresco | $65 | "rebanada de pizza" no existe como producto |
| Paquete 2 | 2 hot dogs + refresco | $65 | ¿cuál hot dog? ¿cuál refresco? |
| Paquete 3 | 1 hamburguesa + papas + refresco | $100 | ¿cuál hamburguesa/papas? |
| Paquete 4 | 2 burritos + refresco | $110 | ¿cuáles burritos? |
| Paquete 5 | 1 cheesesteak + papas + refresco | $110 | ¿cuál cheesesteak? |
| Paquete 6 | Pizza grande + papas + refresco familiar | $265 | ¿cualquier pizza grande? "refresco familiar" no existe como producto |
| Paquete 7 | 5 hamburguesas con papas + refresco familiar | $390 | |
| Paquete 8 | Pizza familiar cuadrada + papas + refresco familiar | $310 | |
| Paquete 9 | Pizza familiar cuadrada + alitas + papas + refresco | $360 | ¿orden de alitas de cuántas pzas? |
| Paquete 10 | Mega pizza (30 reb) + alitas + papas + refresco familiar | $610 | |

## 30. Promociones (todos los días)

| Promoción | Contenido | Precio | Canal |
|---|---|---:|---|
| Para el antojo | Pizza cuadrada + papas + refresco + orden de 10 alitas | $400 | ambos |
| Para el antojo en sucursal | Pizza grande + papas + refresco + alitas | $360 | solo establecimiento |

---

## Resumen

- **~30 categorías, ~115 productos, ~240 variantes** (la expansión pizzas×tamaños genera la mayoría).
- Faltan datos en el Excel: precio de "Fruta Extra", orilla familiar, refrescos embotellados (los paquetes los referencian; en BD ya existen 4), composición exacta de los 10 paquetes.
- Producto con doble dimensión (tamaño+sabor): Burrito de Costilla BBQ (sección 24) — única pieza que requiere decisión de modelado.
