---
description: Crea un worktree aislado en .trees/ y ejecuta ahí las instrucciones dadas
argument-hint: <instrucciones a ejecutar en el worktree>
allowed-tools: Bash(git worktree:*), Bash(git branch:*), Bash(git rev-parse:*), Bash(git status:*), Task
---

El requerimiento del usuario es: $ARGUMENTS

Si el requerimiento viene vacío, pide las instrucciones y detente aquí.

Ejecuta estos pasos:

## 1. Derivar el nombre

A partir del requerimiento, deriva `NOMBRE`: kebab-case, ASCII sin acentos, 2–4 palabras,
máximo 30 caracteres, que resuma el trabajo.

Ejemplo: "agregar sistema de pausa con overlay" → `pausa-overlay`.

## 2. Evitar colisiones

Comprueba si ya existe el directorio `.trees/NOMBRE` o la rama:

```bash
git rev-parse --verify --quiet refs/heads/NOMBRE
```

Si alguno existe, añade sufijo numérico (`-2`, `-3`, …) hasta encontrar uno libre.

## 3. Crear el worktree

```bash
git worktree add -b NOMBRE .trees/NOMBRE main
```

## 4. Delegar el trabajo a un subagente aislado

Lanza un `Agent` con `subagent_type: general-purpose` y `description` corta. El prompt debe incluir:

- La ruta absoluta del worktree: `<raíz del repo>/.trees/NOMBRE`.
- Orden explícita de usar **rutas absolutas bajo esa ruta** en todo Read/Edit/Write/Bash.
- Prohibición explícita de leer o modificar archivos fuera de `.trees/NOMBRE` — nada en la raíz
  del repo, aunque el path parezca equivalente.
- El requerimiento textual del usuario, sin resumir.
- Recordatorio de que aplican las reglas del `CLAUDE.md` del proyecto: JavaScript vanilla con
  Canvas, sin dependencias, sin build, sin tests; los cambios se verifican recargando el navegador.
  Si cambian mecánicas, controles o constantes de tuneo, actualizar el README.
- Instrucción de commitear en la rama `NOMBRE` al terminar (nunca hacer push) y devolver un
  resumen de los archivos tocados.

## 5. Reportar

Cuando el subagente termine, informa: nombre del worktree, rama, resumen del trabajo y los
comandos de seguimiento:

```bash
cd .trees/NOMBRE                     # revisar
git worktree remove .trees/NOMBRE    # descartar
```
