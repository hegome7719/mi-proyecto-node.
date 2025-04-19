const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const app = express();
const port = process.env.PORT || 3000;

// 🔐 Decodificar las credenciales desde variable de entorno BASE64
const firebaseCredentials = JSON.parse(
  Buffer.from(process.env.FIREBASE_CREDENTIALS_BASE64, 'base64').toString('utf-8')
);

// 🚀 Inicializar Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(firebaseCredentials),
  databaseURL: "https://fata-express-default-rtdb.firebaseio.com/"
});

// 📁 Servir archivos estáticos (por ejemplo para verificación de dominio)
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));

// 🧠 Middleware para parsear JSON
app.use(express.json());

// ✅ Variable global para guardar el token del administrador
let adminToken = null;

// 🛠 Ruta para registrar token del admin
app.post('/registrar-token', (req, res) => {
  const { token } = req.body;

  if (!token) {
    console.error("❌ Token no proporcionado");
    return res.status(400).json({ mensaje: '❌ Token no proporcionado' });
  }

  adminToken = token;
  console.log('✅ Token del administrador registrado:', token);
  res.json({ mensaje: '✅ Token del administrador guardado correctamente' });
});

// 📩 Ruta para enviar notificación desde el conductor
app.post('/notificar', (req, res) => {
  console.log("📥 Body recibido en /notificar:", req.body);
  console.log("🔐 Token del admin actual:", adminToken);

  const { numeroConductor } = req.body;

  if (!numeroConductor || !adminToken) {
    console.error("❌ Faltan datos. numeroConductor:", numeroConductor, "adminToken:", adminToken);
    return res.status(400).json({ mensaje: '❌ Faltan datos o no hay token del admin registrado.' });
  }

  console.log(`📩 Notificación del conductor ${numeroConductor} hacia el administrador`);

  const message = {
    notification: {
      title: 'Nuevo formulario en espera',
      body: `Conductor ${numeroConductor} ha enviado un formulario.`
    },
    token: adminToken
  };

  admin.messaging().send(message)
    .then((response) => {
      console.log('✅ Notificación enviada al administrador:', response);
      res.json({ mensaje: '✅ Notificación enviada correctamente.' });
    })
    .catch((error) => {
      console.error('❌ Error al enviar la notificación:', error);
      res.status(500).json({ mensaje: '❌ Error al enviar la notificación.' });
    });
});

// 🌐 Ruta raíz para verificar que el servidor funciona
app.get('/', (req, res) => {
  res.send('🚀 Servidor funcionando correctamente en Railway!');
});

// 🚀 Iniciar servidor
app.listen(port, () => {
  console.log(`✅ Servidor corriendo en puerto ${port}`);
});
