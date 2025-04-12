const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Servir archivos estáticos si los necesitas
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));

// Middleware para parsear JSON
app.use(express.json());

// Ruta de prueba para notificación
app.post('/notificar', (req, res) => {
  const { numeroConductor } = req.body;
  console.log(`📩 Notificación para el conductor: ${numeroConductor}`);
  res.json({ mensaje: '✅ Notificación recibida correctamente.' });
});

// Iniciar servidor HTTP
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en puerto ${port}`);
});
