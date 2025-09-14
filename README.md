# Qwizu

Qwizu es una aplicación de cuestionarios en tiempo real pensada para dinamizar el aprendizaje en el aula.

## Uso educativo

Este proyecto está diseñado exclusivamente para actividades escolares y su empleo se limita a fines educativos.

## Nota legal

Qwizu es un proyecto independiente y no mantiene relación alguna con Kahoot!, Kahoot! Inc. ni con otras marcas registradas similares.

## Licencia

El software se distribuye bajo la [licencia](LICENSE) incluida en este repositorio, la cual restringe su uso a contextos escolares y no comerciales.

## Ejecución local

1. Instala las dependencias con `npm install`.
2. Inicia el servidor con `npm start` y abre `http://localhost:3000` en tu navegador.
3. Desde la página del host podrás crear una sala y los jugadores se conectarán usando el PIN en `/player.html`.

## Despliegue en Render

1. Crea un servicio web de Node.js en [Render](https://render.com) enlazando este repositorio.
2. Render detectará automáticamente el archivo `render.yaml` y usará `npm install` como comando de build y `node server.js` para iniciar la aplicación.
3. Una vez desplegado, la aplicación quedará disponible en la URL que Render asigne.

## Configuración de preguntas, tiempo y puntuación

En la interfaz del host se pueden ajustar los parámetros del juego:

- **Tiempo (s):** duración máxima de cada pregunta.
- **Puntos base:** puntaje otorgado por responder correctamente; se escala según el tiempo restante.
- **Preguntas:** listado en formato JSON. Cada pregunta incluye `text`, arreglo de cuatro `options` y el índice `answer` de la opción correcta.

Ejemplo de configuración de preguntas:

```json
[
  {"text": "¿Capital de México?", "options": ["Ciudad de México", "Guadalajara", "Monterrey", "Puebla"], "answer": 0},
  {"text": "¿Año de lanzamiento de Bootstrap 5 estable?", "options": ["2019", "2020", "2021", "2022"], "answer": 2}
]
```

