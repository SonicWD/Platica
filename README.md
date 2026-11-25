# Platica

Registro personal de movimientos de dinero que ya ocurrieron. Cada movimiento es una fila. No calcula saldos, no planifica pagos futuros y no muestra gráficos.

## Cómo se guarda

En este navegador quedan los movimientos, las listas y los destinos. La hoja de Google **no se crea sola** y no hace falta iniciar sesión dentro de Platica.

Para tener una copia en tu Drive, conecta tu hoja como hasta ahora:

1. Abre tu Google Sheet.
2. Extensiones → Apps Script, pega el código que muestra la app.
3. Impleméntalo como aplicación web.
4. En Platica, pestaña Google Sheets, agrega el destino: nombre, pestaña, URL que termina en `/exec` y clave opcional.

## Desarrollo

```bash
npm install
npm test
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).
