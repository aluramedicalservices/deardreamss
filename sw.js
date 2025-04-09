self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'Alerta del juego';
  const body = data.body || 'Tu personaje necesita atención.';
  const icon = '/icon.png'; // Asegúrate de que la ruta del ícono sea correcta
  const badge = '/badge.png';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
    })
  );
});