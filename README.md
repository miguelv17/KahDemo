# PartyQuiz (Node.js + Socket.io + Bootstrap 5)

Juego tipo Kahoot multijugador para tu grupo de amigos.

## Demo local

```bash
npm install
npm run start
```

- Host: http://localhost:3000/host.html
- Jugador: http://localhost:3000/player.html
 - Presentador: http://localhost:3000/presenter.xhtml

Para que los móviles de tu red entren, usa `http://TU_IP_LOCAL:3000/player.html`.

## Deploy en Render

1. Sube este repo a GitHub.
2. En Render, crea un **Web Service** desde tu repo (Build: `npm install`, Start: `node server.js`).
3. Render asigna `PORT` automáticamente (el servidor ya lo usa).
4. Abre la URL pública de Render:
   - Host: `https://tu-app.onrender.com/host.html`
   - Jugador: `https://tu-app.onrender.com/player.html`

> Socket.io funciona out-of-the-box en Render.

## Estructura

```
partyquiz/
├─ package.json
├─ server.js
└─ public/
   ├─ host.html
   ├─ player.html
   ├─ styles.css
   └─ client.js
```

## Formato de preguntas

```json
[
  {
    "text": "¿Capital de México?",
    "options": ["Ciudad de México","Guadalajara","Monterrey","Puebla"],
    "answer": 0
  }
]
```

## Notas

- Estado en memoria (suficiente para partidas casuales). Si escalas, usar Redis/DB.
- Si usas Nginx como proxy, no olvides `Upgrade`/`Connection: upgrade` para WebSockets.
