import * as admin from "firebase-admin";

// Inicializa o Firebase Admin SDK se ainda não estiver inicializado
if (!admin.apps.length) {
  admin.initializeApp();
}

// Exporta o Firestore e Authentication para uso em outras partes do projeto
const firestore = admin.firestore();
const auth = admin.auth();

export {firestore, auth};
