import { useState } from 'react';
import Modal from '../components/Modal';
import Header from '../components/Header';  // Import the Header component
import Footer from '../components/Footer';  // Import the Footer component
import { useModal } from '../lib/modals';

export default function Handelsbetingelser() {


  return (
    <div className="flex flex-col min-h-screen">

      {/* Main Content */}
      <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">Handelsbetingelser hos Mixed Energy</h1>
      
      <h2 className="text-2xl font-bold mt-4 mb-2">Generelle oplysninger</h2>
      <p>Mixed Energy</p>
      <p>Bagværds Hovedgade 141</p>
      <p>2800 Bagsværd</p>
      <p>CVR nr.: 44992302</p>
      <p>Telefon: 42172145</p>
      <p>Email: mixedenergy.dk@gmail.com</p>

      <h2 className="text-2xl font-bold mt-4 mb-2">Priser</h2>
      <p>
        Hos Mixed Energy er alle priserne i danske kroner og angivet inkl. moms og afgifter. 
        Vi forbeholder os ret til fra dag til dag at ændre i priserne uden forudgående samtykke. 
        Der tages forbehold for udsolgte varer.
      </p>

      <h2 className="text-2xl font-bold mt-4 mb-2">Betaling</h2>
      <p>
        Mixed Energy modtager betaling med VISA-Dankort, VISA, VISA Electron, Mastercard, MobilePay. 
        Betalingen vil først blive trukket på din konto, når varen afsendes. 
        Alle beløb er i DKK. Danske kroner og incl. moms. 
        Der tages forbehold for prisfejl og udsolgte/udgåede varer.
      </p>

      <h2 className="text-2xl font-bold mt-4 mb-2">Levering</h2>
      <p>
        Mixed Energy tilstræber at afsende ordre indgået inden kl. 17 samme dag, 
        ordre herefter sendes næstfølgende hverdag. Vi sender til hele Danmark. Fragtpriser fra 35 kr. 
        Varer vil blive leveret på leveringsadressen, der angives ved bestillingen. 
        Vi leverer ikke til udlandet og ikke til Færøerne og Grønland. 
        Dine varer sendes med Post Nord eller GLS. 
        OBS: Hvis der ikke er plads på udleveringsstedet bliver pakken flyttet til nærmeste udleveringssted, 
        hvilket du får besked om. Opstår der problemer, kontakt da kundeservice. 
        Der leveres varer alle ugens hverdage. Din vare vil blive leveret 1-3 hverdage efter bestillingen.
        For visse varer gælder særlige leveringsvilkår. Betingelserne vil fremgå specifikt forud for køb af disse varer.
      </p>

      <h2 className="text-2xl font-bold mt-4 mb-2">Reklamationsret</h2>
      <p>
        Der gives 2 års reklamationsret i henhold til købeloven. 
        Vores reklamationsret gælder for fejl i materiale og/eller fabrikation. 
        Du kan få varen repareret, ombyttet, pengene retur eller afslag i prisen, afhængig af den konkrete situation. 
        Reklamationen gælder ikke fejl eller skader begået ved forkert håndtering af produktet/ydelsen. 
        Du skal reklamere i "rimelig tid" efter du har opdaget manglen/fejlen. 
        Mixed Energy vil dække returneringsomkostninger i et rimeligt omfang.
      </p>
      <p>
        Ved returnering, reklamationer og benyttelse af fortrydelsesretten sendes til:
      </p>
      <p>Mixed Energy</p>
      <p>Bagværds Hovedgade 141</p>
      <p>2800 Bagsværd</p>
      <p>Der modtages ikke forsendelser pr. efterkrav.</p>

      <h2 className="text-2xl font-bold mt-4 mb-2">Refusion</h2>
      <p>
        Hvis der er tale om refusion, bedes du medsende bankoplysninger i form af regnr og kontonr, 
        så det aftalte beløb kan overføres. Disse oplysninger kan uden risiko oplyses pr. mail 
        eller anden elektronisk form, da det ikke er følsomme oplysninger og kun vil blive anvendt til 
        vores opfyldelse af refusionen.
      </p>

      <h2 className="text-2xl font-bold mt-4 mb-2">Fortrydelsesret</h2>
      <p>Der gives 14 dages fuld returret på varer købt i vores webshop. Perioden regnes fra den dag;</p>
      <ul className="list-disc pl-8">
        <li>Hvor du modtager ordren.</li>
        <li>
          Får den sidste vare i fysisk besiddelse, når det drejer sig om en aftale om flere forskellige varer, 
          bestilt i én ordre, men leveres enkeltvis eller af flere omgange.
        </li>
        <li>
          Får det sidste parti, eller sidste del i fysisk besiddelse, når det drejer sig om aftale af levering 
          af varer der består af flere partier/dele.
        </li>
        <li>
          Den første vare i fysisk besiddelse, når det drejer sig om regelmæssig levering af varer over en bestemt periode.
        </li>
      </ul>
      <p>Returneringsomkostninger skal du selv afholde.</p>
      <p>
        Fortrydelse skal anmeldes til os senest 14 efter købet og fra fortrydelsen skal I senest 14 dage efter 
        returnere forsendelsen. Meddelelsen skal gives pr. mail på mixedenergy.dk@gmail.com. 
        I meddelelsen skal du gøre tydeligt opmærksom på, at du ønsker at benytte din fortrydelsesret. 
        Ønsker du at sende varen retur til os, skal du udfylde den vedlagte Returseddel og sende varen til:
      </p>
      <p>Mixed Energy</p>
      <p>Bagværds Hovedgade 141</p>
      <p>2800 Bagsværd</p>
      <p>Du kan ikke fortryde ved blot at nægte modtagelse af varen, uden samtidig at give tydelig meddelelse herom.</p>

      <h2 className="text-2xl font-bold mt-4 mb-2">Varer undtaget fortrydelsesretten</h2>
      <p>Følgende varetyper indgår ikke i fortrydelsesretten:</p>
      <ul className="list-disc pl-8">
        <li>Varer, som er fremstillet efter forbrugerens specifikationer eller har fået et tydeligt personligt præg.</li>
        <li>
          Forseglede varer, som af sundhedsbeskyttelses- eller hygiejnemæssige årsager ikke er egnet til at blive returneret, 
          og hvor forseglingen er brudt efter leveringen.
        </li>
        <li>Varer, der grundet sin art bliver uløseligt blandet sammen med andre ved levering.</li>
        <li>Varer, hvor plomberingen er brudt.</li>
        <li>
          Udførte ikke-finansielle tjenesteydelser, hvis levering af tjenesteydelsen er påbegyndt med forbrugerens forudgående 
          udtrykkelige samtykke og anerkendelse af, at fortrydelsesretten ophører, når tjenesteydelsen er fuldt udført.
        </li>
        <li>
          Levering af digitalt indhold, som ikke leveres på et fysisk medium, hvis udførelsen er påbegyndt med 
          forbrugerens forudgående udtrykkelige samtykke og anerkendelse heraf, at vedkommende dermed mister sin fortrydelsesret.
        </li>
        <li>Aviser, tidskrifter eller magasiner dog undtaget abonnementsaftaler for sådanne publikationer.</li>
        <li>Aftaler indgået på offentlig auktion.</li>
        <li>Varer, der forringes eller forældes hurtigt.</li>
      </ul>

      <h2 className="text-2xl font-bold mt-4 mb-2">Returnering</h2>
      <p>
        Du skal sende din ordre retur uden unødig forsinkelse og senest 14 dage efter, at du har gjort brug af din fortrydelsesret. 
        Du skal afholde de direkte udgifter i forbindelse med returnering. 
        Ved returnering er du ansvarlig for, at varen er pakket ordentligt ind. 
        Du skal vedlægge en kopi af ordrebekræftelsen. Ekspeditionen går hurtigere, hvis du ligeledes udfylder 
        og vedlægger vores Fortrydelsesformular.
      </p>
      <p>Du bærer risikoen for varen fra tidspunktet for varens levering og til, vi har modtaget den retur.</p>
      <p>Vi modtager ikke pakker sendt pr. efterkrav.</p>

      <h2 className="text-2xl font-bold mt-4 mb-2">Varens stand ved returnering</h2>
      <p>
        Du hæfter kun for eventuel forringelse af varens værdi, som skyldes anden håndtering, 
        end hvad der er nødvendigt for at fastslå varens art, egenskaber og den måde, hvorpå den fungerer. 
        Du kan med andre ord prøve varen, som hvis du prøvede den i en fysisk butik.
      </p>
      <p>
        Hvis varen er prøvet udover, det ovenfor beskrevet, betragtes den som brugt. Hvilket betyder, at du ved 
        fortrydelse af købet kun får en del eller intet af købsbeløbet retur, afhængig af varens handelsmæssige 
        værdi på modtagelsestidspunktet - af returneringen. For at modtage hele købsbeløbet retur må du altså 
        afprøve varen uden egentlig at tage den i brug.
      </p>

      <h2 className="text-2xl font-bold mt-4 mb-2">Tilbagebetaling</h2>
      <p>
        Fortryder du dit køb, får du naturligvis det beløb du har indbetalt til os retur.
        I tilfælde af en værdiforringelse, som du hæfter for, fratrækkes denne købs-beløbet.
        Ved anvendelse af fortrydelsesretten, refunderes alle betalinger modtaget fra dig, herunder leveringsomkostninger 
        (undtaget ekstra omkostninger som følge af dit valg af en anden leveringsform end den billigste form for 
        standardlevering, som vi tilbyder), uden unødig forsinkelse og senest 14 dage fra den dato, hvor vi har 
        modtaget meddelelse om din beslutning om at gøre brug af fortrydelsesretten. 
        Tilbagebetaling gennemføres med samme betalingsmiddel, som du benyttede ved den oprindelige transaktion, 
        medmindre du udtrykkeligt har indvilget i noget andet.
        Vi kan tilbageholde beløbsrefunderingen, indtil vi har modtaget varen retur, 
        med mindre du inden da har fremlagt dokumentation for at have returneret den.
      </p>

      <h2 className="text-2xl font-bold mt-4 mb-2">Persondatapolitik</h2>
      <p>For at du kan indgå aftale med os og handle på vores hjemmeside, har vi brug for følgende oplysninger om dig:</p>
      <ul className="list-disc pl-8">
        <li>Navn</li>
        <li>Adresse</li>
        <li>Telefonnummer</li>
        <li>E-mailadresse</li>
        <li>Oplysning om hvad du har købt</li>
      </ul>
      <p>
        Vi behandler dine personoplysninger med det formål, at kunne levere varen til dig, 
        og for at kunne behandle henvendelser vedrørende dit køb. 
        Behandlingen sker efter reglerne i vores persondatapolitik for Mixed Energy. 
        Heri kan du læse mere om, hvordan dine oplysninger behandles, hvornår de slettes, 
        og hvilke rettigheder du har som registreret.
      </p>

      <h2 className="text-2xl font-bold mt-4 mb-2">Klagemuligheder – oversigt og links:</h2>
      <p>
        Har du en klage over et produkt, købt i vores Webshop, kan der sendes en klage til:
        Konkurrence- og Forbrugerstyrelsens Center for Klageløsning
        Carl Jacobsens Vej 35
        2500 Valby
        Link: <a href="http://www.forbrug.dk" className="text-blue-500 hover:underline">www.forbrug.dk</a>
      </p>
      <p>
        Hvis du er forbruger med bopæl i et andet EU-land, kan du angive din klage i EU Kommissionens online klageplatform.
        Platformen findes her: <a href="http://ec.europa.eu/consumers/odr/" className="text-blue-500 hover:underline">http://ec.europa.eu/consumers/odr/</a>
        Angiver du en klage her, skal du oplyse vores E-mail adresse: mixedenergy.dk@gmail.com
      </p>
    </div>


    </div>
  );
}


