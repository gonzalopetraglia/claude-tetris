# Tetris

Implementación del clásico **Tetris** en JavaScript vanilla, usando HTML5 Canvas y CSS. Sin dependencias externas, sin frameworks, sin proceso de build: solo abrir y jugar.

![Tech](https://img.shields.io/badge/HTML5-Canvas-orange)
![Tech](https://img.shields.io/badge/CSS3-blueviolet)
![Tech](https://img.shields.io/badge/JavaScript-Vanilla-yellow)

---

## Tabla de contenidos

- [Tetris](#tetris)
  - [Tabla de contenidos](#tabla-de-contenidos)
  - [Qué hace el proyecto](#qué-hace-el-proyecto)
  - [Cómo ejecutar el juego](#cómo-ejecutar-el-juego)
    - [Opción 1: abrir el archivo directamente](#opción-1-abrir-el-archivo-directamente)
    - [Opción 2: servidor local (recomendado)](#opción-2-servidor-local-recomendado)
  - [Controles](#controles)
  - [Menú de pausa](#menú-de-pausa)
  - [Combos](#combos)
  - [Tabla de records local](#tabla-de-records-local)
  - [Cómo funciona](#cómo-funciona)
    - [1. `index.html`](#1-indexhtml)
    - [2. `style.css`](#2-stylecss)
    - [3. `game.js`](#3-gamejs)
    - [Flujo del juego](#flujo-del-juego)
  - [Tecnologías](#tecnologías)
  - [Estructura del proyecto](#estructura-del-proyecto)
  - [Personalización](#personalización)
  - [Licencia](#licencia)

---

## Qué hace el proyecto

Es una versión jugable del Tetris clásico con todas las mecánicas que esperarías:

- Tablero de **10 × 20** celdas.
- Las **7 piezas estándar** (I, O, T, S, Z, J, L) con colores diferenciados.
- **Rotación** con _wall kicks_ básicos (pequeños desplazamientos para que la pieza pueda rotar pegada a la pared).
- **Soft drop** (bajada acelerada) y **hard drop** (caída instantánea).
- **Pieza fantasma** (_ghost piece_): muestra dónde aterrizará la pieza actual.
- **Vista previa** de la siguiente pieza.
- **Sistema de puntuación** clásico de Tetris (100 / 300 / 500 / 800 multiplicado por nivel).
- **Niveles** que aumentan cada 10 líneas y aceleran la caída.
- **Menú de pausa** con opciones reales: reanudar, reiniciar, ver controles y elegir el **nivel inicial** de la próxima partida.
- **Combos**: limpiar líneas con piezas consecutivas suma un bonus creciente.
- **Pantalla de inicio** con la tabla de records y botón de *Jugar*.
- **Tabla de records local** (top 5) guardada en `localStorage`, con nombre del jugador.
- **Game Over** con opción de reinicio.
- **Toggle Light / Dark**: el juego arranca en modo oscuro; un switch permite cambiar a modo claro en cualquier momento.

---

## Cómo ejecutar el juego

No hay nada que instalar ni compilar. Tienes dos opciones:

### Opción 1: abrir el archivo directamente

```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

### Opción 2: servidor local (recomendado)

Cualquier servidor estático funciona. Algunos ejemplos:

```bash
# Con Python 3
python3 -m http.server 8000

# Con Node.js (npx)
npx serve .

# Con PHP
php -S localhost:8000
```

Después abre `http://localhost:8000` en el navegador.

---

## Controles

| Tecla     | Acción                            |
| --------- | --------------------------------- |
| `←` / `→` | Mover la pieza horizontalmente    |
| `↑` o `X` | Rotar la pieza en sentido horario |
| `↓`       | Soft drop (bajar más rápido)      |
| `Espacio` | Hard drop (caída instantánea)     |
| `P` o `Esc` | Pausar / reanudar               |

Mientras el menú de pausa está abierto, todos los controles del juego quedan bloqueados
(solo responden `P` y `Esc`), de modo que no se producen movimientos accidentales al volver.

---

## Menú de pausa

Al pulsar `P` o `Esc` se abre un overlay con estas opciones:

| Opción              | Qué hace                                                                     |
| ------------------- | ---------------------------------------------------------------------------- |
| **Reanudar**        | Cierra el menú y continúa la partida.                                        |
| **Reiniciar**       | Empieza una partida nueva sin recargar la página.                            |
| **Ver controles**   | Despliega la lista de teclas dentro del propio menú.                         |
| **Nivel inicial**   | Selector de 1 a 10; se aplica en la **próxima** partida, no en la actual.    |

El nivel inicial fija tanto el `level` de arranque como la velocidad de caída inicial
(`max(100, 1000 − (level − 1) × 90)` ms), y la progresión posterior es relativa a él.

> Los controles solo responden una vez empezada la partida: al cargar la página se muestra la
> pantalla de inicio y hay que pulsar **Jugar**.

---

## Combos

Cada vez que una pieza se fija **eliminando al menos una línea**, el contador de combo sube. Si una
pieza se fija **sin** eliminar ninguna línea, el combo vuelve a `0`.

- El panel lateral muestra el combo actual en la sección `COMBO` (`—` cuando no hay combo activo).
- A partir del segundo encadenamiento se suma un bonus además de la puntuación normal de líneas:

  ```
  bonus = 50 × (combo − 1) × nivel
  ```

  Es decir, dos limpiezas seguidas en nivel 3 suman `50 × 1 × 3 = 150` puntos extra; tres seguidas,
  `50 × 2 × 3 = 300`, y así sucesivamente.

- El mejor combo de la partida se guarda junto al record y también como marca global.

---

## Tabla de records local

Las mejores puntuaciones se guardan en el navegador con `localStorage`, bajo la clave
`tetris-records-v1`. No hay servidor ni cuentas: los records son locales a ese navegador.

Se almacenan:

- **Top 5** de puntuaciones, cada una con nombre, puntos, líneas, nivel y mejor combo de la partida.
- **Mejor combo** conseguido de forma global (en cualquier partida).
- **Líneas máximas** conseguidas en una sola partida.

Cómo se usa:

1. Al cargar la página aparece la **pantalla de inicio** con la tabla de records y dos botones:
   **Jugar** y **Borrar records**.
2. Al terminar la partida, el overlay de *Game Over* muestra la tabla de records. Si la puntuación
   entra en el top 5, aparece además el mensaje *«¡Entras en el top!»* con un campo de texto para el
   nombre (máximo 12 caracteres; si se deja vacío se guarda como `ANON`) y un botón **Guardar**.
   También se puede confirmar con <kbd>Enter</kbd>.
3. Tras guardar, la fila recién añadida se resalta en la tabla.
4. **Borrar records** pide confirmación y luego vacía por completo la tabla y las marcas globales.

Si `localStorage` no está disponible (modo privado, almacenamiento bloqueado), todos los accesos
están envueltos en `try/catch`: el juego funciona igual, simplemente sin persistencia.

---

## Cómo funciona

El juego se compone de tres archivos que cooperan:

### 1. `index.html`

Define la estructura visual:

- Un `<canvas id="board">` de **300 × 600** píxeles donde se renderiza el tablero.
- Un panel lateral con `SCORE`, `LINES`, `LEVEL`, `COMBO`, vista de la siguiente pieza y la lista de controles.
- Un overlay (`#overlay`) para el estado **GAME OVER**, que incluye la tabla de
  records (`#overlay-records`) y el campo de nombre (`#name-entry`).
- Un segundo overlay `#pause-menu` con el menú de pausa (botones, lista de controles plegable y
  selector de nivel inicial).
- Un overlay de **pantalla de inicio** (`#start-screen`) con la tabla de records y los botones
  *Jugar* y *Borrar records*.

### 2. `style.css`

Aporta el aspecto visual con estética _retro arcade_: tipografía monoespaciada para los marcadores y _backdrop blur_ en los overlays. Los colores se definen como custom properties en `:root` (tema oscuro, por defecto) y se sobrescriben en `body.light-theme` (tema claro).

### 3. `game.js`

Contiene toda la lógica del juego. A grandes rasgos:

- **Modelo del tablero**: una matriz `ROWS × COLS` donde cada celda guarda `0` (vacía) o un índice de color (1–7) que identifica la pieza.
- **Piezas**: definidas como matrices cuadradas. Para rotar se calcula la transposición + reverso de filas (`rotateCW`).
- **Detección de colisiones** (`collide`): comprueba que ninguna celda de la pieza salga del tablero ni se solape con bloques ya fijados.
- **Wall kicks** (`tryRotate`): si la rotación choca, intenta desplazar la pieza ±1 y ±2 columnas antes de descartar el giro.
- **Game loop** (`loop`): basado en `requestAnimationFrame`, acumula el tiempo transcurrido y baja la pieza una fila cuando se supera `dropInterval`.
- **Limpieza de líneas** (`clearLines`): recorre el tablero de abajo hacia arriba; cada fila completa se elimina y se inserta una vacía en la cima.
- **Puntuación**: usa la tabla clásica `[0, 100, 300, 500, 800]` multiplicada por el nivel actual; el hard drop suma 2 puntos por celda recorrida y el soft drop 1 punto por fila.
- **Nivel y velocidad**: el nivel se calcula como `startLevel + floor(lines / 10)`, es decir, sube cada 10 líneas partiendo del nivel inicial elegido en el menú de pausa; la velocidad de caída se calcula como `max(100, 1000 − (level − 1) × 90)` milisegundos.
- **Combos** (`clearLines`): lleva `combo` y `bestComboRun`; suma `50 × (combo − 1) × nivel` cuando
  el combo es mayor que 1 y reinicia `combo` a `0` si la pieza se fija sin limpiar líneas.
- **Records** (`loadRecords`, `saveRecords`, `qualifiesForTop`, `insertRecord`, `resetRecords`,
  `renderRecords`): leen y escriben la clave `tetris-records-v1` de `localStorage` dentro de
  `try/catch`, validan la forma de los datos y renderizan la misma tabla tanto en la pantalla de
  inicio como en el overlay de *Game Over*.
- **Pantalla de inicio** (`showStartScreen`): se llama al cargar el script en lugar de `init()`;
  deja el tablero vacío dibujado y el juego detenido hasta que se pulsa *Jugar*.
- **Ghost piece** (`ghostY`): proyecta la posición final de la pieza actual hacia abajo y la dibuja con `globalAlpha = 0.2`.
- **Tema Light/Dark** (`applyTheme`): alterna la clase `light-theme` en `<body>` (que cambia las custom properties de color) y actualiza `gridColor` leyendo la variable `--grid-color`, forzando un `draw()` inmediato para repintar la grilla del canvas con el nuevo color.

### Flujo del juego

```
showStartScreen()                    → tablero vacío + tabla de records
      ↓ (botón "Jugar")
init()
  ├─ createBoard()                  → matriz vacía
  ├─ next = randomPiece()
  ├─ spawn()                        → mueve next a current y genera nueva next
  └─ requestAnimationFrame(loop)
        ↓
   loop(timestamp)
     ├─ acumula dt
     ├─ si dt ≥ dropInterval → baja la pieza o llama a lockPiece()
     ├─ draw()  (grid + tablero + ghost + pieza actual)
     └─ requestAnimationFrame(loop)

   keydown → mover / rotar / soft-drop / hard-drop / pausa
```

Cuando una pieza recién generada ya colisiona al aparecer (`spawn`), se dispara `endGame()`, que
actualiza las marcas globales de records y muestra el overlay de **Game Over** (con el campo de
nombre si la puntuación entra en el top 5).

---

## Tecnologías

- **HTML5** — marcado y dos elementos `<canvas>` (tablero y vista previa).
- **CSS3** — _flexbox_, variables de color, `backdrop-filter` y `box-shadow`.
- **JavaScript (ES6+) vanilla** — `const`/`let`, _arrow functions_, _spread operator_, `Array.from`, _template literals_…
- **Canvas 2D API** — para todo el renderizado del juego.
- **`requestAnimationFrame`** — para el bucle de juego sincronizado con el navegador.

**Sin dependencias.** No hay `package.json`, ni bundler, ni transpilador.

---

## Estructura del proyecto

```
03-tetris/
├── index.html      # Estructura del DOM y canvas
├── style.css       # Estilos del juego (tema dark/light)
├── game.js         # Toda la lógica del Tetris (~300 líneas)
└── README.md
```

---

## Personalización

Algunos parámetros fáciles de tunear en `game.js`:

| Constante      | Significado                              | Por defecto           |
| -------------- | ---------------------------------------- | --------------------- |
| `COLS`         | Columnas del tablero                     | `10`                  |
| `ROWS`         | Filas del tablero                        | `20`                  |
| `BLOCK`        | Tamaño en píxeles de cada celda          | `30`                  |
| `COLORS`       | Paleta de colores por tipo de pieza      | 7 colores             |
| `LINE_SCORES`  | Puntos por 1, 2, 3 o 4 líneas eliminadas | `[0,100,300,500,800]` |
| `dropInterval` | Velocidad inicial de caída en ms         | `1000`                |
| `COMBO_BONUS`  | Puntos base del bonus de combo           | `50`                  |
| `MAX_RECORDS`  | Cantidad de records guardados            | `5`                   |
| `MAX_NAME_LENGTH` | Longitud máxima del nombre            | `12`                  |
| `RECORDS_KEY`  | Clave usada en `localStorage`            | `'tetris-records-v1'` |

> Si cambias `COLS`, `ROWS` o `BLOCK`, recuerda ajustar también `width` y `height` del `<canvas id="board">` en `index.html` para que coincida (`COLS × BLOCK` × `ROWS × BLOCK`).

---

## Licencia

Proyecto de uso libre con fines educativos y de práctica.
