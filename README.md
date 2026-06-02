# Rifa Manager

Sistema de gestión de rifas con MySQL, Prisma y autenticación.

## Features

- Autenticación con JWT (solo login)
- Crear rifas con nombre, premio, fecha y cantidad de números
- Marcar números como vendidos con nombre del comprador y teléfono
- Vista visual de todos los números (disponibles/vendidos)
- Estadísticas en tiempo real
- MySQL + Prisma ORM

## Deploy local con Docker

```bash
docker compose up -d
```

Accede a `http://localhost:3000`

**Credenciales por defecto:** `admin` / `admin123`

## Deploy con Dokploy

### Opción 1: Docker Compose

1. En Dokploy → **Projects** → **Create Project**
2. Agrega un servicio **MySQL** (o usa el compose completo)
3. Agrega la app apuntando al repo
4. Variables de entorno necesarias:
   - `DATABASE_URL`: `mysql://root:password@<mysql-host>:3306/rifa_manager`
   - `JWT_SECRET`: cambia por uno seguro
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD`: credenciales iniciales
5. Volumen persistente: `/var/lib/mysql` para MySQL

### Opción 2: Imagen + MySQL externo

1. Crea una base MySQL en Dokploy
2. Deploy la imagen `ghcr.io/lxndr-rl/rifa-manager:main`
3. Configura `DATABASE_URL` apuntando a tu MySQL
4. Expone puerto 3000

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| PORT | 3000 | Puerto del servidor |
| DATABASE_URL | - | Connection string de MySQL |
| JWT_SECRET | - | Secret para firmar tokens |
| JWT_EXPIRES_IN | 7d | Expiración del token |
| ADMIN_USERNAME | admin | Usuario admin inicial |
| ADMIN_PASSWORD | admin123 | Password admin inicial |

## API

### Auth
- `POST /api/auth/login` - Iniciar sesión

### Rifas (requiere token)
- `GET /api/rifas` - Listar rifas
- `GET /api/rifas/:id` - Obtener rifa
- `POST /api/rifas` - Crear rifa
- `PUT /api/rifas/:id` - Editar rifa
- `DELETE /api/rifas/:id` - Eliminar rifa

### Tickets (requiere token)
- `GET /api/tickets/rifa/:rifaId` - Tickets de una rifa
- `GET /api/tickets/rifa/:rifaId/stats` - Estadísticas
- `PUT /api/tickets/:id` - Actualizar ticket
- `POST /api/tickets/rifa/:rifaId/bulk` - Actualización masiva
