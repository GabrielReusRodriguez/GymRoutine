import type { LibraryTranslation } from '../types';

/**
 * Contenido en catalán de la biblioteca de fuerza, indexado por el id estable
 * del dataset castellano. Los metadatos (patrón, material, músculos, figura)
 * no se duplican: se fusionan al localizar el ejercicio.
 */
export const STRENGTH_LIBRARY_CA: Record<string, LibraryTranslation> = {
  'barbell-bench-press': {
    name: 'Press de banca amb barra',
    aliases: ['press de banca', 'premsa de banca', 'banca plana'],
    description:
      "Estira't al banc amb els peus ferms a terra i les escàpules retretes. Agafa la barra una mica més ample que les espatlles, baixa-la controlada fins a fregar l'estèrnum i empeny fins a estendre els colzes sense bloquejar-los de cop.",
    tips: ['Canells alineats sobre els colzes', 'No rebotis la barra al pit', 'Mantén els glutis al banc'],
  },
  'incline-barbell-bench-press': {
    name: 'Press de banca inclinat amb barra',
    aliases: ['press inclinat', 'banca inclinada'],
    description:
      "Posa el banc a 30-45°. Baixa la barra fins a la part alta del pit mantenint els colzes lleugerament tancats i empeny en línia amb l'espatlla, sense arquejar excessivament l'esquena.",
    tips: ['Evita inclinacions més grans de 45°', 'Controla la baixada 2-3 segons'],
  },
  'dumbbell-bench-press': {
    name: 'Press de banca amb mancuernes',
    aliases: ['press mancuernes', 'press pla amb mancuernes'],
    description:
      'Amb una mancuerna a cada mà i els palmells cap endavant, baixa fins que els colzes quedin al nivell del tronc i empeny ajuntant lleugerament les mans a dalt sense fer-les xocar.',
    tips: ['Més recorregut que amb barra', 'No deixis caure els colzes per sota del banc'],
  },
  'incline-dumbbell-press': {
    name: 'Press inclinat amb mancuernes',
    aliases: ['press inclinat amb mancuernes'],
    description:
      "Banc a 30-45°, mancuernes a l'altura del pit alt. Empeny cap amunt i lleugerament cap endins, mantenint les escàpules retretes durant tot el recorregut.",
    tips: ['Puja i baixa en el mateix arc', 'Colzes a uns 45° del tronc'],
  },
  'machine-chest-press': {
    name: 'Press de pit a màquina',
    aliases: ['press pit màquina', 'chest press'],
    description:
      "Ajusta el seient perquè les nanses quedin a l'altura del pit. Empeny fins a gairebé estendre els colzes i torna controlant el retorn sense perdre la tensió.",
    tips: ['No encorvis les espatlles en empènyer', 'Ajusta el recorregut a la teva mobilitat'],
  },
  'dumbbell-fly': {
    name: 'Obertures amb mancuernes',
    aliases: ['obertures', 'flyes', 'pec deck amb mancuernes'],
    description:
      "Estirat, amb els colzes semiflexionats i fixes, obre els braços en arc fins a sentir l'estirament del pit i tanca'ls com si abracessis un tronc.",
    tips: ['Colzes lleugerament flexionats i quiets', 'No baixis més enllà del que controles'],
  },
  'cable-crossover': {
    name: 'Creuaments a la politja',
    aliases: ['crossover', 'creuaments politja', 'cable fly'],
    description:
      "Amb una politja alta a cada costat, porta les mans en arc endavant i avall fins a creuar-les lleugerament davant del tronc, i torna resistint l'obertura.",
    tips: ['Un pas endavant per estabilitat', 'Colzes fixos, el moviment és d\'espatlla'],
  },
  'push-up': {
    name: 'Flexions',
    aliases: ['push up', 'flexió'],
    description:
      "En planxa alta amb les mans una mica més amples que les espatlles, baixa el pit gairebé fins a terra mantenint el cos en línia i empeny fins a estendre els colzes.",
    tips: ['Estreny glutis i abdomen', 'Colzes a 45°, no en creu'],
  },
  'chest-dip': {
    name: 'Fons en paral·leles',
    aliases: ['dips', 'fons', 'paral·leles'],
    description:
      "Subjecta't a les paral·leles, inclina el tronc endavant i baixa fins que els colzes formin uns 90°; empeny fins a estendre els braços sense encongir les espatlles.",
    tips: ['Si molesten les espatlles, limita la profunditat', 'Pit alt, espatlles avall'],
  },
  'close-grip-bench-press': {
    name: 'Press de banca amb agafada tancada',
    aliases: ['press tancat', 'close grip bench'],
    description:
      "Amb una agafada a l'amplada de les espatlles, baixa la barra a l'estèrnum mantenint els colzes a prop del tronc i empeny estenent els colzes amb força.",
    tips: ["No tanquis tant l'agafada com per forçar els canells"],
  },

  'barbell-overhead-press': {
    name: 'Press militar amb barra',
    aliases: ['press militar', 'overhead press', 'press espatlla barra'],
    description:
      "Dempeus, amb la barra a l'altura de les clavícules i l'abdomen estret, empeny per sobre del cap apartant lleugerament el cap i baixa controlant fins al pit.",
    tips: ['No arquevis la lumbar', 'Barra en línia amb el centre del peu'],
  },
  'seated-dumbbell-press': {
    name: "Press d'espatlla assegut amb mancuernes",
    aliases: ['press espatlla mancuernes', 'press assegut'],
    description:
      "Assegut amb respatller, mancuernes a l'altura de les orelles i palmells endavant. Empeny fins a gairebé ajuntar les mans a dalt i baixa fins que els colzes quedin a 90°.",
    tips: ["Esquena recolzada al respatller", 'No facis xocar les mancuernes a dalt'],
  },
  'arnold-press': {
    name: 'Press Arnold',
    aliases: ['arnold press'],
    description:
      "Comença amb les mancuernes davant del pit i els palmells cap a tu; en empènyer gira les mans cap enfora fins a acabar amb els palmells endavant a dalt, i desfés la rotació en baixar.",
    tips: ["Rotació fluida, sense carregar el manegot rotador"],
  },
  'lateral-raise': {
    name: 'Elevacions laterals',
    aliases: ['laterals', 'lateral raise', 'elevació lateral'],
    description:
      "Dempeus amb mancuernes als costats i colzes lleugerament flexionats, eleva els braços fins a l'altura de les espatlles i baixa controlant sense balancejar el tronc.",
    tips: ['Colzes lleugerament per sobre de les mans', 'Pes lleuger, sense impuls'],
  },
  'cable-lateral-raise': {
    name: 'Elevacions laterals a la politja',
    aliases: ['lateral politja', 'cable lateral raise'],
    description:
      "Amb la politja baixa i el cable creuat per davant, eleva el braç lateralment fins a l'altura de l'espatlla mantenint tensió constant al deltoides.",
    tips: ['No giris el tronc', 'Controla la tornada'],
  },
  'rear-delt-fly': {
    name: 'Ocells / deltoides posterior',
    aliases: ['ocells', 'rear delt fly', 'deltoides posterior'],
    description:
      "Inclinat amb el tronc gairebé paral·lel a terra i colzes semiflexionats, obre els braços cap als costats fins a l'altura de les espatlles i baixa sense deixar caure el pit.",
    tips: ['Pes lleuger, evita encongir el coll', 'Estreny les escàpules al final'],
  },
  'face-pull': {
    name: 'Face pull',
    aliases: ['facepull', 'tir a la cara'],
    description:
      "Amb la politja a l'altura de la cara i una corda, tira cap al front separant les mans i girant les espatlles cap enfora; torna controlant.",
    tips: ["Colzes a l'altura de les espatlles", 'Pensa a obrir, no a estirar fort'],
  },
  'upright-row': {
    name: 'Rem al mentó',
    aliases: ['upright row', 'rem vertical'],
    description:
      "Dempeus amb la barra davant de les cuixes, estira-la cap al mentó guiant amb els colzes i sense pujar les espatlles més enllà del que sigui còmode; baixa controlant.",
    tips: ["Agafada a l'amplada de les espatlles", "Atura't si molesta l'espatlla"],
  },

  'triceps-pushdown': {
    name: 'Extensió de tríceps a la politja',
    aliases: ['pushdown', 'tríceps politja', 'tir tríceps'],
    description:
      "Amb la politja alta i els colzes enganxats al tronc, estén els braços cap avall fins a bloquejar-los suaument i torna sense moure els colzes.",
    tips: ['Colzes fixos, només es mou l\'avantbraç', "No t'inclinis per empènyer"],
  },
  'overhead-triceps-extension': {
    name: 'Extensió de tríceps sobre el cap',
    aliases: ['tríceps sobre cap', 'overhead extension', 'francès'],
    description:
      "D'esquena a la politja, amb els colzes alts i apuntant endavant, estén els braços per sobre del cap i torna fins a sentir l'estirament del tríceps.",
    tips: ['Colzes a prop del cap', 'Recorregut complet i controlat'],
  },
  'skull-crusher': {
    name: 'Extensió de tríceps estirat (skull crusher)',
    aliases: ['skull crusher', 'trencacranis', 'press francès', 'tríceps estirat'],
    description:
      "Estirat amb la barra sobre el pit i els braços verticals, flexiona només els colzes per baixar la barra cap al front i estén de nou sense moure les espatlles.",
    tips: ['Colzes apuntant al sostre', 'Baixa fins on controlis'],
  },
  'bench-dip': {
    name: 'Fons al banc',
    aliases: ['bench dip', 'fons tríceps'],
    description:
      "Amb les mans a la vora del banc i els peus endavant, baixa el cos flexionant els colzes fins a uns 90° i empeny fins a estendre els braços.",
    tips: ['Colzes cap enrere, no cap enfora', 'No deixis caure les espatlles'],
  },

  'pull-up': {
    name: 'Dominades',
    aliases: ['pull up', 'dominades pronades'],
    description:
      "Penjat amb agafada pronada una mica més ample que les espatlles, estira els colzes cap a les costelles fins a passar la barbeta per la barra i baixa controlant fins a estendre els braços.",
    tips: ['Comença baixant les escàpules', 'Sense balanceig'],
  },
  'chin-up': {
    name: 'Dominades supinades',
    aliases: ['chin up', 'dominades supinades'],
    description:
      "Amb agafada supinada a l'amplada de les espatlles, puja fins que la barbeta passi la barra mantenint el pit alt i baixa fins a l'extensió completa.",
    tips: ['Agafada ferma, evita penjar-te dels dits'],
  },
  'lat-pulldown': {
    name: 'Tir al pit',
    aliases: ['tir vertical', 'lat pulldown', 'politja al pit'],
    description:
      "Assegut amb les cuixes fixades, estira la barra cap a la part alta del pit portant els colzes avall i enrere; torna controlant sense perdre la postura.",
    tips: ["No llancis el tronc gaire enrere", 'Barra a la clavícula, no al clatell'],
  },
  'straight-arm-pulldown': {
    name: 'Tir amb braços rectes',
    aliases: ['straight arm pulldown', 'pullover politja'],
    description:
      "Amb la politja alta i els braços gairebé estesos, porta la barra en arc fins a les cuixes sentint el dorsal i torna sense flexionar els colzes.",
    tips: ['Colzes gairebé rectes', 'Pit alt durant tot el recorregut'],
  },

  'barbell-row': {
    name: 'Rem amb barra',
    aliases: ['rem barra', 'barbell row', 'rem inclinat'],
    description:
      "Amb el tronc inclinat uns 45° i l'esquena neutra, estira la barra cap a l'abdomen baix guiant amb els colzes i baixa controlant sense arrodonir l'esquena.",
    tips: ['Coll en línia amb la columna', 'Sense estirades de maluc'],
  },
  'dumbbell-row': {
    name: 'Rem amb mancuerna a una mà',
    aliases: ['rem mancuerna', 'dumbbell row', 'rem unilateral'],
    description:
      "Recolza una mà i un genoll al banc, amb l'esquena plana; estira la mancuerna cap al maluc portant el colze enrere i baixa fins a estirar el braç.",
    tips: ['No giris el tronc per pujar més', 'Escàpula enrere al final'],
  },
  'seated-cable-row': {
    name: 'Rem a la politja baixa',
    aliases: ['rem politja', 'seated row', 'rem assegut'],
    description:
      "Assegut amb les cames semiflexionades i el tronc estable, estira el mànec cap a l'abdomen ajuntant les escàpules i torna deixant que els braços s'estenguin.",
    tips: ['Tronc quiet, sense balanceig', 'Colzes a prop del cos'],
  },
  't-bar-row': {
    name: 'Rem en T',
    aliases: ['t bar row', 'rem t'],
    description:
      "Amb el tronc inclinat i la barra entre les cames, estira cap al pit mantenint l'esquena neutra i baixa controlant fins a estirar els braços.",
    tips: ['Agafada neutra si és possible', 'No facis servir impuls de cames'],
  },
  'inverted-row': {
    name: 'Rem invertit',
    aliases: ['inverted row', 'rem en barra baixa'],
    description:
      "Penjat sota una barra a l'altura del maluc amb el cos recte, estira el pit cap a la barra i baixa controlant sense deixar caure el maluc.",
    tips: ['Cos en línia, glutis estrets', "Ajusta la dificultat amb l'angle"],
  },

  'barbell-curl': {
    name: 'Curl de bíceps amb barra',
    aliases: ['curl barra', 'barbell curl', 'curl bíceps'],
    description:
      "Dempeus amb la barra en pronació i els colzes enganxats al tronc, flexiona els colzes fins a l'altura del pit i baixa controlant sense balancejar el cos.",
    tips: ['Colzes quiets', 'Sense impuls lumbar'],
  },
  'dumbbell-curl': {
    name: 'Curl de bíceps amb mancuernes',
    aliases: ['curl mancuernes', 'dumbbell curl'],
    description:
      "Amb una mancuerna a cada mà i els palmells endavant, flexiona els colzes alternant o alhora, mantenint les espatlles quietes i baixant a poc a poc.",
    tips: ['Supina el canell en pujar', 'Controla la baixada 2 segons'],
  },
  'hammer-curl': {
    name: 'Curl martell',
    aliases: ['hammer curl', 'curl neutre'],
    description:
      "Amb els palmells encarats (agafada neutra), flexiona els colzes mantenint aquesta orientació durant tot el recorregut i baixa controlant.",
    tips: ['Treballa braquial i avantbraç', 'No balancegis el tronc'],
  },
  'preacher-curl': {
    name: 'Curl al banc Scott',
    aliases: ['curl scott', 'preacher curl', 'curl predicador'],
    description:
      "Amb els braços recolzats al banc inclinat, flexiona els colzes fins a dalt i baixa fins a gairebé estendre el braç mantenint l'espatlla fixa.",
    tips: ['No estenguis el colze del tot sota càrrega', 'Coll relaxat'],
  },
  'cable-curl': {
    name: 'Curl de bíceps a la politja',
    aliases: ['curl politja', 'cable curl'],
    description:
      "Amb la politja baixa i els colzes al costat del tronc, flexiona fins a l'altura del pit mantenint tensió constant i torna controlant.",
    tips: ['Tensió contínua durant tot el recorregut'],
  },

  'barbell-shrug': {
    name: 'Encol·liments amb barra',
    aliases: ['shrug', 'encol·liments', 'trapezi barra'],
    description:
      "Dempeus amb la barra davant de les cuixes, puja les espatlles cap a les orelles sense doblegar els colzes i baixa controlant fins a la posició inicial.",
    tips: ['No giris les espatlles', 'Pausa a dalt un segon'],
  },
  'farmer-carry': {
    name: 'Passeig del pagès',
    aliases: ['farmer carry', 'farmer walk', 'passeig pagès'],
    description:
      "Camina amb una mancuerna pesada a cada mà, el tronc erigit i les espatlles enrere, fent passos curts i controlats durant la distància o el temps objectiu.",
    tips: ["No t'inclinis cap als costats", 'Respira de manera constant'],
  },
  'suitcase-carry': {
    name: 'Passeig amb una mancuerna (maleta)',
    aliases: ['suitcase carry', 'passeig maleta', 'carry unilateral'],
    description:
      "Camina amb una sola mancuerna pesada en una mà, resistint la inclinació lateral del tronc i mantenint les espatlles anivellades.",
    tips: ['Core ferm, sense decantar el maluc', 'Canvia de costat a la sèrie següent'],
  },

  'back-squat': {
    name: 'Esquat posterior',
    aliases: ['esquat', 'back squat', 'esquat barra'],
    description:
      "Amb la barra sobre els trapezis, peus a l'amplada de les espatlles i puntes lleugerament enfora, baixa flexionant maluc i genolls fins que les cuixes quedin paral·leles o una mica més avall, i puja empenyent el terra.",
    tips: ['Genolls en línia amb els peus', 'Esquena neutra', 'Talons enganxats a terra'],
  },
  'front-squat': {
    name: 'Esquat frontal',
    aliases: ['front squat', 'esquat frontal'],
    description:
      "Amb la barra recolzada als deltoides anteriors i els colzes alts, baixa mantenint el tronc erigit i puja empenyent amb les cames sense perdre la posició dels colzes.",
    tips: ['Colzes amunt durant tot el moviment', 'Tronc el més vertical possible'],
  },
  'goblet-squat': {
    name: 'Esquat goblet',
    aliases: ['goblet squat', 'esquat amb mancuerna'],
    description:
      "Subjecta una mancuerna o kettlebell contra el pit, baixa entre les cames amb el tronc erigit i puja empenyent el terra amb els talons.",
    tips: ['Ideal per aprendre el patró', 'Genolls cap enfora'],
  },
  'leg-press': {
    name: 'Premsa de cames',
    aliases: ['premsa', 'leg press'],
    description:
      "Assegut a la premsa amb els peus a l'amplada de les espatlles, baixa la plataforma flexionant els genolls fins a uns 90° i empeny sense bloquejar els genolls de cop.",
    tips: ['No desenganxis la lumbar del respatller', 'No bloquegis els genolls'],
  },
  'hack-squat': {
    name: 'Hack squat',
    aliases: ['hack squat', 'esquat hack'],
    description:
      "Amb l'esquena recolzada a la màquina i els peus a la plataforma, baixa fins que les cuixes passin la paral·lela i puja empenyent amb els talons.",
    tips: ['Genolls alineats amb els peus', 'Controla la baixada'],
  },
  'bulgarian-split-squat': {
    name: 'Esquat búlgar',
    aliases: ['búlgar', 'bulgarian split squat', 'esquat búlgar'],
    description:
      "Amb el peu del darrere recolzat en un banc i el de davant ferm, baixa flexionant el genoll davanter fins que la cuixa quedi paral·lela i puja sense perdre l'equilibri.",
    tips: ['Pes a la cama del davant', 'Tronc lleugerament inclinat'],
  },
  'walking-lunge': {
    name: 'Gambades caminant',
    aliases: ['gambades', 'lunges', 'walking lunge'],
    description:
      "Fes un pas llarg endavant i baixa fins que tots dos genolls formin uns 90°, empeny amb la cama del davant per avançar i repeteix amb l'altra.",
    tips: ['Genoll davanter sobre el peu', 'Tronc erigit'],
  },
  'step-up': {
    name: 'Pujades al caixó',
    aliases: ['step up', 'pujades caixó', 'box step up'],
    description:
      "Amb una mancuerna a cada mà, puja a un caixó estable recolzant el peu sencer i empeny amb aquella cama fins a estendre el maluc; baixa controlant.",
    tips: ['No facis impuls amb la cama de baix', 'Caixó a l\'altura del genoll'],
  },
  'leg-extension': {
    name: 'Extensió de quàdriceps',
    aliases: ['extensió quàdriceps', 'leg extension', 'quàdriceps màquina'],
    description:
      "Assegut a la màquina amb el respatller ajustat, estén els genolls fins a gairebé bloquejar-los i baixa controlant sense deixar anar el coixí.",
    tips: ['Pausa a dalt, baixada lenta', 'No facis servir impuls'],
  },
  'leg-curl': {
    name: 'Curl femoral',
    aliases: ['curl femoral', 'leg curl', 'isquiotibials màquina'],
    description:
      "Estirat o assegut a la màquina, flexiona els genolls portant el taló cap al gluti i torna controlant sense desenganxar el maluc del suport.",
    tips: ['Maluc fix', 'No rebotis al final'],
  },
  'standing-calf-raise': {
    name: 'Elevació de bessons dempeus',
    aliases: ['bessons', 'calf raise', 'elevació talons'],
    description:
      "Dempeus amb la punta dels peus a la plataforma i els talons lliures, puja el màxim possible sobre les puntes i baixa fins a sentir l'estirament.",
    tips: ['Recorregut complet', 'Pausa a dalt i a baix'],
  },

  'conventional-deadlift': {
    name: 'Pes mort convencional',
    aliases: ['pes mort', 'deadlift', 'pm'],
    description:
      "Amb la barra sobre la meitat del peu, agafa-la i empeny el terra mentre estens maluc i genolls alhora, mantenint la barra enganxada a les cames i l'esquena neutra.",
    tips: ['Barra enganxada al cos', "No arrodoneixis l'esquena", 'Maluc i espatlles pugen junts'],
  },
  'romanian-deadlift': {
    name: 'Pes mort romanès',
    aliases: ['romanès', 'rdl', 'romanian deadlift', 'pm romanès'],
    description:
      "Dempeus amb la barra a les cuixes i els genolls lleugerament flexionats, porta el maluc enrere baixant la barra per les cames fins a sentir l'estirament dels isquiotibials i torna estenent el maluc.",
    tips: ['Moviment de maluc, no de genolls', 'Esquena neutra', 'Barra a prop de les cames'],
  },
  'sumo-deadlift': {
    name: 'Pes mort sumo',
    aliases: ['sumo deadlift', 'pes mort sumo'],
    description:
      "Amb els peus molt oberts i les puntes enfora, agafa la barra dins de les cames i empeny el terra obrint els genolls fins a estendre el maluc.",
    tips: ['Genolls cap enfora', 'Tronc més vertical que al convencional'],
  },
  'hip-thrust': {
    name: 'Hip thrust',
    aliases: ['hip thrust', 'impuls de maluc', 'pont amb barra'],
    description:
      "Amb l'esquena alta recolzada en un banc i la barra sobre el maluc, puja la pelvis fins a formar una línia amb el tronc i estreny els glutis abans de baixar.",
    tips: ['Mentó al pit', 'No hiperestenguis la lumbar', 'Pausa a dalt'],
  },
  'glute-bridge': {
    name: 'Pont de gluti',
    aliases: ['glute bridge', 'pont gluti'],
    description:
      "Estirat amb els genolls flexionats i els peus a terra, eleva el maluc estrenyent els glutis fins a alinear genolls, maluc i espatlles, i baixa controlant.",
    tips: ['Empeny amb els talons', "No arquevis l'esquena"],
  },
  'good-morning': {
    name: 'Bon dia',
    aliases: ['good morning', 'bon dia'],
    description:
      "Amb la barra als trapezis i els genolls lleugerament flexionats, inclina el tronc endavant portant el maluc enrere i torna estenent el maluc sense arrodonir l'esquena.",
    tips: ['Comença amb càrregues molt lleugeres', 'El moviment és de maluc, no de columna'],
  },
  'kettlebell-swing': {
    name: 'Swing amb kettlebell',
    aliases: ['swing', 'kettlebell swing', 'balanceig kettlebell'],
    description:
      "Amb la kettlebell entre les cames, porta el maluc enrere i projecta el pes endavant amb un impuls explosiu dels glutis; el pes puja per inèrcia, no pels braços.",
    tips: ['Braços relaxats, com cordes', 'Estreny els glutis al cim'],
  },
  'back-extension': {
    name: 'Extensió lumbar',
    aliases: ['hyperextension', 'extensió lumbar', 'back extension'],
    description:
      "Amb el maluc recolzat al banc, baixa el tronc controlant i puja fins a alinear el cos sense hiperestendre la zona lumbar.",
    tips: ['Atura\'t en la línia recta', 'Moviment lent'],
  },

  plank: {
    name: 'Planxa',
    aliases: ['plank', 'planxa abdominal'],
    description:
      "Recolza els avantbraços i les puntes dels peus amb el cos en línia recta, estreny abdomen i glutis i mantén la posició sense enfonsar el maluc.",
    tips: ['Coll neutre', 'No aguantis la respiració'],
  },
  'side-plank': {
    name: 'Planxa lateral',
    aliases: ['side plank', 'planxa lateral'],
    description:
      "Recolzat sobre un avantbraç i el costat del peu, eleva el maluc fins a alinear el cos i mantén sense girar el tronc; canvia de costat.",
    tips: ['Maluc alt', 'Espatlla sobre el colze'],
  },
  'hanging-leg-raise': {
    name: 'Elevació de cames penjat',
    aliases: ['leg raise', 'elevació cames', 'hanging leg raise'],
    description:
      "Penjat d'una barra, eleva les cames rectes o amb genolls flexionats fins a l'altura del maluc i baixa controlant sense balancejar-te.",
    tips: ['Evita el balanceig', 'Puja amb l\'abdomen, no amb impuls'],
  },
  'cable-crunch': {
    name: 'Crunch a la politja',
    aliases: ['cable crunch', 'crunch politja'],
    description:
      "Agenollat davant de la politja alta amb la corda al costat del cap, flexiona el tronc portant els colzes cap als genolls i torna controlant.",
    tips: ['Maluc fix', 'Arrodoneix la columna en flexionar'],
  },
  'ab-wheel': {
    name: 'Roda abdominal',
    aliases: ['ab wheel', 'roda abdominal'],
    description:
      "Agenollat amb la roda al davant, estén-la endavant mantenint l'abdomen ferm i l'esquena neutra, i torna estirant amb el core.",
    tips: ['No deixis caure la lumbar', 'Avança només fins on controlis'],
  },
  'pallof-press': {
    name: 'Pallof press',
    aliases: ['pallof', 'anti rotació politja'],
    description:
      "De perfil a la politja amb el mànec al pit, estén els braços endavant resistint la rotació del tronc i torna sense girar el maluc.",
    tips: ['Resisteix, no estiris', 'Maluc i espatlles alineats'],
  },
  'cable-woodchop': {
    name: 'Llenyataire a la politja',
    aliases: ['woodchop', 'llenyataire', 'rotació politja'],
    description:
      "Amb la politja alta a un costat, estira en diagonal cap al maluc contrari girant el tronc amb control i torna resistint la rotació inversa.",
    tips: ['La rotació neix del core, no dels braços', 'Genolls lleugerament flexionats'],
  },
};
