const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const app = express();
const cors = require('cors');
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

// 🛠 Ruta para registrar token de un usuario
app.post('/registrar-token-usuario', (req, res) => {
  const { uid, token } = req.body;

  if (!uid || !token) {
    console.error("❌ Faltan datos: uid o token");
    return res.status(400).json({ mensaje: '❌ UID o Token no proporcionado' });
  }

  // Guardar el token FCM del usuario en Firestore
  const db = admin.firestore();
  const userRef = db.collection('usuarios').doc(uid);

  userRef.update({ fcmToken: token })
    .then(() => {
      console.log(`✅ Token de usuario ${uid} guardado correctamente.`);
      res.json({ mensaje: '✅ Token de usuario guardado correctamente' });
    })
    .catch((error) => {
      console.error('❌ Error al guardar el token de usuario:', error);
      res.status(500).json({ mensaje: '❌ Error al guardar el token de usuario.' });
    });
});

// 📩 Ruta para enviar notificación a un usuario
app.post('/notificar', (req, res) => {
  console.log("📥 Body recibido en /notificar:", req.body);
  console.log("🔐 Token del admin actual:", adminToken);

  const { numeroConductor, hora, uidUsuario } = req.body;  // Recibimos la hora y el UID del usuario desde el dispositivo
  if (!numeroConductor || !adminToken || !hora || !uidUsuario) {
    console.error("❌ Faltan datos. numeroConductor:", numeroConductor, "adminToken:", adminToken, "hora:", hora, "uidUsuario:", uidUsuario);
    return res.status(400).json({ mensaje: '❌ Faltan datos o no hay token del admin registrado.' });
  }

  console.log(`📩 Notificación del conductor ${numeroConductor} a las ${hora}`);

  // Obtener el token FCM del usuario desde Firestore
  const db = admin.firestore();
  db.collection('usuarios').doc(uidUsuario).get()
    .then((doc) => {
      if (!doc.exists) {
        console.error("❌ Usuario no encontrado");
        return res.status(404).json({ mensaje: '❌ Usuario no encontrado' });
      }

      const userToken = doc.data()?.fcmToken;
      if (!userToken) {
        console.error("❌ Token del usuario no encontrado");
        return res.status(400).json({ mensaje: '❌ Token del usuario no encontrado' });
      }

      const message = {
        data: {
          title: 'Conductor en espera',
          body: `Conductor ${numeroConductor} en espera a las ${hora}`,
          numeroConductor: numeroConductor,
          hora: hora
        },
        token: userToken  // Usamos el token FCM del usuario
      };

      // Enviar la notificación al usuario
      admin.messaging().send(message)
        .then((response) => {
          console.log('✅ Notificación enviada al usuario:', response);
          res.json({ mensaje: '✅ Notificación enviada correctamente.' });
        })
        .catch((error) => {
          console.error('❌ Error al enviar la notificación:', error);
          res.status(500).json({ mensaje: '❌ Error al enviar la notificación.' });
        });
    })
    .catch((error) => {
      console.error('❌ Error al obtener el token del usuario:', error);
      res.status(500).json({ mensaje: '❌ Error al obtener el token del usuario' });
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
