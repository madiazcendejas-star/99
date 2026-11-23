# Ensayo de migración con los datos reales de Aquaplus

Se hace en un **proyecto nuevo de Supabase**. El ERP actual no se modifica y sigue funcionando.

1. `1_preparar_proyecto_nuevo.sql`: esquema de 99 ERP y funciones de migración (proyecto nuevo).
2. `2_copiar_datos_del_erp_actual.sql`: copia los datos del ERP actual a `legado`. Antes de correrlo, reemplaza el host y la contraseña marcados con `<<< >>>`. Al terminar borra la conexión.
3. `3_migrar_y_revisar.sql`: migra y muestra la comparación. Si se vuelve a correr, repite el ensayo desde cero.

Para repetir el ensayo con datos más recientes, corre de nuevo el paso 2 y luego el 3.

## Actualizaciones después del primer ensayo (23 nov 2026)

- `4_actualizar_migracion.sql`: ajusta la migración y repite el ensayo sin volver a copiar los datos. Cambios:
  - **surtidos parciales:** cada partida queda con lo surtido y cobrado; lo que faltó surtir se guarda en la venta como "Cancelado en el sistema anterior";
  - **ventas "entregada":** pasan como pendientes de cobro, salvo que tengan liquidación en caja o cobro en ruta.
- `5_ventas_entregadas_por_confirmar.sql`: lista de las ventas "entregada" para revisarlas con caja. Las que ya estén cobradas se anotan en `migracion.ventas_cobradas_confirmadas` y se repite el paso 3.
