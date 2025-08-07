import { BrowserRouter as Router } from "react-router-dom";
import { ScrollToTop } from "./components/common/ScrollToTop";
import { appRoutes } from "./appRoutes";
import { NotificationProvider } from "./context/NotificationContext";

export default function App() {
  return (
    <NotificationProvider>
      <Router>
        <ScrollToTop />
        {appRoutes()}
      </Router>
    </NotificationProvider>
  );
}

