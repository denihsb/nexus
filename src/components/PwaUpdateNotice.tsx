import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Surfaces PWA lifecycle events to the user instead of updating silently.
 * Users can choose when to reload so an active task is not interrupted.
 */
export function PwaUpdateNotice() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const intervalId = window.setInterval(() => {
        registration.update().catch(() => {
          // Ignore transient network errors while checking for updates.
        });
      }, 60 * 60 * 1000);
      window.addEventListener("beforeunload", () => window.clearInterval(intervalId), {
        once: true,
      });
    },
  });

  function close() {
    setNeedRefresh(false);
    setOfflineReady(false);
  }

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="pwa-update-toast" role="status" aria-live="polite">
      {needRefresh ? (
        <>
          <span>Versi baru NEXUS tersedia.</span>
          <div className="pwa-update-actions">
            <button
              type="button"
              className="link-button"
              onClick={() => updateServiceWorker(true)}
            >
              Muat ulang
            </button>
            <button type="button" className="link-button" onClick={close}>
              Nanti
            </button>
          </div>
        </>
      ) : (
        <>
          <span>NEXUS siap digunakan secara offline.</span>
          <button type="button" className="link-button" onClick={close}>
            Tutup
          </button>
        </>
      )}
    </div>
  );
}
