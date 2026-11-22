# Ensayo de migración con los datos reales de Aquaplus

Se hace en un **proyecto nuevo de Supabase**. El ERP actual no se modifica y sigue funcionando.

1. `1_preparar_proyecto_nuevo.sql`: esquema de 99 ERP y funciones de migración (proyecto nuevo).
2. `2_copiar_datos_del_erp_actual.sql`: copia los datos del ERP actual a `legado`. Antes de correrlo, reemplaza el host y la contraseña marcados con `<<< >>>`. Al terminar borra la conexión.
3. `3_migrar_y_revisar.sql`: migra y muestra la comparación. Si se vuelve a correr, repite el ensayo desde cero.

Para repetir el ensayo con datos más recientes, corre de nuevo el paso 2 y luego el 3.
