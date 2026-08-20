import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { AuthGuard } from "./components/AuthGuard";
import { AuthProvider } from "./contexts/AuthContext";
import { CheckEmailPage } from "./pages/CheckEmailPage";
import { CreateTripPage } from "./pages/CreateTripPage";
import { EditTripPage } from "./pages/EditTripPage";
import { LoginPage } from "./pages/LoginPage";
import { MyTripsPage } from "./pages/MyTripsPage";
import { ForgotPasswordPage, UpdatePasswordPage } from "./pages/PasswordPages";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";
import { TripDetailPage } from "./pages/TripDetailPage";
import { TripDiscoveryPage } from "./pages/TripDiscoveryPage";
import { WelcomePage } from "./pages/WelcomePage";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<WelcomePage />} />
            <Route path="accedi" element={<LoginPage />} />
            <Route path="registrati" element={<RegisterPage />} />
            <Route path="controlla-email" element={<CheckEmailPage />} />
            <Route path="password-dimenticata" element={<ForgotPasswordPage />} />
            <Route path="aggiorna-password" element={<UpdatePasswordPage />} />
            <Route path="profilo" element={<AuthGuard><ProfilePage /></AuthGuard>} />
            <Route path="crea-uscita" element={<AuthGuard><CreateTripPage /></AuthGuard>} />
            <Route path="trova-uscita" element={<AuthGuard><TripDiscoveryPage /></AuthGuard>} />
            <Route path="mie-uscite" element={<AuthGuard><MyTripsPage /></AuthGuard>} />
            <Route path="uscite/:tripId" element={<AuthGuard><TripDetailPage /></AuthGuard>} />
            <Route path="uscite/:tripId/modifica" element={<AuthGuard><EditTripPage /></AuthGuard>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
