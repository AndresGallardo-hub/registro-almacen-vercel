# Registro del almacén

App para cargar ventas desde el celular, con historial permanente en base de datos.

## Puesta en marcha (una sola vez)

1. Subir esta carpeta a un repositorio de GitHub (se puede hacer desde la web de GitHub,
   sin instalar nada: "Create repository" → "uploading an existing file" → arrastrar
   todos estos archivos).
2. Entrar a vercel.com, crear cuenta gratis con la misma cuenta de GitHub.
3. "Add New..." → "Project" → elegir el repositorio que acabás de subir → "Deploy".
   (No hace falta tocar ninguna configuración, Next.js se detecta solo).
4. Una vez desplegado: en el proyecto de Vercel, ir a la pestaña **Storage** →
   **Browse Marketplace** → elegir **Neon** (plan gratis) → **Connect**.
   Esto crea la base de datos y conecta las variables automáticamente. No hay
   que tocar el código ni escribir ningún SQL: la tabla se crea sola la primera
   vez que se usa la app.
5. Volver a la pestaña **Deployments** y darle **Redeploy** una vez (para que
   tome la nueva variable de la base de datos).
6. Listo. La URL que te da Vercel (algo como `registro-almacen.vercel.app`) es
   el link fijo para usar siempre. Se puede agregar a la pantalla de inicio del
   celular como un ícono más.
