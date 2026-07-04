// Демо-данные для проверки. Запуск: npm run db:seed
// Все пароли: password123
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

// Деньги — в копейках: 100_000 ₽ = 10_000_000
const RUB = (rubles: number) => Math.round(rubles * 100);

async function main() {
  console.log("Очистка БД ...");
  // Порядок важен из-за FK; каскады закрывают большинство связей
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  console.log("Создание организации ...");
  const org = await prisma.organization.create({
    data: {
      name: "Веб-студия «Пример»",
      slug: "primer-studio",
      currency: "RUB",
      timezone: "Europe/Moscow",
    },
  });
  const organizationId = org.id;

  console.log("Создание пользователей ...");
  const passwordHash = await hash("password123", 10);
  const mkUser = (email: string, name: string, role: "OWNER" | "MANAGER" | "EMPLOYEE") =>
    prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        memberships: { create: { organizationId, role } },
      },
    });

  const owner = await mkUser("owner@studio.ru", "Алексей Владельцев", "OWNER");
  const manager = await mkUser("manager@studio.ru", "Мария Менеджерова", "MANAGER");
  const dev1 = await mkUser("dev1@studio.ru", "Иван Разработчиков", "EMPLOYEE");
  const dev2 = await mkUser("dev2@studio.ru", "Пётр Верстальщиков", "EMPLOYEE");
  const designer = await mkUser("design@studio.ru", "Анна Дизайнерова", "EMPLOYEE");

  console.log("Создание сотрудников ...");
  const employees = await Promise.all([
    prisma.employee.create({
      data: {
        organizationId,
        userId: owner.id,
        fullName: "Алексей Владельцев",
        position: "Директор",
        rateType: "MONTHLY",
        rateAmount: RUB(150_000),
        hireDate: new Date("2022-01-10"),
        email: "owner@studio.ru",
      },
    }),
    prisma.employee.create({
      data: {
        organizationId,
        userId: manager.id,
        fullName: "Мария Менеджерова",
        position: "Проект-менеджер",
        rateType: "MONTHLY",
        rateAmount: RUB(90_000),
        hireDate: new Date("2022-06-01"),
        email: "manager@studio.ru",
      },
    }),
    prisma.employee.create({
      data: {
        organizationId,
        userId: dev1.id,
        fullName: "Иван Разработчиков",
        position: "Fullstack-разработчик",
        rateType: "HOURLY",
        rateAmount: RUB(1_800),
        hireDate: new Date("2023-03-15"),
        email: "dev1@studio.ru",
      },
    }),
    prisma.employee.create({
      data: {
        organizationId,
        userId: dev2.id,
        fullName: "Пётр Верстальщиков",
        position: "Frontend-разработчик",
        rateType: "HOURLY",
        rateAmount: RUB(1_500),
        hireDate: new Date("2024-02-01"),
        email: "dev2@studio.ru",
      },
    }),
    prisma.employee.create({
      data: {
        organizationId,
        userId: designer.id,
        fullName: "Анна Дизайнерова",
        position: "UI/UX-дизайнер",
        rateType: "HOURLY",
        rateAmount: RUB(1_600),
        hireDate: new Date("2023-09-01"),
        email: "design@studio.ru",
      },
    }),
  ]);

  console.log("Создание клиентов ...");
  const client1 = await prisma.client.create({
    data: {
      organizationId,
      companyName: "ООО «Ромашка»",
      industry: "Доставка цветов",
      source: "Рекомендация",
      status: "ACTIVE",
      managerId: manager.id,
      notes: "Постоянный клиент, планирует редизайн в конце года.",
      contacts: {
        create: [
          {
            name: "Ольга Петрова",
            position: "Директор по маркетингу",
            phone: "+7 900 111-22-33",
            email: "olga@romashka.ru",
            telegram: "@olga_romashka",
            isPrimary: true,
          },
          {
            name: "Сергей Иванов",
            position: "IT-специалист",
            email: "sergey@romashka.ru",
          },
        ],
      },
    },
  });

  const client2 = await prisma.client.create({
    data: {
      organizationId,
      companyName: "ИП Кузнецов",
      industry: "Автосервис",
      source: "Яндекс.Директ",
      status: "ACTIVE",
      managerId: manager.id,
      contacts: {
        create: [
          {
            name: "Дмитрий Кузнецов",
            position: "Владелец",
            phone: "+7 900 444-55-66",
            telegram: "@dkuznetsov",
            isPrimary: true,
          },
        ],
      },
    },
  });

  await prisma.client.create({
    data: {
      organizationId,
      companyName: "Академия «Знание»",
      industry: "Онлайн-образование",
      source: "Сайт студии",
      status: "NEGOTIATION",
      managerId: manager.id,
      notes: "Обсуждаем платформу для курсов. Ждём ответ по бюджету.",
      contacts: {
        create: [
          {
            name: "Елена Смирнова",
            position: "Руководитель",
            email: "elena@znanie.ru",
            isPrimary: true,
          },
        ],
      },
    },
  });

  console.log("История взаимодействий ...");
  await prisma.interaction.createMany({
    data: [
      {
        organizationId,
        clientId: client1.id,
        authorId: manager.id,
        type: "MEETING",
        note: "Встреча по редизайну: обсудили референсы, ждут КП до пятницы.",
        date: new Date("2026-06-25T11:00:00+03:00"),
      },
      {
        organizationId,
        clientId: client2.id,
        authorId: manager.id,
        type: "CALL",
        note: "Звонок по интернет-магазину запчастей: подтвердил бюджет.",
        date: new Date("2026-06-28T15:30:00+03:00"),
      },
    ],
  });

  console.log("Создание проектов ...");
  const project1 = await prisma.project.create({
    data: {
      organizationId,
      clientId: client1.id,
      name: "Корпоративный сайт «Ромашка»",
      type: "Сайт",
      budget: RUB(450_000),
      startDate: new Date("2026-05-12"),
      deadline: new Date("2026-08-15"),
      status: "IN_PROGRESS",
      managerId: manager.id,
      members: {
        create: [
          { userId: dev1.id },
          { userId: dev2.id },
          { userId: designer.id },
        ],
      },
      milestones: {
        create: [
          {
            organizationId,
            name: "Дизайн-макеты",
            dueDate: new Date("2026-06-10"),
            amount: RUB(150_000),
            status: "DONE",
            order: 1,
          },
          {
            organizationId,
            name: "Вёрстка и разработка",
            dueDate: new Date("2026-07-25"),
            amount: RUB(200_000),
            status: "IN_PROGRESS",
            order: 2,
          },
          {
            organizationId,
            name: "Наполнение и запуск",
            dueDate: new Date("2026-08-15"),
            amount: RUB(100_000),
            status: "PENDING",
            order: 3,
          },
        ],
      },
    },
  });

  const project2 = await prisma.project.create({
    data: {
      organizationId,
      clientId: client2.id,
      name: "Интернет-магазин автозапчастей",
      type: "Интернет-магазин",
      budget: RUB(780_000),
      startDate: new Date("2026-06-20"),
      deadline: new Date("2026-10-30"),
      status: "IN_PROGRESS",
      managerId: manager.id,
      members: {
        create: [{ userId: dev1.id }, { userId: designer.id }],
      },
      milestones: {
        create: [
          {
            organizationId,
            name: "Прототип и дизайн",
            dueDate: new Date("2026-07-20"),
            amount: RUB(180_000),
            status: "IN_PROGRESS",
            order: 1,
          },
          {
            organizationId,
            name: "Каталог и корзина",
            dueDate: new Date("2026-09-10"),
            amount: RUB(350_000),
            status: "PENDING",
            order: 2,
          },
          {
            organizationId,
            name: "Оплата, доставка, запуск",
            dueDate: new Date("2026-10-30"),
            amount: RUB(250_000),
            status: "PENDING",
            order: 3,
          },
        ],
      },
    },
  });

  console.log("Создание задач ...");
  const tasksData: {
    projectId: string;
    title: string;
    assigneeId: string;
    status: "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    dueDate: Date;
    order: number;
  }[] = [
    {
      projectId: project1.id,
      title: "Вёрстка главной страницы",
      assigneeId: dev2.id,
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: new Date("2026-07-04"),
      order: 1,
    },
    {
      projectId: project1.id,
      title: "Настройка CMS и админки",
      assigneeId: dev1.id,
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      dueDate: new Date("2026-07-10"),
      order: 2,
    },
    {
      projectId: project1.id,
      title: "Адаптив для мобильных",
      assigneeId: dev2.id,
      status: "BACKLOG",
      priority: "MEDIUM",
      dueDate: new Date("2026-07-18"),
      order: 1,
    },
    {
      projectId: project1.id,
      title: "Дизайн внутренних страниц",
      assigneeId: designer.id,
      status: "REVIEW",
      priority: "HIGH",
      dueDate: new Date("2026-06-30"), // просрочена — для проверки напоминаний
      order: 1,
    },
    {
      projectId: project2.id,
      title: "Прототип каталога",
      assigneeId: designer.id,
      status: "IN_PROGRESS",
      priority: "URGENT",
      dueDate: new Date("2026-07-08"),
      order: 3,
    },
    {
      projectId: project2.id,
      title: "Проектирование структуры БД каталога",
      assigneeId: dev1.id,
      status: "DONE",
      priority: "HIGH",
      dueDate: new Date("2026-06-27"),
      order: 1,
    },
  ];

  for (const t of tasksData) {
    await prisma.task.create({ data: { organizationId, ...t } });
  }

  console.log("Записи времени ...");
  const anyTask = await prisma.task.findFirstOrThrow({
    where: { title: "Вёрстка главной страницы" },
  });
  const dbTask = await prisma.task.findFirstOrThrow({
    where: { title: "Проектирование структуры БД каталога" },
  });
  await prisma.timeEntry.createMany({
    data: [
      {
        organizationId,
        taskId: anyTask.id,
        userId: dev2.id,
        minutes: 360,
        date: new Date("2026-07-01"),
        isManual: true,
        description: "Вёрстка hero-блока и шапки",
      },
      {
        organizationId,
        taskId: dbTask.id,
        userId: dev1.id,
        minutes: 480,
        date: new Date("2026-06-26"),
        isManual: true,
        description: "Схема БД каталога, миграции",
      },
    ],
  });

  console.log("Платежи и расходы ...");
  await prisma.payment.createMany({
    data: [
      {
        organizationId,
        clientId: client1.id,
        projectId: project1.id,
        amount: RUB(150_000),
        kind: "PREPAYMENT",
        status: "RECEIVED",
        method: "Безнал",
        paidAt: new Date("2026-05-14"),
        note: "Предоплата за этап «Дизайн-макеты»",
      },
      {
        organizationId,
        clientId: client1.id,
        projectId: project1.id,
        amount: RUB(200_000),
        kind: "INSTALLMENT",
        status: "EXPECTED",
        method: "Безнал",
        dueDate: new Date("2026-07-28"),
        note: "Оплата этапа «Вёрстка и разработка»",
      },
      {
        organizationId,
        clientId: client2.id,
        projectId: project2.id,
        amount: RUB(180_000),
        kind: "PREPAYMENT",
        status: "RECEIVED",
        method: "Безнал",
        paidAt: new Date("2026-06-22"),
      },
      {
        organizationId,
        clientId: client2.id,
        projectId: project2.id,
        amount: RUB(100_000),
        kind: "INSTALLMENT",
        status: "OVERDUE",
        method: "Безнал",
        dueDate: new Date("2026-06-15"), // просрочен — для дебиторки
        note: "Доплата за прототип",
      },
    ],
  });

  await prisma.expense.createMany({
    data: [
      {
        organizationId,
        projectId: project1.id,
        category: "CONTRACTOR",
        amount: RUB(35_000),
        date: new Date("2026-06-05"),
        description: "Иллюстрации для главной (фрилансер)",
      },
      {
        organizationId,
        category: "SOFTWARE",
        amount: RUB(12_000),
        date: new Date("2026-06-01"),
        description: "Figma + хостинг, июнь",
      },
      {
        organizationId,
        category: "OFFICE",
        amount: RUB(60_000),
        date: new Date("2026-06-01"),
        description: "Аренда офиса, июнь",
      },
    ],
  });

  console.log("Отсутствия ...");
  await prisma.absence.create({
    data: {
      organizationId,
      employeeId: employees[3].id, // Пётр
      type: "VACATION",
      startDate: new Date("2026-07-20"),
      endDate: new Date("2026-08-02"),
      note: "Ежегодный отпуск",
    },
  });

  console.log("Уведомления ...");
  await prisma.notification.createMany({
    data: [
      {
        organizationId,
        userId: dev2.id,
        type: "TASK_ASSIGNED",
        title: "Вам назначена задача",
        body: "Вёрстка главной страницы — до 04.07.2026",
      },
      {
        organizationId,
        userId: owner.id,
        type: "PAYMENT_OVERDUE",
        title: "Просрочен платёж",
        body: "ИП Кузнецов: 100 000 ₽ — срок 15.06.2026",
      },
    ],
  });

  console.log("\nГотово! Учётные записи (пароль везде password123):");
  console.log("  Владелец:  owner@studio.ru");
  console.log("  Менеджер:  manager@studio.ru");
  console.log("  Сотрудник: dev1@studio.ru / dev2@studio.ru / design@studio.ru");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
