import { BrowserRouter as Router } from "react-router-dom";
import { ScrollToTop } from "./components/common/ScrollToTop";
import { FirebaseNotificationListener } from "./components/FirebaseNotificationListener";
import { appRoutes } from "./appRoutes";
import { NotificationProvider } from "./context/NotificationContext";

import { useState, useEffect } from "react";

export default function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // Always get the latest token after login
    setAccessToken(localStorage.getItem("access_token"));
    // Optionally, listen for storage events if login can happen in another tab
    const onStorage = () => setAccessToken(localStorage.getItem("access_token"));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Only render notification listener if token is present
  return (
    <NotificationProvider>
      <Router>
        <ScrollToTop />
        {accessToken && <FirebaseNotificationListener userToken={accessToken} />}
        {appRoutes()}
      </Router>
    </NotificationProvider>
  );
}
