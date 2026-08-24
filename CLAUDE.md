
## Comandos personalizados

- `/worktree <instrucciones>`: crea `.trees/<nombre>` con `git worktree add -b <nombre> ... main`
  (el `<nombre>` se deriva del requerimiento) y delega el trabajo a un subagente que opera solo
  dentro de ese directorio. El árbol principal no se toca. `.trees/` está en `.gitignore`.
