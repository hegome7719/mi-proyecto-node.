const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const app = express();
const cors = require('cors'); // ✅ Agregar esta línea
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
app.use(cors()); // ✅ Habilitar CORS
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

  const { numeroConductor, hora, estado } = req.body;  // Recibimos la hora y el estado desde el dispositivo
  if (!numeroConductor || !adminToken || !hora || !estado) {
    console.error("❌ Faltan datos. numeroConductor:", numeroConductor, "adminToken:", adminToken, "hora:", hora, "estado:", estado);
    return res.status(400).json({ mensaje: '❌ Faltan datos o no hay token del admin registrado.' });
  }

  console.log(`📩 Notificación del conductor ${numeroConductor} a las ${hora}, Estado: ${estado}`);

  // Personalizar el título y el cuerpo según el estado
  let title = '';
  let body = '';

  switch (estado) {
    case 'en espera':
      title = 'Conductor en espera';
      body = `Conductor ${numeroConductor} en espera a las ${hora}`;
      break;
    case 'cargado':
      title = 'Conductor cargado';
      body = `Conductor ${numeroConductor} cargado a las ${hora}`;
      break;
    case 'descargado':
      title = 'Conductor descargado';
      body = `Conductor ${numeroConductor} descargado a las ${hora}`;
      break;
    default:
      title = 'Estado desconocido';
      body = `Conductor ${numeroConductor} tiene un estado desconocido a las ${hora}`;
      break;
  }

  // Enviar la notificación
  const message = {
    data: {
      title: title,
      body: body,
      numeroConductor: numeroConductor,
      hora: hora
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
