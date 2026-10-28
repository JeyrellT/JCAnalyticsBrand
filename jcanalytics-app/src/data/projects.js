// ============================================================================
//  src/data/projects.js
//  PROYECTOS REALES · los diez repositorios que JC Analytics construye y opera.
//  Todo lo que se muestra sale de los repositorios: las capturas se toman de
//  cada aplicación corriendo (scripts/capture-projects.md), los fragmentos de
//  código se copian textualmente (projectCode.js) y las cifras las calcula
//  scripts/project-evidence.mjs y quedan en projects.evidence.json.
//
//  IMÁGENES en public/projects/<id>/<pantalla>-desktop.webp (1600 px de ancho)
//  y <pantalla>-mobile.webp (640 px de ancho, 390×844 lógicos).
//
//  Los textos describen lo que cada sistema hace hoy. No se afirman resultados
//  de negocio que no estén publicados por el cliente.
// ============================================================================
import { t } from '../i18n/locale';
import evidence from './projects.evidence.json';
import { PROJECT_CODE } from './projectCode';

const shot = (id, screen, device) => `${import.meta.env.BASE_URL}projects/${id}/${screen}-${device}.webp`;

// Etiquetas de las cifras que calcula el escáner de repositorios.
export const FACT_LABELS = {
  pages: t('páginas', 'pages'),
  routes: t('rutas', 'routes'),
  spaces: t('espacios del panel', 'panel spaces'),
  modules: t('módulos', 'modules'),
  portalModules: t('módulos del portal', 'portal modules'),
  endpoints: t('endpoints de API', 'API endpoints'),
  serverActions: t('acciones de servidor', 'server actions'),
  models: t('modelos de datos', 'data models'),
  tables: t('tablas', 'tables'),
  schemas: t('esquemas Zod compartidos', 'shared Zod schemas'),
  migrations: t('migraciones', 'migrations'),
  tests: t('pruebas automatizadas', 'automated tests'),
  jobs: t('tareas programadas', 'scheduled jobs'),
  leads: t('barberías prospectadas', 'barbershops prospected'),
  productPhotos: t('fotos de producto', 'product photos'),
  frames: t('fotogramas 3D', '3D frames'),
  cinemaFrames: t('fotogramas de cine', 'film frames'),
  menuItems: t('productos del menú', 'menu items'),
  sections: t('secciones', 'sections'),
  blenderLines: t('líneas de Blender (Python)', 'lines of Blender (Python)'),
  products: t('productos del catálogo', 'catalogue products'),
  photos: t('fotografías', 'photographs'),
  icons: t('íconos SVG propios', 'custom SVG icons'),
};

export const PROJECT_KINDS = {
  system: t('Sistema de negocio', 'Business system'),
  commerce: t('Comercio y pedidos', 'Commerce and orders'),
  web: t('Experiencia web', 'Web experience'),
};

export const PROJECTS = [
  {
    id: 'transportesluna',
    name: 'Transporte Luz de Luna',
    client: 'Transporte Moderno Luz de Luna S.R.L.',
    kind: 'system',
    sector: t('Transporte de personal', 'Staff transportation'),
    status: t('En producción', 'In production'),
    accent: '#f4c36e',
    tagline: t('Rutas que aprenden del tráfico real.', 'Routes that learn from real traffic.'),
    problem: t(
      'Una transportista lleva cada día a cientos de colaboradores de zonas francas. Las rutas se armaban a mano, sin saber cuántas unidades hacían falta ni a qué hora pasar por cada persona.',
      'A transport operator shuttles hundreds of employees from free-trade zones every day. Routes were built by hand, without knowing how many vehicles were needed or when to pick each person up.',
    ),
    built: t(
      'Una plataforma con cinco roles donde cada persona marca su punto de abordaje por GPS, el administrador genera rutas sobre calles reales con un optimizador propio, el chofer ve su recorrido y el pasajero sabe a qué hora pasa el bus.',
      'A five-role platform where each person pins their pickup point by GPS, the administrator generates routes on real streets with an in-house optimizer, the driver sees the run and the passenger knows when the bus arrives.',
    ),
    features: t(
      ['Optimizador Clarke-Wright + SISR con recocido simulado: decenas de miles de variantes en unos 3 s', 'Tráfico aprendido de viajes terminados y probabilidad de llegar a tiempo por ruta', 'Contratos con cupos protegidos por bloqueos de Postgres, tarifas por km y liquidaciones', 'Asistente por WhatsApp, Messenger e Instagram y revisión de rutas con Claude'],
      ['Clarke-Wright + SISR optimizer with simulated annealing: tens of thousands of variants in about 3 s', 'Traffic learned from completed trips and an on-time probability for every route', 'Contracts with seat quotas protected by Postgres locks, per-km tariffs and settlements', 'WhatsApp, Messenger and Instagram assistant plus route review with Claude'],
    ),
    stack: {
      front: ['Next.js 16', 'React 19', 'Tailwind 4', 'MapLibre GL', 'PWA'],
      back: ['Server Actions', 'Prisma 7', 'Zod 4', 'OSRM (perfil de bus)'],
      data: ['PostgreSQL 16'],
      integrations: ['Claude API', 'Meta WhatsApp Cloud API', 'Web Push'],
      infra: ['Railway (4 servicios)', 'Docker'],
    },
    screens: [
      { id: 'rutas', caption: t('Cabina de rutas: grupos por horario, personas con entrada y rutas publicadas.', 'Route cockpit: groups by shift, people with pickups and published routes.'), mobile: 'usuario' },
      { id: 'admin', caption: t('Resumen del transportista: unidades, facturación del día y pendientes de asignación.', 'Operator overview: vehicles, today’s billing and pending assignments.'), mobile: 'chofer' },
      { id: 'distribucion', caption: t('Distribución automática de choferes y unidades sin choques de horario.', 'Automatic dispatch of drivers and vehicles with no schedule clashes.'), mobile: 'admin' },
      { id: 'empresa', caption: t('Panel de la empresa cliente: centros de costo, colaboradores y presupuesto.', 'Client company panel: cost centres, employees and budget.'), mobile: null },
      { id: 'alertas', caption: t('Alertas y alarmas: doce tipos de aviso con visibilidad por rol.', 'Alerts and alarms: twelve notice types with per-role visibility.'), mobile: null },
      { id: 'landing', caption: t('Sitio público del transportista, con flota y formulario de cotización.', 'The operator’s public site, with fleet and quote form.'), mobile: 'landing' },
    ],
    url: null,
    need: 'Sistema / backend',
  },
  {
    id: 'laburrada',
    name: 'La Burrada Street Food',
    client: 'La Burrada · Santa Bárbara de Heredia',
    kind: 'commerce',
    sector: t('Restaurante · pedidos en línea', 'Restaurant · online ordering'),
    status: t('En producción', 'In production'),
    accent: '#ff5a00',
    tagline: t('Del menú a la cocina sin perder un pedido.', 'From menu to kitchen without losing an order.'),
    problem: t(
      'Un restaurante de burritos que vende por WhatsApp los fines de semana necesitaba recibir pedidos sin cuenta obligatoria, cobrar por SINPE sin revisar comprobantes a mano y que la cocina viera cada pedido al instante.',
      'A weekend burrito restaurant selling through WhatsApp needed to take orders without mandatory accounts, charge by SINPE without checking receipts by hand and let the kitchen see every order instantly.',
    ),
    built: t(
      'Menú público con carrito y checkout donde el precio siempre lo calcula el servidor, una tablet de cocina en tiempo real, pagos con ONVO Pay, inventario por receta, lealtad con BurroCoins y ruleta, y un panel administrativo con analítica.',
      'A public menu with cart and checkout where the server always computes the price, a real-time kitchen tablet, ONVO Pay payments, recipe-based inventory, loyalty with BurroCoins and a roulette, and an admin panel with analytics.',
    ),
    features: t(
      ['Cotización y pedido autoritativos en la API: el navegador nunca decide precios ni disponibilidad', 'Tablet de cocina con eventos en vivo (SSE), estaciones, alertas de audio y retrocesos permitidos', 'SINPE por ONVO Pay con emparejamiento por código, monto y teléfono; si hay duda, lo revisa una persona', 'Modo degradado: el menú sigue abierto aunque la API no responda'],
      ['Authoritative quotes and orders in the API: the browser never decides prices or availability', 'Kitchen tablet with live events (SSE), stations, audio alerts and allowed rollbacks', 'SINPE through ONVO Pay matched by code, amount and phone; when in doubt a person reviews it', 'Degraded mode: the menu stays open even when the API is down'],
    ),
    stack: {
      front: ['Next.js 16', 'React 19', 'Tailwind 4', 'GSAP', 'Zustand', 'PWA + push'],
      back: ['Fastify 5', 'Prisma 6', 'Zod 4', 'JWT con rotación'],
      data: ['PostgreSQL'],
      integrations: ['ONVO Pay', 'OpenAI / DeepSeek', 'Resend', 'WhatsApp'],
      infra: ['Railway (3 servicios)', 'GitHub Actions'],
    },
    screens: [
      { id: 'cocina', caption: t('Tablet de cocina: pendientes de aprobación, cola, preparación y listos, en vivo.', 'Kitchen tablet: pending approval, queue, preparing and ready, live.'), mobile: 'producto', mobileCaption: t('Ficha de producto en el celular.', 'Product page on a phone.') },
      { id: 'admin', caption: t('Centro operativo: estado del turno, pulso del servicio y siguiente movimiento.', 'Operations centre: shift status, service pulse and next move.'), mobile: 'admin' },
      { id: 'analitica', caption: t('Analítica de ventas, productos, clientes, descuentos y embudo.', 'Analytics for sales, products, customers, discounts and funnel.'), mobile: null },
      { id: 'inventario', caption: t('Bodega y recetas: proyección de viernes a domingo por producto.', 'Stock and recipes: Friday-to-Sunday projection per product.'), mobile: null },
      { id: 'promociones', caption: t('Ruleta de premios, cupones y campañas con costo visible.', 'Prize roulette, coupons and campaigns with visible cost.'), mobile: null },
      { id: 'home', caption: t('Portada pública con banner de la app y menú de combos.', 'Public home page with the app banner and combo menu.'), mobile: 'home' },
    ],
    url: 'https://www.laburradacr.com/',
    need: 'Sistema / backend',
  },
  {
    id: 'barberxcr',
    name: 'BarberXCR',
    client: t('Producto propio · barberías de Costa Rica', 'Own product · barbershops in Costa Rica'),
    kind: 'system',
    sector: t('Barberías · SaaS multiusuario', 'Barbershops · multi-tenant SaaS'),
    status: t('En producción', 'In production'),
    accent: '#d4a017',
    tagline: t('Programá. Cortá. Cobrá.', 'Book. Cut. Get paid.'),
    problem: t(
      'Las barberías anotan citas en WhatsApp, pierden clientes que no llegan y no saben cuánto facturan por silla. Necesitaban una página propia con agenda, sin apps que descargar.',
      'Barbershops write appointments in WhatsApp, lose no-show clients and do not know what each chair bills. They needed their own page with an agenda, with no app to download.',
    ),
    built: t(
      'Una plataforma para muchas barberías a la vez: reservas 24/7 con agenda por barbero, lealtad y promociones, strikes por inasistencia, membresías con tarjeta o SINPE, tienda de productos, un asistente de voz con IA y un CRM para el equipo de ventas.',
      'A platform serving many barbershops at once: 24/7 booking with a per-barber agenda, loyalty and promotions, no-show strikes, memberships by card or SINPE, a product shop, an AI voice assistant and a CRM for the sales team.',
    ),
    features: t(
      ['Motor de agenda por silla: “sin preferencia” asigna al barbero con menos carga', 'Asistente manos libres con 15 herramientas; las escrituras solo se proponen y el barbero confirma', 'Motor de lealtad con sellos, cupones, happy hours, cumpleaños y referidos auditables', 'Tres temas visuales, marcas con varias sedes y demo con 600 citas para vender'],
      ['Per-chair agenda engine: “no preference” assigns the least-loaded barber', 'Hands-free assistant with 15 tools; writes are only proposed and the barber confirms', 'Loyalty engine with stamps, coupons, happy hours, birthdays and auditable referrals', 'Three visual themes, multi-location brands and a 600-appointment demo for selling'],
    ),
    stack: {
      front: ['React 19', 'Vite', 'Tailwind 4', 'React Router'],
      back: ['FastAPI', 'SQLAlchemy async', 'Alembic', 'JWT'],
      data: ['PostgreSQL', 'SQLite (local)'],
      integrations: ['DeepSeek', 'ElevenLabs', 'ONVO Pay', 'Resend'],
      infra: ['Railway', 'GitHub Pages', 'GitHub Actions'],
    },
    screens: [
      { id: 'landing', caption: t('Página de venta del producto: planes desde ₡10.000 al mes.', 'Product landing page: plans from ₡10,000 a month.'), mobile: 'dashboard', mobileCaption: t('Panel del barbero en el celular.', 'Barber dashboard on a phone.') },
      { id: 'dashboard', caption: t('Panel del barbero: citas de hoy, ingresos y disponibilidad de 14 días.', 'Barber dashboard: today’s appointments, income and 14-day availability.'), mobile: 'reserva', mobileCaption: t('Reserva pública desde el celular.', 'Public booking from a phone.') },
      { id: 'reserva', caption: t('Registro de clientes para reservar en una barbería con su propia marca.', 'Customer sign-up to book at a barbershop with its own brand.'), mobile: 'landing' },
      { id: 'planes', caption: t('Planes y funciones: desde reservas hasta el asistente con IA.', 'Plans and features: from bookings to the AI assistant.'), mobile: null },
    ],
    url: 'https://barberxcr.com/',
    need: 'Sistema / backend',
  },
  {
    id: 'maison',
    name: 'Taller Maison Valcour',
    client: 'Maison Valcour · by Mike Bolaños',
    kind: 'system',
    sector: t('Enderezado y pintura automotriz', 'Auto body and paint'),
    status: t('En producción', 'In production'),
    accent: '#c9a356',
    tagline: t('No solo pintamos. Restauramos el prestigio.', 'We don’t just paint. We restore prestige.'),
    problem: t(
      'Un taller premium con servicio a domicilio quería cotizar sin llamadas, saber qué pasa en cada sala y darle al cliente la trazabilidad de su carro con fotos y garantía.',
      'A premium body shop with home service wanted to quote without phone calls, know what happens in every bay and give customers traceability of their car with photos and warranty.',
    ),
    built: t(
      'Una landing cinematográfica con cotizador 3D, y detrás una plataforma de operación para nueve roles: panel de dirección, tablets por sala con PIN, portal del cliente, segunda pantalla del taller, finanzas, inventario y mediciones exportables a Power BI.',
      'A cinematic landing with a 3D quote tool, and behind it an operations platform for nine roles: management panel, per-bay tablets with PIN, customer portal, a second screen for the shop, finance, inventory and measurements exportable to Power BI.',
    ),
    features: t(
      ['Cotizador 3D sobre modelos GLB con respaldo 2D; el mismo motor de precios valida en el servidor', 'Película de scroll con fotogramas en canvas y calidad de video elegida según la red', 'Motor de avisos cada 2 minutos con bloqueo de Postgres y WhatsApp de un toque', 'Tokens de sesión con rotación y revocación de familia; permisos por rol en un solo archivo'],
      ['3D quote tool on GLB models with a 2D fallback; the same pricing engine validates on the server', 'Scroll film with canvas frames and video quality chosen by network speed', 'Alerts engine every 2 minutes with a Postgres lock and one-tap WhatsApp', 'Rotating session tokens with family revocation; role permissions in a single file'],
    ),
    stack: {
      front: ['Next.js 16 (export estático)', 'React 19 + Compiler', 'three.js', 'GSAP', 'Tailwind 4'],
      back: ['Fastify 5', 'Prisma 7', 'Zod 4', 'jose'],
      data: ['PostgreSQL 16', 'S3'],
      integrations: ['WhatsApp', 'CSV para Power BI'],
      infra: ['Railway', 'GitHub Pages', 'GitHub Actions'],
    },
    screens: [
      { id: 'operacion', caption: t('Orquesta del taller: salas 1 a 6, cola por sala y tiempos estándar.', 'Shop orchestra: bays 1 to 6, queue per bay and standard times.'), mobile: 'panel' },
      { id: 'landing', caption: t('Landing “Pintura viva” con película de scroll y cotizador.', '“Living paint” landing with scroll film and quote tool.'), mobile: 'cotizar', mobileCaption: t('Cotizador en el celular.', 'Quote tool on a phone.') },
      { id: 'pantalla', caption: t('Segunda pantalla del taller: ocupación y disponibilidad de 14 días.', 'Second screen for the shop: occupancy and 14-day availability.'), mobile: null },
      { id: 'estacion', caption: t('Tablet de sala: cada técnico entra con su PIN y avanza pasos.', 'Bay tablet: each technician signs in with a PIN and advances steps.'), mobile: null },
      { id: 'mediciones', caption: t('Mediciones del taller con tendencia semanal y exportación CSV.', 'Shop measurements with weekly trend and CSV export.'), mobile: null },
      { id: 'precios', caption: t('Catálogo y precios: propuestas, aprobaciones y cotizador público.', 'Catalogue and prices: proposals, approvals and public quote tool.'), mobile: null },
    ],
    url: 'https://www.tallermaisonvalcour.com/',
    need: 'Sistema / backend',
  },
  {
    id: 'crimson',
    name: 'Crimson Consulting',
    client: 'Crimson Consulting · Alajuela',
    kind: 'system',
    sector: t('Seguridad electrónica · facturación y cobros', 'Electronic security · invoicing and payments'),
    status: t('Sitio en producción · plataforma en pruebas', 'Site in production · platform in staging'),
    accent: '#e2233a',
    tagline: t('Una plataforma completa de facturación, cobros y control.', 'A complete invoicing, payments and control platform.'),
    problem: t(
      'Un integrador de CCTV, redes y software pagaba una plataforma de facturación ajena y quería una propia, con factura electrónica de Costa Rica, enlaces de pago por WhatsApp y el control de campo de sus técnicos.',
      'A CCTV, networking and software integrator paid for a third-party invoicing platform and wanted its own, with Costa Rican electronic invoicing, WhatsApp payment links and field control for its technicians.',
    ),
    built: t(
      'Sitio público con tienda y centro de ayuda, y una plataforma multiempresa: cotizaciones, facturas electrónicas v4.4 firmadas, pagos con ONVO, recepción de XML de proveedores, levantamientos, órdenes de trabajo, tickets con SLA, planillas, conciliación bancaria y 19 reportes en Excel.',
      'A public site with store and help centre, plus a multi-tenant platform: quotes, signed v4.4 electronic invoices, ONVO payments, supplier XML reception, site surveys, work orders, SLA tickets, payroll, bank reconciliation and 19 Excel reports.',
    ),
    features: t(
      ['Factura electrónica v4.4: XML validado contra XSD, firma XAdES con certificado .p12, envío y consulta', 'Totales con cinco decimales y descuento global prorrateado; el pedido de la tienda cuadra con la factura al céntimo', 'Seguridad: Argon2, JWT de 15 min con refresh rotativo, 2FA TOTP, enlaces de archivos firmados con HMAC', '33 tareas programadas: tipo de cambio del BCCR, recordatorios de pago, cierre diario y sincronización de stock'],
      ['v4.4 electronic invoice: XML validated against XSD, XAdES signature with a .p12 certificate, send and poll', 'Five-decimal totals with a prorated global discount; the store order matches the invoice to the cent', 'Security: Argon2, 15-minute JWT with rotating refresh, TOTP 2FA, HMAC-signed file links', '33 scheduled jobs: BCCR exchange rate, payment reminders, daily close and stock sync'],
    ),
    stack: {
      front: ['React 19', 'Vite 7', 'React Router 7', 'HTML/CSS (landing)'],
      back: ['FastAPI', 'SQLAlchemy 2', 'Alembic', 'Celery + Redis', 'WeasyPrint'],
      data: ['PostgreSQL 16', 'Redis 7'],
      integrations: ['Hacienda v4.4', 'ONVO Pay', 'BCCR', 'Resend', 'QuickBooks', 'IMAP'],
      infra: ['Railway (6 servicios)', 'GitHub Pages', 'GitHub Actions (CI + monitor)'],
    },
    screens: [
      { id: 'facturas', caption: t('Nueva factura: líneas, impuestos CABYS y totales v4.4 en tiempo real.', 'New invoice: lines, CABYS taxes and v4.4 totals in real time.'), mobile: 'inicio' },
      { id: 'inicio', caption: t('Inicio del panel: acciones pendientes, KPIs del día y ruta de trabajo.', 'Panel home: pending actions, daily KPIs and work path.'), mobile: 'facturas' },
      { id: 'hero', caption: t('Sitio público: seguridad, IA y software para una operación más inteligente.', 'Public site: security, AI and software for a smarter operation.'), mobile: 'hero' },
      { id: 'pos', caption: t('Punto de venta: tiquete o factura, pagos mixtos e inventario en un paso.', 'Point of sale: ticket or invoice, mixed payments and inventory in one step.'), mobile: null },
      { id: 'planillas', caption: t('Planillas con CCSS y renta por tramos.', 'Payroll with CCSS contributions and income tax brackets.'), mobile: null },
      { id: 'levantamientos', caption: t('Levantamientos de campo que se vuelven cotización en un clic.', 'Field surveys that become a quote in one click.'), mobile: null },
      { id: 'ayuda', caption: t('Centro de ayuda: firmware, programas y manuales por marca.', 'Help centre: firmware, software and manuals by brand.'), mobile: 'ayuda' },
    ],
    url: 'https://crimsoncr.com/',
    need: 'Sistema / backend',
  },
  {
    id: 'multiagencia',
    name: 'Multiagencia Gutiérrez',
    client: 'Multiagencia Gutiérrez · repuestos y motos',
    kind: 'commerce',
    sector: t('Repuestos de moto y llantas', 'Motorcycle parts and tyres'),
    status: t('En construcción', 'In construction'),
    accent: '#cdaa68',
    tagline: t('Repuestos de moto y llantas, en un solo lugar.', 'Motorcycle parts and tyres, in one place.'),
    problem: t(
      'Una agencia de motos con más de mil repuestos en un Excel y fotos sueltas quería vender en línea y de mostrador con las mismas existencias, y que sus proveedores vieran cuánto se mueve sin exponer precios ni clientes.',
      'A motorcycle agency with over a thousand parts in a spreadsheet and loose photos wanted to sell online and over the counter from the same stock, and let suppliers see movement without exposing prices or customers.',
    ),
    built: t(
      'Un monorepo con sitio de marca, tienda instalable, app de clientes, panel administrativo, portal de proveedores y una API propia. Pedidos en línea y ventas de mostrador comparten productos, precios y existencias; la factura se genera en PDF sin navegador.',
      'A monorepo with brand site, installable store, customer app, admin panel, supplier portal and its own API. Online orders and counter sales share products, prices and stock; the invoice is rendered to PDF without a browser.',
    ),
    features: t(
      ['Importador idempotente del catálogo (Excel + fotos) que no pisa precios, stock ni banderas', 'Dinero en céntimos enteros; precio 0 significa “a consultar” y abre la línea de WhatsApp correcta', 'Portal de proveedores con acceso por producto o categoría, solo unidades y existencias', 'Showroom con película de 265 fotogramas y 12 modelos Bajaj'],
      ['Idempotent catalogue importer (Excel + photos) that never overwrites prices, stock or flags', 'Money in integer cents; price 0 means “ask us” and opens the right WhatsApp line', 'Supplier portal with per-product or per-category access, units and stock only', 'Showroom with a 265-frame film and 12 Bajaj models'],
    ),
    stack: {
      front: ['Next.js 16', 'React 19', 'Tailwind 4', 'Radix UI', 'Serwist PWA'],
      back: ['Hono', 'Prisma 7', 'Better Auth', 'Zod 4', '@cantoo/pdf-lib'],
      data: ['PostgreSQL 18'],
      integrations: ['WhatsApp (2 líneas)', 'Resend'],
      infra: ['pnpm + Turborepo', 'Biome', 'Vitest', 'Railway'],
    },
    screens: [
      { id: 'brand', caption: t('Sitio de marca “Por puro instinto” con película de scroll.', '“Pure instinct” brand site with a scroll film.'), mobile: 'tienda' },
      { id: 'tienda', caption: t('Tienda en línea: catálogo, búsqueda y filtros con precios en colones.', 'Online store: catalogue, search and filters with prices in colones.'), mobile: 'venta', mobileCaption: t('Venta de mostrador desde el celular.', 'Counter sale from a phone.') },
      { id: 'venta', caption: t('Nueva venta de mostrador: descuenta inventario y genera la factura.', 'New counter sale: deducts inventory and generates the invoice.'), mobile: 'admin' },
      { id: 'inventario', caption: t('Inventario con costo, margen global o por producto y bloqueo optimista.', 'Inventory with cost, global or per-product markup and optimistic locking.'), mobile: null },
      { id: 'proveedores', caption: t('Proveedores: catálogos de origen y acceso al portal.', 'Suppliers: source catalogues and portal access.'), mobile: null },
      { id: 'showroom', caption: t('Showroom de motos con imágenes de estudio.', 'Motorcycle showroom with studio images.'), mobile: null },
    ],
    url: null,
    need: 'Sistema / backend',
  },
  {
    id: 'soporte20',
    name: 'Soporte 2.0',
    client: 'Soporte 2.0 · San Antonio de Belén',
    kind: 'system',
    sector: t('Taller de celulares y computadoras', 'Phone and computer repair shop'),
    status: t('Entregado', 'Delivered'),
    accent: '#247eff',
    tagline: t('Tecnología con una segunda oportunidad.', 'Technology with a second chance.'),
    problem: t(
      'Un taller de reparación necesitaba recibir equipos, cotizar, cobrar y entregar sin perder piezas ni comprobantes, y que el cliente pudiera seguir su reparación sin llamar.',
      'A repair shop needed to take in devices, quote, charge and deliver without losing parts or receipts, and let customers follow their repair without calling.',
    ),
    built: t(
      'Una landing cinematográfica con laboratorio 3D y, detrás, un sistema completo: reparaciones con estados, cotización con aprobación por enlace, inventario con “deshuese” de equipos donantes, caja con devoluciones exactas, portal del cliente, tienda y un centro de análisis con señales explicables.',
      'A cinematic landing with a 3D lab and, behind it, a complete system: repairs with statuses, quotes approved by link, inventory with parts harvested from donor devices, a cash desk with exact refunds, customer portal, store and an analysis centre with explainable signals.',
    ),
    features: t(
      ['Sin frameworks de backend: Node con SQLite nativo, transacciones inmediatas y numeración sin huecos', 'Reglas del taller en código: la entrega exige factura vigente y saldo cero; el stock nunca baja de cero', 'PDFs de marca: factura, recibo de ingreso, cotización e informe; estado por WhatsApp con PDF adjunto', '70 pruebas de navegador recorren el flujo de ingreso a entrega en escritorio y móvil'],
      ['No backend framework: Node with native SQLite, immediate transactions and gap-free numbering', 'Shop rules in code: delivery requires a valid invoice and zero balance; stock never drops below zero', 'Branded PDFs: invoice, intake receipt, quote and report; WhatsApp status with the PDF attached', '70 browser tests walk the intake-to-delivery flow on desktop and mobile'],
    ),
    stack: {
      front: ['React 19', 'Vite 7', 'three.js', 'TypeScript'],
      back: ['Node 24 (http nativo)', 'node:sqlite', 'PDFKit', 'Sharp'],
      data: ['SQLite WAL'],
      integrations: ['WhatsApp', 'Web Share API'],
      infra: ['Docker', 'Railway', 'Playwright'],
    },
    screens: [
      { id: 'landing', caption: t('Landing “Tu equipo se detuvo. Tu historia, no.” con 193 fotogramas.', '“Your device stopped. Your story didn’t.” landing with 193 frames.'), mobile: 'app', mobileCaption: t('Mi taller en el celular.', 'My shop on a phone.') },
      { id: 'app', caption: t('Mi taller: equipos en reparación, atención pendiente y listos para entregar.', 'My shop: devices under repair, pending attention and ready for pickup.'), mobile: 'seguimiento', mobileCaption: t('Seguimiento privado de una reparación.', 'Private repair tracking.') },
      { id: 'inventario', caption: t('Inventario con productos, piezas recuperadas y reservas.', 'Inventory with products, harvested parts and reservations.'), mobile: null },
      { id: 'deshuese', caption: t('Deshuese: piezas recuperadas de un equipo donante, con trazabilidad.', 'Harvesting: parts recovered from a donor device, with traceability.'), mobile: null },
      { id: 'reportes', caption: t('Centro de análisis: periodos comparables y señales explicables.', 'Analysis centre: comparable periods and explainable signals.'), mobile: null },
      { id: 'lab3d', caption: t('Laboratorio 3D del sitio público.', 'The public site’s 3D lab.'), mobile: null },
    ],
    url: null,
    need: 'Sistema / backend',
  },
  {
    id: 'caviq',
    name: 'CAVIQ',
    client: 'CAVIQ · Inteligencia que impulsa',
    kind: 'system',
    sector: t('Consultoría para PYMES', 'SME advisory'),
    status: t('En construcción', 'In construction'),
    accent: '#2cc5cf',
    tagline: t('Vos dirigís. Nosotros coordinamos.', 'You lead. We coordinate.'),
    problem: t(
      'Una consultora que coordina RR. HH., contabilidad, legal y tecnología a través de firmas aliadas necesitaba un sitio que explicara cada pilar y un espacio de trabajo para seguir cada cliente, sesión, cobro y comisión.',
      'An advisory firm coordinating HR, accounting, legal and technology through partner firms needed a site explaining each pillar and a workspace to follow every client, session, payment and commission.',
    ),
    built: t(
      'Un sitio público con una ruta por pilar y un workspace con seis roles: CRM con pipeline, consultorías con sesiones y entregables, pagos parciales en colones y dólares, comisiones y liquidación del aliado, agenda sin choques, analítica gerencial y un módulo de tecnología de JC Analytics.',
      'A public site with one route per pillar and a six-role workspace: CRM with pipeline, engagements with sessions and deliverables, partial payments in colones and dollars, commissions and partner payouts, clash-free agenda, management analytics and a JC Analytics technology module.',
    ),
    features: t(
      ['Ciclo completo: CRM → cliente → consultoría → sesiones → cobro → comisión → liquidación del aliado', 'Sesiones propias con tokens hasheados, cookies httpOnly, límite de intentos y protección CSRF', 'Pulso diario: seguimientos vencidos, de hoy y sin asignar según días hábiles de Costa Rica', 'Búsqueda global con Ctrl+K y asistente DeepSeek que solo recibe resúmenes autorizados por rol'],
      ['Full cycle: CRM → client → engagement → sessions → payment → commission → partner payout', 'In-house sessions with hashed tokens, httpOnly cookies, attempt limits and CSRF protection', 'Daily pulse: overdue, today and unassigned follow-ups by Costa Rican business days', 'Global Ctrl+K search and a DeepSeek assistant that only receives role-authorized summaries'],
    ),
    stack: {
      front: ['React 19', 'Vite 7', 'TypeScript', 'Manrope Variable'],
      back: ['Express 5', 'node:sqlite', 'Zod 4', 'bcrypt'],
      data: ['SQLite WAL'],
      integrations: ['DeepSeek (opcional)', 'WhatsApp'],
      infra: ['Docker', 'Railway', 'GitHub Actions', 'Playwright'],
    },
    screens: [
      { id: 'crm', caption: t('CRM comercial: pipeline por etapa con valor en colones y seguimientos.', 'Sales CRM: pipeline by stage with value in colones and follow-ups.'), mobile: 'pulse' },
      { id: 'pulse', caption: t('Vista general: pulso de la operación y lo que merece atención.', 'Overview: operation pulse and what deserves attention.'), mobile: 'crm' },
      { id: 'reports', caption: t('Análisis gerencial: ingresos, comisión y contribución por aliado.', 'Management analytics: revenue, commission and contribution by partner.'), mobile: null },
      { id: 'technology', caption: t('Módulo de tecnología: catálogo de JC Analytics y propuestas.', 'Technology module: JC Analytics catalogue and proposals.'), mobile: null },
      { id: 'landing', caption: t('Sitio público: “Vos dirigís. Nosotros coordinamos.”', 'Public site: “You lead. We coordinate.”'), mobile: 'landing' },
      { id: 'rrhh', caption: t('Ruta del pilar de recursos humanos.', 'The human resources pillar route.'), mobile: 'rrhh' },
    ],
    url: null,
    need: 'Sistema / backend',
  },
  {
    id: 'silglobal',
    name: 'SIL Global',
    client: 'SIL Global Ltda. · La Unión, Cartago',
    kind: 'web',
    sector: t('Distribución mayorista', 'Wholesale distribution'),
    status: t('En producción', 'In production'),
    accent: '#52dee0',
    tagline: t('Del mundo, a tu negocio.', 'From the world to your business.'),
    problem: t(
      'Un distribuidor de embalaje, empaque y suministros de hotelería necesitaba una presencia digital que mostrara sus líneas, su catálogo y llevara al cliente a cotizar por WhatsApp.',
      'A distributor of packaging, bags and hospitality supplies needed a digital presence showing its lines and catalogue that leads customers to quote through WhatsApp.',
    ),
    built: t(
      'Un sitio sin frameworks con una capa cinematográfica de mejora progresiva: tinte ambiente por sección, animaciones guiadas por scroll, globo SVG con ocho rutas, catálogo de 39 productos con filtros y búsqueda, ficha en diálogo y un armador de cotización que no guarda datos.',
      'A framework-free site with a progressive-enhancement cinematic layer: ambient tint per section, scroll-driven animations, an SVG globe with eight routes, a 39-product catalogue with filters and search, a product dialog and a quote builder that stores no data.',
    ),
    features: t(
      ['CSS scroll-driven animations y tilt 3D solo donde el dispositivo lo soporta; todo funciona sin JavaScript', 'JSON-LD de organización, sitio y página; sitemap y robots listos para buscadores', 'Sprite de 21 íconos SVG propios y 45 fotografías optimizadas en WebP', 'Cotización compuesta en el navegador y enviada por WhatsApp: cero datos almacenados'],
      ['CSS scroll-driven animations and 3D tilt only where the device supports them; everything works without JavaScript', 'Organization, website and page JSON-LD; sitemap and robots ready for search engines', 'A sprite of 21 custom SVG icons and 45 photographs optimized as WebP', 'Quote composed in the browser and sent through WhatsApp: zero stored data'],
    ),
    stack: {
      front: ['HTML', 'CSS (scroll timelines)', 'JavaScript vanilla'],
      back: [],
      data: [],
      integrations: ['WhatsApp'],
      infra: ['GitHub Pages', 'Dominio propio'],
    },
    screens: [
      { id: 'hero', caption: t('Portada con globo y rutas animadas hacia Costa Rica.', 'Home page with the globe and animated routes into Costa Rica.'), mobile: 'hero' },
      { id: 'catalogo', caption: t('Catálogo: destacados, empaque y embalaje con búsqueda en vivo.', 'Catalogue: featured, packaging and wrapping with live search.'), mobile: 'catalogo' },
      { id: 'servicios', caption: t('Cuatro paneles de servicio que se expanden al pasar el cursor.', 'Four service panels that expand on hover.'), mobile: null },
    ],
    url: 'https://silglobalcr.com/',
    need: 'Página web',
  },
  {
    id: 'placeres',
    name: 'Placeres Culposos',
    client: 'Placeres Culposos CR · El Roble, Puntarenas',
    kind: 'web',
    sector: t('Heladería y cafetería', 'Ice-cream shop and café'),
    status: t('Lista para lanzar', 'Ready to launch'),
    accent: '#e3257b',
    tagline: t('El antojo sin culpa.', 'Guilt-free cravings.'),
    problem: t(
      'Una heladería con +152 mil reproducciones en TikTok necesitaba un menú digital con las promos del mes, pedidos por WhatsApp y algo que se sintiera tan sabroso como el producto.',
      'An ice-cream shop with 152K+ TikTok views needed a digital menu with the month’s promos, WhatsApp orders and something that felt as tasty as the product.',
    ),
    built: t(
      'Una landing sin frameworks con un vaso de fresas 3D que se arma al hacer scroll, menú de 26 productos generado desde datos, carrusel de promos y una app de señalización para el televisor del local con dos formatos y estado de abierto o cerrado en vivo.',
      'A framework-free landing with a 3D strawberry cup that assembles on scroll, a 26-item data-driven menu, a promo carousel and a signage app for the shop’s TV with two layouts and live open/closed status.',
    ),
    features: t(
      ['81 fotogramas renderizados en Blender con una escena construida por completo en Python y física de fresas', 'Carga de cuadros de menor a mayor calidad, respeta Save-Data y movimiento reducido', 'Política de seguridad de contenido estricta y JSON-LD de heladería con horario y ubicación', 'Pantalla del local: afiches, reseñas, antojo del día y preferencias guardadas por televisor'],
      ['81 frames rendered in Blender from a scene built entirely in Python, with strawberry physics', 'Coarse-to-fine frame loading that respects Save-Data and reduced motion', 'Strict content security policy and ice-cream-shop JSON-LD with hours and location', 'In-store screen: posters, reviews, craving of the day and per-TV saved preferences'],
    ),
    stack: {
      front: ['HTML', 'CSS', 'JavaScript vanilla', 'Canvas'],
      back: [],
      data: [],
      integrations: ['WhatsApp', 'TikTok'],
      infra: ['GitHub Pages', 'Blender (Python)', 'Pillow'],
    },
    screens: [
      { id: 'hero', caption: t('Portada “El antojo sin culpa” con sello giratorio y mascota.', '“Guilt-free cravings” home page with rotating badge and mascot.'), mobile: 'menu', mobileCaption: t('Menú con filtros en el celular.', 'Menu with filters on a phone.') },
      { id: 'fresas', caption: t('Sección fija: el vaso se arma en tres pasos mientras bajás.', 'Pinned section: the cup assembles in three steps as you scroll.'), mobile: 'hero' },
      { id: 'pantalla', caption: t('Señalización para el televisor del local (1920 × 1080).', 'Signage for the shop’s TV (1920 × 1080).'), mobile: null },
      { id: 'menu', caption: t('Menú del día generado desde datos, con precios en colones.', 'Data-driven daily menu with prices in colones.'), mobile: null },
    ],
    url: 'https://jcanalyticscr.github.io/placeres-culposos-web/',
    need: 'Página web',
  },
];

export const projectEvidence = (id) => evidence.projects[id];
export const EVIDENCE_DATE = evidence.generatedAt;
export const projectCode = (id) => PROJECT_CODE[id];
export const screenImage = (project, screen, device) => shot(project.id, screen, device);

// Totales reales: se suman desde el JSON para que agregar un repositorio no deje cifras viejas.
const all = Object.values(evidence.projects);
const sumFacts = (keys) => all.reduce((total, project) => total + keys.reduce((sum, key) => sum + (project.facts[key] || 0), 0), 0);
export const EVIDENCE_TOTALS = {
  projects: PROJECTS.length,
  lines: all.reduce((total, project) => total + project.lines, 0),
  commits: all.reduce((total, project) => total + project.commits, 0),
  tests: sumFacts(['tests']),
  endpoints: sumFacts(['endpoints']),
  models: sumFacts(['models', 'tables']),
};
