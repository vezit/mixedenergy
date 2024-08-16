import Modal from '../components/Modal';
import Header from '../components/Header';  // Import the Header component
import Footer from '../components/Footer';  // Import the Footer component
import { useModal } from '../lib/modals';

export default function CookiePolitik() { 

  return (
    <div className="flex flex-col min-h-screen">
        <div className="container mx-auto p-8">
          <h1 className="text-2xl font-bold mb-4">Cookiepolitik</h1>
          <p>
            Hos <strong>Mixed Energy</strong> anvender vi cookies til at forbedre din oplevelse på vores hjemmeside. Cookies er små tekstfiler, der gemmes på din enhed, når du besøger vores hjemmeside. De hjælper os med at huske dine præferencer og forstå, hvordan du interagerer med vores hjemmeside.
          </p>

          <h2 className="text-xl font-bold mt-6 mb-2">Hvilke typer cookies bruger vi?</h2>
          <ul className="list-disc list-inside">
            <li><strong>Nødvendige cookies:</strong> Disse cookies er essentielle for, at hjemmesiden kan fungere korrekt. De sikrer grundlæggende funktioner som navigation på siden og adgang til sikre områder af hjemmesiden.</li>
            <li><strong>Præference-cookies:</strong> Disse cookies gør det muligt for vores hjemmeside at huske oplysninger, der ændrer den måde, hjemmesiden ser ud eller opfører sig på, som f.eks. dit foretrukne sprog.</li>
            <li><strong>Statistik-cookies:</strong> Disse cookies hjælper os med at forstå, hvordan besøgende interagerer med hjemmesiden, ved at indsamle og rapportere oplysninger anonymt.</li>
            <li><strong>Marketing-cookies:</strong> Disse cookies bruges til at spore besøgende på tværs af hjemmesider. Formålet er at vise annoncer, der er relevante og engagerende for den enkelte bruger.</li>
          </ul>

          <h2 className="text-xl font-bold mt-6 mb-2">Hvordan kan du kontrollere cookies?</h2>
          <p>
            Du kan til enhver tid ændre dine cookie-indstillinger ved at justere dine browserindstillinger til at blokere eller advare dig om cookies. Bemærk dog, at hvis du vælger at blokere cookies, kan det påvirke din oplevelse af vores hjemmeside.
          </p>

          <h2 className="text-xl font-bold mt-6 mb-2">Ændringer i vores cookiepolitik</h2>
          <p>
            Vi kan opdatere denne cookiepolitik fra tid til anden for at afspejle ændringer i den teknologi, vi bruger, eller for at overholde nye lovkrav. Eventuelle ændringer vil blive offentliggjort på denne side.
          </p>

          <h2 className="text-xl font-bold mt-6 mb-2">Kontakt os</h2>
          <p>
            Hvis du har spørgsmål om vores brug af cookies, kan du kontakte os på <a href="mailto:mixedenergy.dk@gmail.com" className="text-blue-500">mixedenergy.dk@gmail.com</a> eller ringe til os på 42172145.
          </p>
        </div>
    </div>
  );
}
