const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 3000;

// 🔐 Decodificar credenciales desde variable de entorno BASE64
const firebaseCredentials = JSON.parse(
  Buffer.from(process.env.FIREBASE_CREDENTIALS_BASE64, 'base64').toString('utf-8')
);

// 🚀 Inicializar Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(firebaseCredentials),
  databaseURL: "https://fata-express-default-rtdb.firebaseio.com/"
});

// 📁 Servir archivos estáticos (verificación de dominio, etc.)
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));

// 🧠 Middleware
app.use(cors());
app.use(express.json());

// ✅ Variable global para guardar el token del administrador
let adminToken = null;

// 📥 Ruta para registrar el token del administrador
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

// 📩 Ruta para notificar desde conductor hacia admin
app.post('/notificar', (req, res) => {
  const { numeroConductor, hora, estado } = req.body;

  if (!numeroConductor || !adminToken || !hora || !estado) {
    console.error("❌ Faltan datos");
    return res.status(400).json({ mensaje: '❌ Faltan datos o no hay token del admin registrado.' });
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
      title: title,
      body: body,
      numeroConductor: numeroConductor,
      hora: hora
    },
    token: adminToken
  };

  admin.messaging().send(message)
    .then(response => {
      console.log('✅ Notificación enviada al administrador:', response);
      res.json({ mensaje: '✅ Notificación enviada correctamente.' });
    })
    .catch(error => {
      console.error('❌ Error al enviar la notificación:', error);
      res.status(500).json({ mensaje: '❌ Error al enviar la notificación.' });
    });
});

// 📩 Ruta para notificar a un conductor (POST /notificar-conductor)
app.post('/notificar-conductor', async (req, res) => {
  const { numeroConductor, titulo, cuerpo } = req.body;

  // Log inicial de recepción
  console.log(`📥 Solicitud recibida para notificar al conductor`);
  console.log(`🔹 Datos recibidos -> númeroConductor: ${numeroConductor}, título: ${titulo}, cuerpo: ${cuerpo}`);

  // Validación de campos requeridos
  if (!numeroConductor || !titulo || !cuerpo) {
    console.warn(`⚠️ Faltan campos requeridos`);
    return res.status(400).json({ mensaje: '❌ Faltan campos requeridos (numeroConductor, titulo, cuerpo)' });
  }

  try {
    // Buscar conductor en Firestore
    console.log(`🔍 Buscando conductor con número: ${numeroConductor}`);
    const snapshot = await admin.firestore()
      .collection('conductores')
      .where('numeroConductor', '==', numeroConductor)
      .get();

    // Verificar si se encontró el conductor
    if (snapshot.empty) {
      console.error(`🔴 Conductor con número ${numeroConductor} no encontrado en Firestore`);
      return res.status(404).json({ mensaje: '❌ Conductor no encontrado' });
    }

    // Extraer datos del documento del conductor
    const conductorDoc = snapshot.docs[0];
    const conductorData = conductorDoc.data();
    console.log(`✅ Conductor encontrado: ID: ${conductorDoc.id}, Datos: ${JSON.stringify(conductorData)}`);

    // Verificar si tiene token
    const token = conductorData.token;
    if (!token) {
      console.error(`🔴 El conductor con número ${numeroConductor} no tiene token registrado`);
      return res.status(400).json({ mensaje: '❌ El conductor no tiene token registrado' });
    }

    console.log(`✅ Token del conductor: ${token}`);

    // Construir y enviar mensaje
    const message = {
      notification: {
        title: titulo,
        body: cuerpo
      },
      token: token
    };

    console.log(`📤 Enviando notificación al token: ${token}`);
    const response = await admin.messaging().send(message);

    // Confirmación
    console.log(`✅ Notificación enviada correctamente: ${response}`);
    res.status(200).json({ mensaje: '✅ Notificación enviada al conductor' });

  } catch (error) {
    console.error(`❌ Error al enviar la notificación al conductor:`, error);
    res.status(500).json({ mensaje: '❌ Error al notificar al conductor' });
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
