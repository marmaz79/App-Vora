# Vora - Lettore Accessibile di Libri con Sintesi Vocale

Vora (precedentemente Leggimi) è un'applicazione web accessibile ad alto contrasto per la lettura e l'ascolto di libri digitali (PDF, EPUB, TXT e scansioni fotografiche) con sintesi vocale naturale in lingua italiana, appositamente progettata per non vedenti e ipovedenti.

## Funzionalità Principali
- **Sintesi Vocale Italiana:** Web Speech API con regolazione della velocità di riproduzione (0.6x - 2.0x), tonalità (pitch), anteprima vocale e avanzamento automatico alla pagina successiva.
- **Interfaccia ad Alto Contrasto WCAG:** Sfondo nero puro (#000000), testo ad alto contrasto (#FFFFFF), evidenziazioni gialle (#FFD600) e target tattili superiori a 72pt.
- **Caricamento e Gestione Libri:** Supporto per il caricamento di file PDF, EPUB, file di testo puro TXT e scansione OCR di pagine cartacee.
- **Miglioramento Testo con AI:** Normalizzazione tipografica, ricongiunzione di parole spezzate da a-capo e pulizia del testo estratto.
- **Libreria Precaricata:** Include opere classiche della letteratura italiana pronte all'ascolto (Pinocchio di Carlo Collodi, I Promessi Sposi di Alessandro Manzoni, Favole al Telefono di Gianni Rodari).

## Esecuzione
```bash
npm run dev
```
L'applicazione viene avviata sulla porta `3000` con host `0.0.0.0`.
