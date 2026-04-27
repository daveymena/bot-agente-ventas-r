# 📝 Changelog - VentaFlow

## [2.0.0] - 2026-04-26

### ✨ Nuevas Características

#### 🎨 Diseño Profesional
- **Tema moderno** con gradientes y glass-morphism
- **Colores mejorados** con paleta profesional (Slate + Sky)
- **Animaciones suaves** en hover y transiciones
- **Efectos visuales** con shimmer y gradient borders
- **Fondo con gradiente** fijo en toda la aplicación

#### 📦 Sistema de Categorías
- **13 categorías predefinidas** con iconos emoji y colores únicos
- **Tabla de categorías** en la base de datos
- **Relación productos-categorías** con foreign key
- **Estadísticas por categoría** en el dashboard
- **Filtros avanzados** por categoría y búsqueda
- **Vista grid y lista** para productos

#### 🔧 Mejoras del Sistema
- **Operación 24/7** configurada por defecto
- **Campo `workingHoursEnabled`** para habilitar/deshabilitar horarios
- **Productos destacados** con badge especial
- **Tags en productos** para mejor búsqueda
- **Campo `featured`** para productos destacados

#### 🚀 Despliegue
- **Docker Compose para EasyPanel** con base de datos externa
- **Script de despliegue** automatizado (`deploy.sh`)
- **Configuración separada** para local y producción
- **Health checks** en contenedores Docker
- **Volúmenes persistentes** para WhatsApp auth y datos

#### 📚 Documentación
- **EASYPANEL-DEPLOY.md** - Guía completa de despliegue
- **INSTALL.md** - Guía de instalación y troubleshooting
- **CHANGELOG.md** - Registro de cambios
- **README.md actualizado** con nuevas características

### 🔄 Cambios

#### Base de Datos
- Agregada tabla `categories` con campos:
  - `id`, `name`, `slug`, `description`
  - `icon` (emoji), `color` (hex)
  - `order`, `productCount`
- Actualizada tabla `products` con:
  - `categoryId` (foreign key a categories)
  - `featured` (boolean)
  - `tags` (text)
  - Mantenido `category` (text) para compatibilidad

#### Frontend
- **Products.tsx** completamente rediseñado
- **index.css** con nuevo tema y utilidades CSS
- Componentes con glass-effect y gradientes
- Badges personalizados por categoría
- Búsqueda y filtros mejorados

#### Backend
- **botConfig** con campo `workingHoursEnabled`
- Seed actualizado para 24/7
- Tipos actualizados en schemas

### 🐛 Correcciones
- Corregido error de exportación duplicada en `api-zod/index.ts`
- Agregados tipos faltantes `@types/qrcode`
- Actualizada versión de esbuild (pendiente en Windows)

### 📦 Dependencias
- Mantenidas todas las dependencias existentes
- Agregado `@types/qrcode` para tipos
- Actualizado esbuild a 0.24.0 (recomendado)

### 🔐 Seguridad
- Variables de entorno separadas por ambiente
- `.env.easypanel` para producción
- Volúmenes Docker para datos sensibles
- Health checks para monitoreo

### 📊 Categorías Incluidas

1. 🎨 **DISEÑO** (#8B5CF6) - Photoshop, Illustrator, InDesign
2. 💼 **OFFICE** (#3B82F6) - Word, PowerPoint, Access
3. 🌍 **IDIOMAS** (#10B981) - Inglés, Francés, Alemán
4. 📊 **EXCEL** (#059669) - Básico a Avanzado, Macros
5. 💻 **TECH** (#6366F1) - Programación, Desarrollo Web
6. 📱 **MARKETING** (#EC4899) - Digital, Redes Sociales
7. 🎵 **MÚSICA** (#F59E0B) - Piano, Guitarra, Producción
8. 🏥 **SALUD** (#EF4444) - Nutrición, Fitness
9. 💰 **NEGOCIOS** (#14B8A6) - Emprendimiento, Finanzas
10. ⚙️ **INGENIERÍA** (#64748B) - AutoCAD, Civil
11. 📚 **EDUCATIVO** (#8B5CF6) - Pedagogía, Didáctica
12. 🔧 **OFICIO** (#F97316) - Electricidad, Plomería
13. ✂️ **CRAFT** (#A855F7) - Manualidades, Costura

### 🎯 Preparación para SaaS
- Estructura de base de datos lista para multi-tenancy
- Documentación de migración a SaaS
- Campos preparados para tenant_id
- Arquitectura escalable

### 📝 Notas de Migración

#### Desde versión 1.x:
1. Ejecutar migraciones: `pnpm --filter @workspace/db run push`
2. Los productos existentes mantendrán el campo `category` (text)
3. Opcionalmente, migrar a la nueva tabla de categorías
4. El sistema es compatible con ambos formatos

#### Para nuevas instalaciones:
1. Seguir [INSTALL.md](./INSTALL.md)
2. Usar `deploy.sh` para automatizar
3. Configurar variables de entorno
4. Ejecutar seed para catálogo completo

### 🚀 Próximas Versiones

#### v2.1.0 (Planeado)
- [ ] Panel de administración de categorías
- [ ] Importación masiva de productos
- [ ] Reportes y analytics
- [ ] Integración con más pasarelas de pago

#### v3.0.0 (Futuro)
- [ ] Multi-tenancy completo
- [ ] Sistema de suscripciones
- [ ] Dashboard de administración SaaS
- [ ] API pública para integraciones

### 🙏 Agradecimientos
- Comunidad de Baileys por el soporte de WhatsApp
- Drizzle ORM por la excelente experiencia de desarrollo
- Radix UI por los componentes accesibles
- TailwindCSS por el sistema de diseño

---

**Versión**: 2.0.0  
**Fecha**: 26 de Abril, 2026  
**Autor**: VentaFlow Team  
**Licencia**: MIT
