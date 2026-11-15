import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// /u è una pagina server, esterna alla SPA. Anche il ritorno dall'onboarding
// tramite React Router deve quindi effettuare una navigazione del documento.
export function PublicTripRedirect() {
  const location = useLocation();
  const target = `${location.pathname}${location.search}${location.hash}`;
  useEffect(() => { window.location.replace(target); }, [target]);
  return <div className="page-status"><a href={target}>Apri la pagina dell’uscita</a></div>;
}
