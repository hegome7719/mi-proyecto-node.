const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const app = express();
const port = process.env.PORT || 3000;

// Decodificar las credenciales desde la variable de entorno base64
const firebaseCredentials = JSON.parse(Buffer.from(process.env.FIREBASE_CREDENTIALS_BASE64, 'base64').toString('utf-8'));

// Inicializar Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(firebaseCredentials),
  databaseURL: "https://<your-database-name>.firebaseio.com" // Cambia esto por tu URL de Firebase
});

// Servir archivos estáticos si los necesitas
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));

// Middleware para parsear JSON
app.use(express.json());

// Ruta de prueba para notificación
app.post('/notificar', (req, res) => {
  const { numeroConductor } = req.body;
  console.log(`📩 Notificación para el conductor: ${numeroConductor}`);

  // Lógica para enviar la notificación usando Firebase
  const message = {
    notification: {
      title: 'Notificación de prueba',
      body: `Hola conductor ${numeroConductor}, tienes una nueva notificación.`
    },
    token: "<token-del-conductor>" // Aquí debes usar el token de FCM del conductor
  };

  admin.messaging().send(message)
    .then((response) => {
      console.log('Notificación enviada con éxito:', response);
      res.json({ mensaje: '✅ Notificación enviada correctamente.' });
    })
    .catch((error) => {
      console.error('Error al enviar la notificación:', error);
      res.status(500).json({ mensaje: '❌ Error al enviar la notificación.' });
    });
});

// Iniciar servidor HTTP
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en puerto ${port}`);
});
