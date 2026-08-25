// Push notification handler for service worker

// Handle push notifications
self.addEventListener('push', function(event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const { title, body, url, data: notificationData } = data;

    const options = {
      body: body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'leadbase-notification',
      renotify: true,
      data: {
        url: url || '/',
        ...notificationData,
      },
      actions: [
        {
          action: 'open',
          title: 'Ver',
        },
        {
          action: 'close',
          title: 'Fechar',
        },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('Error parsing push notification:', error);
  }
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  if (event.action === 'close') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If a window client is already open, focus it
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(url);
          }
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event.notification.tag);
});
