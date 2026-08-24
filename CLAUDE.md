# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Tetris en JavaScript vanilla con HTML5 Canvas. Sin dependencias, sin `package.json`, sin build, sin tests. Tres archivos: `index.html`, `style.css`, `game.js`. La UI y el README están en español.

## Ejecutar

```bash
open index.html            # basta con abrir el archivo
python3 -m http.server 8000  # o servidor estático (recomendado)
```

No hay comandos de build, lint ni test. Los cambios se verifican recargando el navegador.

## Arquitectura de `game.js`

Todo el juego vive en un único script con estado en variables de módulo (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, `dropAccum`, `animId`). No hay clases ni módulos ES.

- **Tablero**: matriz `ROWS × COLS` de enteros; `0` = vacío, `1–7` = índice en `COLORS`/`PIECES`. Ese índice viaja dentro de la propia forma de la pieza (cada celda no vacía contiene su `type`), así que fijar una pieza es copiar sus valores al tablero (`merge`).
- **Rotación**: `rotateCW` genera una matriz nueva; `tryRotate` prueba desplazamientos `[0,-1,1,-2,2]` (wall kicks) y solo asigna si alguno no colisiona.
- **Colisión**: `collide(shape, x, y)` es la única comprobación; se usa para mover, rotar, ghost, soft/hard drop y detectar game over al hacer `spawn()`.
- **Bucle**: `loop(ts)` con `requestAnimationFrame` acumula `dt` en `dropAccum` y baja una fila al superar `dropInterval`; `draw()` se llama cada frame y repinta todo el canvas. Pausa y game over cancelan el frame (`cancelAnimationFrame`) en lugar de usar un flag dentro del loop.
- **Progresión**: `clearLines` actualiza `lines`, suma `LINE_SCORES[cleared] * level`, recalcula `level = floor(lines/10)+1` y `dropInterval = max(100, 1000 - (level-1)*90)`.
- **Render**: `drawBlock(context, x, y, colorIndex, size, alpha)` sirve tanto para el tablero como para el canvas de "next"; el ghost es el mismo dibujo con `alpha = 0.2`.
- **Reinicio**: `init()` reconstruye todo el estado y es también el handler del botón de reiniciar, por lo que cualquier estado nuevo debe inicializarse ahí.

## Al modificar

- Cambiar `COLS`, `ROWS` o `BLOCK` obliga a ajustar `width`/`height` del `<canvas id="board">` en `index.html` (`COLS*BLOCK` × `ROWS*BLOCK`).
- Los elementos del DOM se capturan por `id` al cargar el script; renombrar un `id` en `index.html` rompe `game.js` silenciosamente.
- El README documenta mecánicas, controles y constantes de tuneo: actualízalo si cambian.

## Comandos personalizados

- `/worktree <instrucciones>`: crea `.trees/<nombre>` con `git worktree add -b <nombre> ... main`
  (el `<nombre>` se deriva del requerimiento) y delega el trabajo a un subagente que opera solo
  dentro de ese directorio. El árbol principal no se toca. `.trees/` está en `.gitignore`.
