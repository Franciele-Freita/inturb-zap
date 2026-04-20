const webpush = require("web-push");

const keys = webpush.generateVAPIDKeys();

console.log("Use estas variaveis no backend:");
console.log(`WEB_PUSH_SUBJECT=mailto:notificacoes@example.com`);
console.log(`WEB_PUSH_PUBLIC_KEY=${keys.publicKey}`);
console.log(`WEB_PUSH_PRIVATE_KEY=${keys.privateKey}`);
