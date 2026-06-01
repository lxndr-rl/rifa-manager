# Rifa Manager

Sistema de gestión de rifas para vender y dar seguimiento a números de rifa.

## Features

- Crear rifas con nombre, premio, fecha y cantidad de números
- Marcar números como vendidos con nombre del comprador y teléfono
- Vista visual de todos los números (disponibles/vendidos)
- Estadísticas en tiempo real
- Base de datos SQLite persistente

## Deploy con Dokploy

1. Crea un nuevo proyecto en Dokploy
2. Conecta este repositorio de GitHub
3. Configura la imagen: `ghcr.io/TU_USUARIO/rifa-manager:main`
4. Agrega un volumen persistente: `/app/data`
5. Expone el puerto 3000

## Deploy local con Docker

```bash
docker compose up -d
```

Accede a `http://localhost:3000`

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| PORT | 3000 | Puerto del servidor |
| DB_PATH | /app/data/rifas.db | Ruta de la base de datos |

## API

### Rifas
- `GET /api/rifas` - Listar todas las rifas
- `GET /api/rifas/:id` - Obtener una rifa
- `POST /api/rifas` - Crear rifa
- `PUT /api/rifas/:id` - Editar rifa
- `DELETE /api/rifas/:id` - Eliminar rifa

### Tickets
- `GET /api/tickets/rifa/:rifaId` - Tickets de una rifa
- `GET /api/tickets/rifa/:rifaId/stats` - Estadísticas
- `PUT /api/tickets/:id` - Actualizar ticket
- `POST /api/tickets/rifa/:rifaId/bulk` - Actualización masiva
