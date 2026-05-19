# PROMPT MAESTRO
### Sistema Inteligente de Inventario y Análisis de Consumo para Bar

---

## ¿Qué es esto?

Sistema profesional para control de inventario y análisis de consumo enfocado en bares y restaurantes. Convierte comandas físicas en papel en datos, estadísticas y predicciones automáticas.

**NO es un POS.** No maneja pagos, tickets, mesas ni facturación.

**SÍ hace:**
- Captura ultra-rápida de comandas físicas
- Control de inventario semanal automatizado
- Estadísticas y gráficas automáticas
- Exportación a Excel profesional
- Algoritmo inteligente de pedidos

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS |
| Estado | Zustand + React Query |
| Formularios | React Hook Form + Zod |
| Gráficas | Recharts |
| Backend | Node.js + Express + TypeScript |
| Base de datos | PostgreSQL + Prisma ORM |
| Desktop | Electron (próximamente) |
| Excel | ExcelJS |
| Auth | JWT + bcrypt |

---

## Estructura del monorepo

```
prompt-maestro/
├── apps/
│   ├── web/                    # Frontend React
│   │   └── src/
│   │       ├── components/
│   │       │   ├── ui/         # Componentes reutilizables
│   │       │   ├── dashboard/  # Dashboard principal
│   │       │   ├── inventory/  # Gestión de inventario
│   │       │   ├── comandas/   # Captura de comandas ← NÚCLEO
│   │       │   ├── analytics/  # Gráficas y estadísticas
│   │       │   ├── orders/     # Pedido inteligente
│   │       │   ├── settings/   # Configuración
│   │       │   └── auth/       # Login
│   │       ├── store/          # Zustand stores
│   │       ├── types/          # TypeScript types
│   │       ├── utils/          # Excel export, algoritmo
│   │       └── lib/            # Mock data, parser
│   └── desktop/                # Electron (próximamente)
├── backend/
│   └── src/
│       ├── routes/             # Express routers
│       ├── middleware/         # JWT auth, error handler
│       └── services/           # Business logic
└── packages/
    └── database/
        └── prisma/
            └── schema.prisma   # Esquema PostgreSQL
```

---

## Inicio rápido

### Prerrequisitos
- Node.js 18+
- PostgreSQL 14+
- npm 9+

### 1. Instalar dependencias

```bash
cd apps/web
npm install
```

### 2. Variables de entorno (backend)

```bash
# backend/.env
DATABASE_URL="postgresql://user:password@localhost:5432/prompt_maestro"
JWT_SECRET="tu-secreto-seguro-aqui"
PORT=4000
```

### 3. Base de datos

```bash
cd backend
npm run db:migrate    # Crea tablas
npm run db:generate   # Genera cliente Prisma
```

### 4. Desarrollo

```bash
# Terminal 1 — Frontend
cd apps/web && npm run dev    # http://localhost:3000

# Terminal 2 — Backend
cd backend && npm run dev     # http://localhost:4000
```

### 5. Credenciales demo

| Email | Contraseña | Rol |
|-------|-----------|-----|
| admin@bar.com | 1234 | Administrador |
| bartender@bar.com | 1234 | Bartender |

---

## Funcionalidades

### Captura de comandas (prioridad #1)

Tres formas de agregar productos:

1. **Texto libre** — escribe como en papel:
   ```
   2 coca
   3 delaware
   1 sprite
   ```
   El sistema reconoce aliases automáticamente.

2. **Búsqueda instantánea** — busca por nombre o alias

3. **Botones rápidos** — los 6 productos más comunes

### Algoritmo de pedido inteligente

```
Promedio diario = Consumo semanal ÷ 6
Stock seguridad = Promedio diario × 1.2
Pedido          = (Promedio × Días a operar) + Seguridad − Stock actual
```

Considera:
- Historial de 4 semanas
- Tendencia (↑ creciendo / → estable / ↓ bajando)
- Score de confianza (%)

### Exportación Excel

- Inventario semanal con colores
- Lista de pedido ordenada por prioridad
- Reporte de analíticas semanal

---

## Flujo operacional

```
Martes      → Registro inventario inicial
Martes      → Generación de pedido (algoritmo)
Jueves      → Registro de entradas (mercancía llegó)
Mar-Dom     → Captura continua de comandas
Domingo     → Registro inventario final
Domingo     → Cierre de semana + reporte
```

---

## Variables de entorno completas

```bash
# Backend
DATABASE_URL=postgresql://localhost:5432/prompt_maestro
JWT_SECRET=prompt-maestro-super-secret
PORT=4000
NODE_ENV=development

# Frontend (Vite)
VITE_API_URL=http://localhost:4000/api
```

---

## Roadmap

- [x] Frontend React completo
- [x] Backend Express + rutas
- [x] Schema PostgreSQL + Prisma
- [x] Algoritmo de pedidos
- [x] Exportación Excel
- [ ] Integración real frontend ↔ backend
- [ ] Electron desktop app
- [ ] OCR de comandas (cámara)
- [ ] Sincronización móvil (React Native / Expo)
- [ ] Notificaciones push de stock bajo
- [ ] IA predictiva avanzada

---

## Licencia

Uso privado — sistema desarrollado para operación interna de bar.
