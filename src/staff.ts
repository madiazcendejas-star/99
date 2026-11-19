/**
 * Listas de personal que usan otros módulos (choferes, almacenistas, supervisores con PIN).
 * App las actualiza a partir de Colaboradores en cada render.
 */
export const staff = {
  drivers: ["Roberto García", "Manuel Torres", "Jesús Hernández"],
  pickers: ["Luis Ortega", "Mario Vega"],
  supervisors: [
    { name: "Carlos Mendoza", role: "Administrador", pin: "1234" },
    { name: "Laura Gómez", role: "Gerente de sucursal", pin: "5678" },
  ],
};

export const setStaff = (next: Partial<typeof staff>) => Object.assign(staff, next);
