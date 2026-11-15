import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminGuard } from "./components/AdminGuard";
import { AppLayout } from "./components/AppLayout";
import { AuthGuard } from "./components/AuthGuard";
import { PublicTripRedirect } from "./components/PublicTripRedirect";
import { AuthProvider } from "./contexts/AuthContext";
import { AdminPage } from "./views/AdminPage";
import { CheckEmailPage } from "./views/CheckEmailPage";
import { ConfirmEmailPage } from "./views/ConfirmEmailPage";
import { CreateTripPage } from "./views/CreateTripPage";
import { DisabledAccountPage } from "./views/DisabledAccountPage";
import { EditTripPage } from "./views/EditTripPage";
import { LoginPage } from "./views/LoginPage";
import { MyTripsPage } from "./views/MyTripsPage";
import { NotificationsPage } from "./views/NotificationsPage";
import { ForgotPasswordPage, UpdatePasswordPage } from "./views/PasswordPages";
import { ProfilePage } from "./views/ProfilePage";
import { RegisterPage } from "./views/RegisterPage";
import { TripDetailPage } from "./views/TripDetailPage";
import { TripDiscoveryPage } from "./views/TripDiscoveryPage";
import { TripFeedbackPage } from "./views/TripFeedbackPage";
import { WelcomePage } from "./views/WelcomePage";

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
            <Route path="conferma-email" element={<ConfirmEmailPage />} />
            <Route path="password-dimenticata" element={<ForgotPasswordPage />} />
            <Route path="aggiorna-password" element={<UpdatePasswordPage />} />
            <Route path="account-disabilitato" element={<DisabledAccountPage />} />
            <Route path="profilo" element={<AuthGuard><ProfilePage /></AuthGuard>} />
            <Route path="crea-uscita" element={<AuthGuard><CreateTripPage /></AuthGuard>} />
            <Route path="trova-uscita" element={<AuthGuard><TripDiscoveryPage /></AuthGuard>} />
            <Route path="mie-uscite" element={<AuthGuard><MyTripsPage /></AuthGuard>} />
            <Route path="notifiche" element={<AuthGuard><NotificationsPage /></AuthGuard>} />
            <Route path="uscite/:tripId" element={<AuthGuard><TripDetailPage /></AuthGuard>} />
            <Route path="uscite/:tripId/modifica" element={<AuthGuard><EditTripPage /></AuthGuard>} />
            <Route path="uscite/:tripId/feedback" element={<AuthGuard><TripFeedbackPage /></AuthGuard>} />
            <Route path="admin" element={<AuthGuard><AdminGuard><AdminPage /></AdminGuard></AuthGuard>} />
            <Route path="u/:tripId" element={<PublicTripRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
