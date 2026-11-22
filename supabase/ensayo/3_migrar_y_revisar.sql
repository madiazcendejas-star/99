-- ENSAYO · PASO 3 de 3 · Migrar y revisar
-- Se corre en el proyecto NUEVO. Si lo corres otra vez, repite el ensayo desde cero.

select migracion.migrar_aquaplus(true) as empresa_aquaplus;

select * from migracion.validar_aquaplus();
