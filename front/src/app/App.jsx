import { BrowserRouter } from "react-router-dom";

import AppProviders from "./providers/index.jsx";
import AppRoutes from "./routes.jsx";

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  );
}
