import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

function atNoon(offsetDays: number) {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date;
}

function fixedDate(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

async function main() {
  console.log("Limpiando datos anteriores...");
  await prisma.maintenanceLog.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.preventivePlan.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  const [tecnicoRole, adminRole, gerenciaRole] = await Promise.all([
    prisma.role.create({ data: { name: "tecnico", label: "Técnico biomédico" } }),
    prisma.role.create({ data: { name: "administrador", label: "Administrador" } }),
    prisma.role.create({ data: { name: "gerencia", label: "Gerencia" } }),
  ]);

  const password = await hash("Vigia2026*", 10);

  const [tecnico, admin] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Emanuel Campo",
        email: "tecnico@vigia.co",
        passwordHash: password,
        roleId: tecnicoRole.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Daniel Rodríguez",
        email: "admin@vigia.co",
        passwordHash: password,
        roleId: adminRole.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Roberto Fernández",
        email: "gerencia@vigia.co",
        passwordHash: password,
        roleId: gerenciaRole.id,
      },
    }),
  ]);

  console.log("Creando equipos...");
  const equiposData = [
    {
      code: "EQ-001",
      name: "Monitor de signos vitales",
      brand: "Mindray",
      model: "uMEC12",
      serial: "MN-2021-001",
      location: "UCI Pediátrica",
      acquisitionDate: fixedDate("2021-03-15"),
      status: "operativo",
      criticality: "alta",
      notes: "Equipo de monitoreo continuo para pacientes críticos.",
    },
    {
      code: "EQ-002",
      name: "Ventilador mecánico",
      brand: "Dräger",
      model: "Savina 300",
      serial: "DR-2019-014",
      location: "UCI Pediátrica",
      acquisitionDate: fixedDate("2019-08-10"),
      status: "en_mantenimiento",
      criticality: "alta",
      notes: "En mantenimiento preventivo programado.",
    },
    {
      code: "EQ-003",
      name: "Incubadora neonatal",
      brand: "Fanem",
      model: "1186",
      serial: "FN-2022-007",
      location: "Neonatología",
      acquisitionDate: fixedDate("2022-01-20"),
      status: "operativo",
      criticality: "alta",
      notes: "Control de temperatura y humedad.",
    },
    {
      code: "EQ-004",
      name: "Bomba de infusión",
      brand: "B. Braun",
      model: "Infusomat Space",
      serial: "BB-2020-032",
      location: "Hospitalización",
      acquisitionDate: fixedDate("2020-06-05"),
      status: "operativo",
      criticality: "media",
      notes: "Infusión controlada de medicamentos.",
    },
    {
      code: "EQ-005",
      name: "Desfibrilador",
      brand: "Zoll",
      model: "R Series",
      serial: "ZL-2018-003",
      location: "Urgencias",
      acquisitionDate: fixedDate("2018-11-12"),
      status: "operativo",
      criticality: "alta",
      notes: "Verificación diaria de batería y electrodos.",
    },
    {
      code: "EQ-006",
      name: "Ecógrafo",
      brand: "GE",
      model: "Voluson S6",
      serial: "GE-2023-021",
      location: "Consulta externa",
      acquisitionDate: fixedDate("2023-04-18"),
      status: "operativo",
      criticality: "media",
      notes: "Ecografía pediátrica y obstétrica.",
    },
    {
      code: "EQ-007",
      name: "Autoclave",
      brand: "Tuttnauer",
      model: "3870EA",
      serial: "TT-2017-009",
      location: "Central de esterilización",
      acquisitionDate: fixedDate("2017-09-30"),
      status: "fuera_servicio",
      criticality: "media",
      notes: "Fuera de servicio por vencimiento de mantenimiento.",
    },
    {
      code: "EQ-008",
      name: "Cama eléctrica pediátrica",
      brand: "Hill-Rom",
      model: "Progressa",
      serial: "HR-2021-045",
      location: "Hospitalización",
      acquisitionDate: fixedDate("2021-12-01"),
      status: "operativo",
      criticality: "baja",
      notes: "Cama con control eléctrico de posición.",
    },
    {
      code: "EQ-009",
      name: "Aspirador de secreciones",
      brand: "Medela",
      model: "Dominant Flex",
      serial: "MD-2022-018",
      location: "UCI Pediátrica",
      acquisitionDate: fixedDate("2022-07-11"),
      status: "operativo",
      criticality: "alta",
      notes: "Aspiración de secreciones en pacientes ventilados.",
    },
    {
      code: "EQ-010",
      name: "Lámpara de fototerapia",
      brand: "Natus",
      model: "neoBlue",
      serial: "NT-2023-006",
      location: "Neonatología",
      acquisitionDate: fixedDate("2023-02-22"),
      status: "operativo",
      criticality: "media",
      notes: "Tratamiento de ictericia neonatal.",
    },
  ];

  const equipos = [];
  for (const data of equiposData) {
    const equipo = await prisma.equipment.create({ data });
    equipos.push(equipo);
    await prisma.maintenanceLog.create({
      data: {
        equipmentId: equipo.id,
        date: equipo.acquisitionDate ?? atNoon(-180),
        eventType: "registro",
        description: "Registro inicial del equipo y apertura de la hoja de vida.",
      },
    });
  }

  const byCode = Object.fromEntries(equipos.map((equipo) => [equipo.code, equipo]));

  console.log("Creando planes preventivos...");
  const planes = [
    { code: "EQ-001", frequencyDays: 90, lastOffset: -80, nextOffset: 10 },
    { code: "EQ-002", frequencyDays: 60, lastOffset: -55, nextOffset: 5 },
    { code: "EQ-003", frequencyDays: 120, lastOffset: -110, nextOffset: 10 },
    { code: "EQ-004", frequencyDays: 90, lastOffset: -70, nextOffset: 20 },
    { code: "EQ-005", frequencyDays: 180, lastOffset: -170, nextOffset: 10 },
    { code: "EQ-006", frequencyDays: 180, lastOffset: -150, nextOffset: 30 },
    { code: "EQ-007", frequencyDays: 30, lastOffset: -35, nextOffset: -5 },
    { code: "EQ-008", frequencyDays: 90, lastOffset: -60, nextOffset: 30 },
    { code: "EQ-009", frequencyDays: 60, lastOffset: -50, nextOffset: 10 },
    { code: "EQ-010", frequencyDays: 120, lastOffset: -100, nextOffset: 20 },
  ];

  for (const plan of planes) {
    await prisma.preventivePlan.create({
      data: {
        equipmentId: byCode[plan.code].id,
        frequencyDays: plan.frequencyDays,
        lastDate: atNoon(plan.lastOffset),
        nextDate: atNoon(plan.nextOffset),
        notes: "Plan creado a partir de la periodicidad definida por el fabricante.",
      },
    });
  }

  console.log("Creando órdenes de trabajo...");
  const ordenes = [
    {
      code: "OT-2026-0001",
      equipmentId: byCode["EQ-002"].id,
      type: "preventivo",
      priority: "alta",
      status: "en_proceso",
      responsibleId: tecnico.id,
      description: "Mantenimiento preventivo trimestral del ventilador mecánico.",
      openedAt: atNoon(-2),
      dueDate: atNoon(2),
    },
    {
      code: "OT-2026-0002",
      equipmentId: byCode["EQ-001"].id,
      type: "correctivo",
      priority: "alta",
      status: "abierta",
      responsibleId: tecnico.id,
      description: "El monitor no enciende y presenta falla en el botón de encendido.",
      openedAt: atNoon(-1),
      dueDate: atNoon(1),
    },
    {
      code: "OT-2026-0003",
      equipmentId: byCode["EQ-007"].id,
      type: "preventivo",
      priority: "media",
      status: "abierta",
      responsibleId: tecnico.id,
      description: "Revisión de válvulas y empaques de la autoclave.",
      openedAt: atNoon(-3),
      dueDate: atNoon(-1),
    },
    {
      code: "OT-2026-0004",
      equipmentId: byCode["EQ-003"].id,
      type: "preventivo",
      priority: "media",
      status: "cerrada",
      responsibleId: tecnico.id,
      description: "Mantenimiento preventivo de la incubadora neonatal.",
      observations: "Se calibró temperatura y humedad. Sin novedades.",
      openedAt: atNoon(-20),
      dueDate: atNoon(-18),
      closedAt: atNoon(-18),
    },
    {
      code: "OT-2026-0005",
      equipmentId: byCode["EQ-005"].id,
      type: "preventivo",
      priority: "alta",
      status: "cerrada",
      responsibleId: tecnico.id,
      description: "Verificación semestral del desfibrilador y cambio de batería.",
      observations: "Batería reemplazada. Se realizó prueba de descarga satisfactoria.",
      openedAt: atNoon(-40),
      dueDate: atNoon(-38),
      closedAt: atNoon(-37),
    },
    {
      code: "OT-2026-0006",
      equipmentId: byCode["EQ-004"].id,
      type: "correctivo",
      priority: "media",
      status: "cerrada",
      responsibleId: tecnico.id,
      description: "La bomba de infusión presenta alarma de oclusión intermitente.",
      observations: "Se reemplazó el set de infusión y se verificó el sensor de presión.",
      openedAt: atNoon(-10),
      dueDate: atNoon(-8),
      closedAt: atNoon(-8),
    },
    {
      code: "OT-2026-0007",
      equipmentId: byCode["EQ-006"].id,
      type: "preventivo",
      priority: "baja",
      status: "cerrada",
      responsibleId: admin.id,
      description: "Limpieza y revisión del ecógrafo.",
      observations: "Limpieza de transductores y actualización de software.",
      openedAt: atNoon(-70),
      dueDate: atNoon(-68),
      closedAt: atNoon(-68),
    },
    {
      code: "OT-2026-0008",
      equipmentId: byCode["EQ-008"].id,
      type: "correctivo",
      priority: "baja",
      status: "cancelada",
      responsibleId: null,
      description: "Revisión de las barandas de la cama eléctrica.",
      observations: "Cancelada por solicitud del área; se verificó sin novedad.",
      openedAt: atNoon(-5),
      dueDate: atNoon(-3),
    },
  ];

  for (const data of ordenes) {
    const orden = await prisma.workOrder.create({ data });
    if (orden.status === "cerrada" && orden.closedAt) {
      await prisma.maintenanceLog.create({
        data: {
          equipmentId: orden.equipmentId,
          date: orden.closedAt,
          eventType: orden.type,
          description: `${orden.description} ${orden.observations ?? ""}`.trim(),
          workOrderId: orden.id,
        },
      });
    }
  }

  console.log("Datos de demostración listos.");
  console.log("Usuarios:");
  console.log("  tecnico@vigia.co / Vigia2026*");
  console.log("  admin@vigia.co / Vigia2026*");
  console.log("  gerencia@vigia.co / Vigia2026*");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
