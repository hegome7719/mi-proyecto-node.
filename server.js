const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Inicializar Firebase Admin SDK
const serviceAccount = require('./ruta/a/tu/serviceAccountKey.json'); // ← Cambia esto por tu ruta real

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Endpoint para enviar notificación
app.post('/notificar', async (req, res) => {
  const { numeroConductor } = req.body;

  if (!numeroConductor) {
    return res.status(400).json({ error: 'Falta el número del conductor' });
  }

  // Obtener hora actual en formato HH:mm
  const horaActual = new Date();
  const hora = horaActual.getHours().toString().padStart(2, '0');
  const minutos = horaActual.getMinutes().toString().padStart(2, '0');
  const timeString = `${hora}:${minutos}`;

  console.log(`⌚ Hora generada: ${timeString}`); // ← Debug

  const message = {
    data: {
      title: 'Conductor en espera',
      body: `El conductor ${numeroConductor} está esperando desde las ${timeString}`,
    },
    topic: 'admin',
  };

  console.log('📦 Payload a enviar:', message); // ← Debug

  try {
    const response = await admin.messaging().send(message);
    console.log('✅ Notificación enviada con éxito:', response);
    res.status(200).json({ message: 'Notificación enviada al topic admin', response });
  } catch (error) {
    console.error('❌ Error al enviar la notificación:', error);
    res.status(500).json({ error: 'Error al enviar la notificación', details: error });
  }
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
});
