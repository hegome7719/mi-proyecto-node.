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

// 🧠 Middlewares
app.use(cors());
app.use(express.json());

// 📩 Ruta para enviar notificación desde el conductor al administrador
app.post('/notificar', async (req, res) => {
  console.log("📥 Body recibido en /notificar:", req.body);
  const { numeroConductor, hora, estado } = req.body;

  if (!numeroConductor || !hora || !estado) {
    console.error("❌ Faltan datos en el cuerpo de la solicitud");
    return res.status(400).json({ mensaje: '❌ Faltan datos.' });
  }

  try {
    const adminDoc = await admin.firestore().collection('usuarios').doc('admin').get();
    console.log("🔍 Documento del admin:", adminDoc.exists ? adminDoc.data() : "No encontrado");

    if (!adminDoc.exists) {
      return res.status(500).json({ mensaje: '❌ No se encontró el token del administrador.' });
    }

    const adminToken = adminDoc.data().fcmToken;
    if (!adminToken) {
      return res.status(500).json({ mensaje: '❌ El token del administrador no está registrado.' });
    }

    let title = '';
    let body = '';

    switch (estado.toLowerCase()) {
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

    const message = {
      data: {
        title,
        body,
        numeroConductor,
        hora
      },
      token: adminToken
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Notificación enviada al administrador:', response);
    res.json({ mensaje: '✅ Notificación enviada correctamente.' });

  } catch (error) {
    console.error('❌ Error en el servidor al procesar la notificación:', error);
    res.status(500).json({ mensaje: '❌ Error al enviar la notificación.' });
  }
});

// ✅ Ruta para que el administrador notifique al conductor
app.post('/notificar-conductor', async (req, res) => {
  const { numeroConductor } = req.body;
  console.log("📥 Body recibido en /notificar-conductor:", req.body);

  if (!numeroConductor) {
    return res.status(400).json({ mensaje: '❌ Número de conductor no proporcionado' });
  }

  try {
    const conductorDoc = await admin.firestore().collection('conductores').doc(numeroConductor).get();
    console.log("🔍 Documento del conductor:", conductorDoc.exists ? conductorDoc.data() : "No encontrado");

    if (!conductorDoc.exists) {
      return res.status(404).json({ mensaje: `❌ No se encontró el conductor con número ${numeroConductor}` });
    }

    const fcmToken = conductorDoc.data().fcmToken;
    if (!fcmToken) {
      return res.status(404).json({ mensaje: `❌ El conductor ${numeroConductor} no tiene un token registrado` });
    }

    const message = {
      notification: {
        title: 'Nuevo Formulario Disponible',
        body: 'Se ha guardado un nuevo formulario para ti.'
      },
      token: fcmToken
    };

    const response = await admin.messaging().send(message);
    console.log(`✅ Notificación enviada al conductor ${numeroConductor}:`, response);

    res.json({ mensaje: '✅ Notificación enviada correctamente al conductor' });

  } catch (error) {
    console.error('❌ Error al enviar la notificación al conductor:', error);
    res.status(500).json({ mensaje: '❌ Error al enviar la notificación al conductor' });
  }
});

// 🆕 Ruta para registrar el token del conductor
app.post('/registrar-token-conductor', async (req, res) => {
  const { numeroConductor, fcmToken } = req.body;

  if (!numeroConductor || !fcmToken) {
    return res.status(400).json({ mensaje: '❌ Número de conductor o token faltante' });
  }

  try {
    await admin.firestore().collection('conductores').doc(numeroConductor).set(
      { fcmToken },
      { merge: true }
    );
    res.json({ mensaje: '✅ Token registrado correctamente' });
  } catch (error) {
    console.error('❌ Error al registrar el token del conductor:', error);
    res.status(500).json({ mensaje: '❌ Error al registrar el token del conductor' });
  }
});

// 🌐 Ruta raíz
app.get('/', (req, res) => {
  res.send('🚀 Servidor funcionando correctamente en Railway!');
});

// 🚀 Iniciar servidor
app.listen(port, () => {
  console.log(`✅ Servidor corriendo en puerto ${port}`);
});
