import { Book } from '../types';

export const SAMPLE_BOOKS: Book[] = [
  {
    book_id: 'sample-pinocchio',
    owner_id: 'demo-user',
    title: 'Le Avventure di Pinocchio',
    author: 'Carlo Collodi',
    file_type: 'epub',
    size: 245000,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    source: 'sample',
    coverColor: '#FFFFFF',
    currentPage: 0,
    bookmarks: [
      {
        id: 'bm-sample-1',
        book_id: 'sample-pinocchio',
        pageIndex: 1,
        snippet: 'Appena maestro Ciliegia ebbe visto quel pezzo di legno, se ne rallegrò tutto...',
        note: 'La vocina misteriosa nel legno',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
    ],
    pages: [
      `Capitolo I. Come andò che maestro Ciliegia, falegname, trovò un pezzo di legno, che piangeva e rideva come un bambino.

C'era una volta...
— Un re! — diranno subito i miei piccoli lettori.
— No, ragazzi, avete sbagliato. C'era una volta un pezzo di legno.

Non era un legno di lusso, ma un semplice pezzo da catasta, di quelli che d'inverno si mettono nelle stufe e nei caminetti per accendere il fuoco e per riscaldare le stanze.

Non so come andasse, ma il fatto gli è che un bel giorno questo pezzo di legno capitò nella bottega di un vecchio falegname, il quale aveva nome maestro Antonio, se non che tutti lo chiamavano maestro Ciliegia, per via della punta del suo naso, che era sempre lustra e paonazza, come una ciliegia matura.`,

      `Appena maestro Ciliegia ebbe visto quel pezzo di legno, se ne rallegrò tutto; e dandosi una fregatina di mani per la contentezza, borbottò a mezza voce:
— Questo legno è capitato a tempo: voglio servirmene per fare una gamba di tavolino.

Detto fatto, prese subito la scure arrotata per cominciare a levargli la scorza e a digrossarlo; ma quando fu lì per rifilare il primo colpo, rimase col braccio sospeso in aria, perché sentì una vocina sottile sottile, che disse raccomandandosi:
— Non mi picchiar tanto forte!

Figuratevi come rimase quel buon vecchio di maestro Ciliegia!
Girò gli occhi smarriti intorno alla stanza per vedere da dove mai poteva essere uscita quella vocina, e non vide nessuno! Guardò sotto il banco, e nessuno; guardò dentro un armadio che stava sempre chiuso, e nessuno; guardò nel corbello dei trucioli e della segatura, e nessuno; aprì l'uscio di bottega per dare un'occhiata anche sulla strada, e nessuno. O dunque?...`,

      `— Ho capito; — disse allora ridendo e grattandosi la parrucca — si vede che quella vocina me la son figurata io. Rimettiamoci a lavorare.

E ripresa la scure in mano, tirò un solennissimo colpo sul pezzo di legno.

— Ohi! tu m'hai fatto male! — gridò rammaricandosi la solita vocina.

Questa volta maestro Ciliegia restò di stucco, coi sgranati per la paura, la bocca spalancata e la lingua ciondoloni fino al mento, come un mascherone di fontana.

Appena riebbe l'uso della parola, cominciò a dire tremando e balbettando dallo spavento:
— Ma da dove sarà uscita questa vocina che ha detto ohi?... Eppure qui non c'è anima viva. Che sia per caso questo pezzo di legno che abbia imparato a piangere e a lamentarsi come un bambino? Io non lo posso credere. Questo legno eccolo qui; è un pezzo di legno da caminetto, come tutti gli altri...`,

      `Capitolo II. Maestro Ciliegia regala il pezzo di legno al suo amico Geppetto, il quale lo prende per fabbricarsi un burattino maraviglioso, che sappia ballare, tirare di scherma e fare i salti mortali.

In quel punto fu bussato alla porta.
— Passate pure, — disse il falegname, senza aver la forza di rizzarsi in piedi.

Allora entrò in bottega un vecchietto tutto arzillo, il quale aveva nome Geppetto; ma i ragazzi del vicinato, quando lo volevano far montare su tutte le furie, lo chiamavano col soprannome di Polendina, a motivo della sua parrucca gialla che somigliava alla polenta di granoturco.

Geppetto era bizzoso assai. Guai a chiamarlo Polendina! Diventava subito una bestia e non c'era più verso di tenerlo.

— Buon giorno, maestro Antonio, — disse Geppetto. — Che cosa fate costì per terra?
— Insegno l'abbaco alle formiche.
— Chi vi ha portato da me, compar Geppetto?
— Le gambe. Sappiate, maestro Antonio, che son venuto da voi per chiedervi un favore.
— Eccomi qui, pronto a servirvi, — rispose il falegname.
— Stamani mi è venuta un'idea: ho pensato di fabbricarmi da me un bel burattino di legno; ma un burattino meraviglioso! Con questo burattino voglio girare il mondo, per buscarmi un tozzo di pane e un bicchier di vino: che ve ne pare?`
    ]
  },
  {
    book_id: 'sample-promessi-sposi',
    owner_id: 'demo-user',
    title: 'I Promessi Sposi',
    author: 'Alessandro Manzoni',
    file_type: 'pdf',
    size: 480000,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    source: 'sample',
    coverColor: '#FFFFFF',
    currentPage: 0,
    bookmarks: [
      {
        id: 'bm-sample-2',
        book_id: 'sample-promessi-sposi',
        pageIndex: 0,
        snippet: 'Quel ramo del lago di Como, che volge a mezzogiorno, tra due catene non interrotte di monti...',
        note: 'Celebre incipit di Manzoni',
        createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      },
    ],
    pages: [
      `Capitolo I

Quel ramo del lago di Como, che volge a mezzogiorno, tra due catene non interrotte di monti, tutto a seni e a golfi, a seconda dello sporgere e del rientrare di quelli, vien, quasi a un tratto, a ristringersi, e a prender corso e figura di fiume, tra un promontorio a destra, e un'ampia costiera dall'altra parte; e il ponte, che ivi congiunge le due rive, par che renda ancor più sensibile all'occhio questa trasformazione, e segni il punto in cui il lago cessa, e l'Adda rincomincia, per ripigliar poi nome di lago dove le rive, allontanandosi di nuovo, lascian l'acqua distendersi e rallentarsi in nuovi golfi e in nuovi seni.

La costiera, formata dal deposito di tre grossi torrenti, cala appoggiata a' due monti contigui, l'uno detto di san Martino, l'altro, con voce lombarda, il Resegone, dai molti suoi cocuzzoli in fila, che in vero lo fanno somigliare a una sega.`,

      `Per una di queste stradette, tornava bel bello dalla passeggiata verso casa, sulla sera del giorno 7 novembre dell'anno 1628, don Abbondio, curato d'una delle terre accennate di sopra: il nome di questa, né il casato del personaggio, non si trovan nel manoscritto, né a questo luogo né altrove.

Diceva tranquillamente il suo ufizio, e talvolta, tra un salmo e l'altro, chiudeva il breviario, tenendovi dentro, per segno, l'indice della mano destra, e, messa poi questa nell'altra dietro la schiena, proseguiva il suo cammino, guardando a terra, e buttando con un piede verso il muro i ciottoli che facevano inciampo nel sentiero: poi alzava il viso, e girati oziosamente gli occhi all'intorno, li fissava alla parte d'un monte, dove la luce del sole già scomparso, scappando per i fessi del monte opposto, si dipingeva qua e là sui massi sporgenti, come a larghe e ineguali pezze di porpora.`,

      `Aperto di nuovo il breviario, e recitato un altro squarcio, giunse a una voltata della stradetta, dov'era solito d'alzar sempre gli occhi dal libro, e di guardarsi innanzi: e così fece anche quel giorno. Dopo la voltata, la strada correva diritta, forse un sessanta passi, e poi si divideva in due viottole, a foggia d'un ipsilon: quella a destra saliva verso il monte, e menava alla cura: l'altra scendeva nella valle fino a un torrente; e da questa parte il muro non arrivava che all'anche d'un passeggiatore.

I muri interni delle due viottole, in vece di riunirsi ad angolo, terminavano in un tabernacolo, sul quale eran dipinte certe figure lunghe, serpeggianti, che finivano in punta, e che, nell'intenzione dell'artista, e agli occhi degli abitanti del vicinato, volevan dire fiamme; e, alternate con le fiamme, cert'altre figure da non potersi descrivere, che volevan dire anime del purgatorio: anime e fiamme a color di mattone, su un fondo bigiognolo, con qualche intonaco scrostato qua e là.

Il curato, voltata la stradetta, e dirizzando, com'era solito, lo sguardo al tabernacolo, vide una cosa che non s'aspettava, e che non avrebbe voluto vedere. Due uomini stavano, l'uno a cavalcioni sul muricciolo basso, con una gamba spenzolata al di fuori, e l'altro appoggiato al muro della via opposta. Avevano entrambi il ciuffo e le armi: erano due bravi.`
    ]
  },
  {
    book_id: 'sample-favole',
    author: 'Gianni Rodari',
    title: 'Favole al Telefono',
    owner_id: 'demo-user',
    file_type: 'txt',
    size: 154000,
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    source: 'sample',
    coverColor: '#FFFFFF',
    currentPage: 0,
    pages: [
      `La passeggiata di un distratto

— Mamma, vado a fare una passeggiata.
— Va' pure, Giovanni, ma sta' attento quando attraversi la strada.
— Va bene, mamma. Ciao mamma.
— Sei sempre tanto distratto!
— Sì, mamma. Ciao mamma.

Giovannino esce allegramente e per il primo tratto di strada fa bene attenzione. Ogni tanto si ferma e si tocca:
— Ci sono tutto? Sì — e ride da solo.

Era così contento di stare attento che si mise a saltellare come un passero, ma poi si incantò a guardare le vetrine, le automobili, le nuvole, e per forza cominciarono i guai.

Un signore molto garbatamente lo rimprovera:
— Ma che distratto sei, ragazzo! Guarda che hai già perso una mano!
— Uh, è proprio vero! Ma come sono sbadato!

Si mette a cercare la mano, e invece trova un barattolo vuoto. Sarà proprio vuoto? Vediamo. E cosa c'era dentro prima che fosse vuoto? Giovanni non finisce mai di farsi domande.`,

      `A un certo punto Giovanni perde anche un braccio, poi una scarpa, poi un orecchio.
Ma cammina sempre, fischiettando e guardando gli uccelli posarsi sui tetti della città.

Intanto la gente raccoglie i pezzi che Giovanni perde per strada e li porta a casa della sua mamma:
— Signora, ecco qui la mano del suo bambino!
— Oh, grazie tante, signora! È tanto sbadato, poverino!

Arriva un vecchietto:
— Signora, ho trovato un orecchio sul marciapiede, credo sia del suo Giovanni.
— Sì, grazie signore, è proprio il suo orecchio sinistro.

Verso sera, Giovanni ritorna a casa zoppicando su una gamba sola, senza orecchie e senza naso.
La mamma lo bacia affettuosamente, gli riattacca i pezzi al loro posto e dice:
— Sei proprio un tesoro di ragazzo, Giovanni mio!`
    ]
  }
];
