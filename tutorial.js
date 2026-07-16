// First-run interactive tutorial + "how it works" + plain-language backing descriptions.
// Self-contained: app.js only dispatches jl:note / jl:bend / jl:backing events and passes
// an enterMode(id) hook (mode entry without auto-backing — the tutorial turns the band on itself).
import { I18N, t } from './i18n.js';
import { track } from './analytics.js';

/* ============ Strings (merged into I18N; t() falls back to en) ============ */
const X = {
  en: {
    'tut.offer.t':'First time here?','tut.offer.d':"One minute — and you're playing. Where shall we start?",
    'tut.offer.skip':"I'll figure it out myself",
    'tut.s1':'Press and hold the glowing key','tut.s2':"Tap it again and again — you're climbing the scale",
    'tut.s3':'Now walk back down','tut.s4':'Same step — just three at once',
    'tut.sstrip':"Slide your finger along the ladder — it's the map of the scale",
    'tut.s5':"Hold the key and drag up or down — that's a bend",'tut.s6':'Now bring in the backing',
    'tut.done':"🎓 Tutorial complete — keep playing. You can't hit a wrong note here.",
    'tut.skip':'Skip','tut.replay':'🎓 Tutorial',
    'howit.open':'How does it work?','howit.title':'How it works',
    'howit.p1':'A piano splits the octave into 12 equal notes. To improvise you must know which of them fit together — otherwise it sounds off.',
    'howit.p2':'Every style actually uses a small subset of those notes — a scale. Blues picks 6 of them, koto 5, East 7.',
    'howit.p3':'JamBrew keeps only the notes of the style you chose. Whatever you press belongs.',
    'howit.p4':"And the keys aren't notes — they're steps along the scale: 0 repeats the current note, +1 moves one step up, −3 three steps down. Every key does the same thing, just a different distance. That's why one key can sound different each time: you always step from where you are.",
    'howit.g':'Cheat sheet',
    'howit.g1':'Drone — one endless note humming in the background, like a bagpipe.',
    'howit.g2':'Arpeggio — the backing plays the notes of your scale in a loop.',
    'howit.g3':"Bend — sliding a note's pitch up or down, like a guitarist pulling a string.",
    'howit.g4':'Root — the home note of the scale; everything gravitates back to it.',
    'backdesc.drone':'One long note hums underneath — like a bagpipe.',
    'backdesc.shimmer':'A floating pad with sparkling echoes.',
    'backdesc.arp':"A looping pattern of your scale's notes.",
    'backdesc.both':'Drone and arpeggio together.',
    'backdesc.padperc':'Soft pad plus bass and percussion.',
    'backdesc.arpperc':'Looping arpeggio plus bass and percussion.',
    'backdesc.vamp':'Two chords rocking back and forth.',
    'backdesc.gong':'A slow gong cycle keeps the time.',
    'backdesc.pattern':'Interlocking metallophone patterns.',
    'backdesc.drive':'Pumping bass and four-on-the-floor drums.',
    'backdesc.tape':'Dusty chords and a lazy beat.',
    'backdesc.swing':'Walking bass, ride cymbal and piano.',
    'taste.label':'Tasting','pw.tasteT':'Enjoying {name}?',
    'role.stepN':'step {n}',
    'variant.freygish':'Hijaz','variant.hungarian':'Gypsy','variant.romanian':'Klezmer',
    'pick.jazz.d':'the scale follows the chords (golden sequence)',
    'kd.t':'🧪 The Kitchen','kd.d':'new instruments are created and tested here','kd.sub':'Everything here is alive: it changes, it sometimes breaks — and you see it first.','kd.back':'← Back',
    'pick.sampler.t':'Sampler','pick.sampler.m':'real instruments, one relational keyboard','pick.sampler.d':'play sampled MIDI instruments (piano, strings…) — loads online',
    'mode.sampler.name':'Sampler','mode.sampler.sub':'· sampled GM instruments · 🧪 kitchen','ctl.instr':'Instrument',
    'instr.piano':'Grand piano','instr.epiano':'E-piano','instr.strings':'Strings','instr.marimba':'Marimba','instr.vibes':'Vibraphone','instr.nylon':'Nylon guitar','instr.flute':'Flute',
    'instr.loading':'loading instrument…','instr.failed':'couldn’t load — check your connection',
    'pick.lab.d':'build your own scale from the 12 notes',
    'mode.jazz.sub':'· auto-scale on chords · 🧪 inner kitchen',
    'pw.li1':'Five more instruments: Blues, East, Dream, Gamelan, Synthwave',
    'pw.li2':'🧪 Keys to the kitchen: Jazz and the Lab scale builder — experiments you see first',
    'intro.hero':"You can't play a wrong note here.",
    'intro.p':'Keys are steps along a scale. Pick an instrument:',
    'pick.again':'tap again to enter',
    'pick.blues.m':'road, garage, whiskey','pick.vostok.m':'desert, snakes, trance',
    'pick.koto.m':'a rock garden in the rain','pick.dream.m':'weightlessness',
    'pick.gamelan.m':'the bronze orchestra of Bali','pick.light.m':'morning and sunshine',
    'pick.synth.m':'neon and a night highway','pick.lab.m':'your own sound laboratory',
    'pick.jazz.m':'smoky basement, upright bass',
  },
  ru: {
    'tut.offer.t':'Впервые здесь?','tut.offer.d':'Минута — и ты играешь. С чего начнём?',
    'tut.offer.skip':'Сам разберусь',
    'tut.s1':'Нажми светящуюся клавишу и подержи','tut.s2':'Жми её ещё и ещё — ты поднимаешься по гамме',
    'tut.s3':'А теперь спустись обратно','tut.s4':'Тот же шаг — просто три сразу',
    'tut.sstrip':'Проведи пальцем по лесенке — это карта гаммы',
    'tut.s5':'Зажми клавишу и потяни вверх или вниз — это бенд','tut.s6':'Теперь включай аккомпанемент',
    'tut.done':'🎓 Обучение пройдено — просто продолжай играть. Ошибиться здесь невозможно.',
    'tut.skip':'Пропустить','tut.replay':'🎓 Обучение',
    'howit.open':'Как это устроено?','howit.title':'Как это устроено',
    'howit.p1':'На пианино октава поделена на 12 равных нот. Чтобы импровизировать, нужно знать, какие из них сочетаются, — иначе выходит фальшь.',
    'howit.p2':'На деле каждый стиль использует небольшое подмножество этих нот — гамму. В блюзе их 6, в кото 5, в Востоке 7.',
    'howit.p3':'JamBrew оставляет только ноты выбранного стиля. Что ни нажмёшь — всё в кассу.',
    'howit.p4':'А клавиши — не ноты, а шаги по гамме: 0 повторяет текущую ноту, +1 — шаг вверх, −3 — три шага вниз. Все клавиши делают одно и то же, просто на разное расстояние. Поэтому одна и та же клавиша может звучать по-разному: ты каждый раз шагаешь оттуда, где стоишь.',
    'howit.g':'Шпаргалка',
    'howit.g1':'Дрон — одна бесконечная нота на фоне, как у волынки.',
    'howit.g2':'Арпеджио — аккомпанемент перебирает ноты твоей гаммы по кругу.',
    'howit.g3':'Бенд — плавная подтяжка ноты вверх или вниз, как гитарист тянет струну.',
    'howit.g4':'Тоника (root) — «домашняя» нота гаммы; всё тяготеет к ней.',
    'backdesc.drone':'Одна долгая нота гудит на фоне — как волынка.',
    'backdesc.shimmer':'Парящая подложка с мерцающими отголосками.',
    'backdesc.arp':'Ноты твоей гаммы перебираются по кругу.',
    'backdesc.both':'Дрон и арпеджио вместе.',
    'backdesc.padperc':'Мягкая подложка плюс бас и перкуссия.',
    'backdesc.arpperc':'Арпеджио по кругу плюс бас и перкуссия.',
    'backdesc.vamp':'Два аккорда качаются туда-сюда.',
    'backdesc.gong':'Медленный цикл гонга держит время.',
    'backdesc.pattern':'Переплетающиеся узоры металлофонов.',
    'backdesc.drive':'Качающий бас и бочка в каждую долю.',
    'backdesc.tape':'Пыльные аккорды и ленивый бит.',
    'backdesc.swing':'Шагающий бас, райд и рояль.',
    'taste.label':'Дегустация','pw.tasteT':'Понравился {name}?',
    'role.stepN':'ступень {n}',
    'variant.freygish':'Хиджаз','variant.hungarian':'Цыганская','variant.romanian':'Клезмер',
    'pick.jazz.d':'лад сам едет по аккордам (золотая секвенция)',
    'kd.t':'🧪 Кухня','kd.d':'здесь создаются и тестируются новые инструменты','kd.sub':'Здесь всё живое: меняется, иногда ломается — зато вы видите это первыми.','kd.back':'← Назад',
    'pick.sampler.t':'Сэмплер','pick.sampler.m':'настоящие инструменты, одна реляционная клавиатура','pick.sampler.d':'сэмплированные MIDI-инструменты (рояль, струнные…) — грузятся онлайн',
    'mode.sampler.name':'Сэмплер','mode.sampler.sub':'· сэмплы GM-инструментов · 🧪 кухня','ctl.instr':'Инструмент',
    'instr.piano':'Рояль','instr.epiano':'Электропиано','instr.strings':'Струнные','instr.marimba':'Маримба','instr.vibes':'Вибрафон','instr.nylon':'Нейлон-гитара','instr.flute':'Флейта',
    'instr.loading':'загрузка инструмента…','instr.failed':'не удалось загрузить — проверь сеть',
    'pick.lab.d':'собери собственный звукоряд из 12 нот',
    'mode.jazz.sub':'· авто-лад по аккордам · 🧪 внутренняя кухня',
    'pw.li1':'Ещё пять инструментов: блюз, восток, грёза, гамелан, синтвейв',
    'pw.li2':'🧪 Ключи от кухни: джаз и лаборатория звукорядов — эксперименты первыми',
    'intro.hero':'Здесь нельзя сыграть неправильную ноту.',
    'intro.p':'Клавиши — шаги по гамме. Выбери инструмент:',
    'pick.again':'ещё раз — войти',
    'pick.blues.m':'дорога, гараж, виски','pick.vostok.m':'пустыня, змеи, транс',
    'pick.koto.m':'сад камней под дождём','pick.dream.m':'невесомость',
    'pick.gamelan.m':'бронзовый оркестр Бали','pick.light.m':'утро и солнце',
    'pick.synth.m':'неон и ночная трасса','pick.lab.m':'твоя лаборатория звука',
    'pick.jazz.m':'дымный подвал, контрабас',
  },
  es: {
    'tut.offer.t':'¿Primera vez aquí?','tut.offer.d':'Un minuto y ya estás tocando. ¿Por dónde empezamos?',
    'tut.offer.skip':'Me las arreglo solo',
    'tut.s1':'Pulsa y mantén la tecla iluminada','tut.s2':'Púlsala una y otra vez — subes por la escala',
    'tut.s3':'Ahora baja de vuelta','tut.s4':'El mismo paso — solo que tres de golpe',
    'tut.sstrip':'Desliza el dedo por la escalera — es el mapa de la escala',
    'tut.s5':'Mantén la tecla y arrástrala arriba o abajo — eso es un bend','tut.s6':'Ahora activa la base',
    'tut.done':'🎓 Tutorial completado — sigue tocando. Aquí no existe la nota equivocada.',
    'tut.skip':'Saltar','tut.replay':'🎓 Tutorial',
    'howit.open':'¿Cómo funciona?','howit.title':'Cómo funciona',
    'howit.p1':'El piano divide la octava en 12 notas iguales. Para improvisar hay que saber cuáles combinan — si no, suena mal.',
    'howit.p2':'En realidad cada estilo usa un pequeño subconjunto de esas notas: una escala. El blues usa 6, el koto 5, Oriente 7.',
    'howit.p3':'JamBrew deja solo las notas del estilo elegido. Pulses lo que pulses, encaja.',
    'howit.p4':'Y las teclas no son notas sino pasos por la escala: 0 repite la nota actual, +1 sube un paso, −3 baja tres. Todas las teclas hacen lo mismo, solo cambia la distancia. Por eso una misma tecla puede sonar distinto: siempre partes de donde estás.',
    'howit.g':'Chuleta',
    'howit.g1':'Bordón (drone) — una nota infinita de fondo, como una gaita.',
    'howit.g2':'Arpegio — el acompañamiento recorre en bucle las notas de tu escala.',
    'howit.g3':'Bend — deslizar la altura de la nota, como un guitarrista estirando la cuerda.',
    'howit.g4':'Tónica (root) — la nota «casa» de la escala; todo vuelve a ella.',
    'backdesc.drone':'Una nota larga zumba de fondo, como una gaita.',
    'backdesc.shimmer':'Un colchón flotante con ecos brillantes.',
    'backdesc.arp':'Las notas de tu escala en bucle.',
    'backdesc.both':'Bordón y arpegio a la vez.',
    'backdesc.padperc':'Colchón suave más bajo y percusión.',
    'backdesc.arpperc':'Arpegio en bucle más bajo y percusión.',
    'backdesc.vamp':'Dos acordes que se mecen.',
    'backdesc.gong':'Un ciclo lento de gong marca el tiempo.',
    'backdesc.pattern':'Patrones entrelazados de metalófonos.',
    'backdesc.drive':'Bajo pulsante y bombo a negras.',
    'backdesc.tape':'Acordes polvorientos y ritmo perezoso.',
    'backdesc.swing':'Walking bass, ride y piano.',
    'taste.label':'Degustación','pw.tasteT':'¿Te gusta {name}?',
    'role.stepN':'paso {n}',
    'variant.freygish':'Hijaz','variant.hungarian':'Gitana','variant.romanian':'Klezmer',
    'pick.jazz.d':'la escala sigue los acordes (secuencia dorada)',
    'kd.t':'🧪 La Cocina','kd.d':'aquí se crean y se prueban instrumentos nuevos','kd.sub':'Aquí todo está vivo: cambia, a veces se rompe — y tú lo ves primero.','kd.back':'← Atrás',
    'pick.lab.d':'crea tu propia escala con las 12 notas',
    'mode.jazz.sub':'· escala automática · 🧪 cocina interna',
    'pw.li1':'Cinco instrumentos más: Blues, Oriente, Sueño, Gamelán, Synthwave',
    'pw.li2':'🧪 Llaves de la cocina: Jazz y el laboratorio de escalas — experimentos en primicia',
    'intro.hero':'Aquí no existe la nota equivocada.',
    'intro.p':'Las teclas son pasos por la escala. Elige un instrumento:',
    'pick.again':'toca otra vez para entrar',
    'pick.blues.m':'carretera, garaje, whisky','pick.vostok.m':'desierto, serpientes, trance',
    'pick.koto.m':'un jardín zen bajo la lluvia','pick.dream.m':'ingravidez',
    'pick.gamelan.m':'la orquesta de bronce de Bali','pick.light.m':'mañana y sol',
    'pick.synth.m':'neón y autopista nocturna','pick.lab.m':'tu laboratorio de sonido',
    'pick.jazz.m':'sótano lleno de humo, contrabajo',
  },
  pt: {
    'tut.offer.t':'Primeira vez aqui?','tut.offer.d':'Um minuto e você já está tocando. Por onde começamos?',
    'tut.offer.skip':'Eu me viro sozinho',
    'tut.s1':'Pressione e segure a tecla iluminada','tut.s2':'Toque nela várias vezes — você está subindo a escala',
    'tut.s3':'Agora desça de volta','tut.s4':'O mesmo passo — só que três de uma vez',
    'tut.sstrip':'Deslize o dedo pela escadinha — é o mapa da escala',
    'tut.s5':'Segure a tecla e arraste para cima ou para baixo — isso é um bend','tut.s6':'Agora ligue a base',
    'tut.done':'🎓 Tutorial concluído — continue tocando. Aqui não existe nota errada.',
    'tut.skip':'Pular','tut.replay':'🎓 Tutorial',
    'howit.open':'Como funciona?','howit.title':'Como funciona',
    'howit.p1':'O piano divide a oitava em 12 notas iguais. Para improvisar é preciso saber quais combinam — senão soa falso.',
    'howit.p2':'Na prática cada estilo usa um pequeno subconjunto dessas notas: uma escala. O blues usa 6, o koto 5, o Oriente 7.',
    'howit.p3':'O JamBrew mantém só as notas do estilo escolhido. O que você tocar encaixa.',
    'howit.p4':'E as teclas não são notas, são passos pela escala: 0 repete a nota atual, +1 sobe um passo, −3 desce três. Todas as teclas fazem o mesmo, só muda a distância. Por isso a mesma tecla pode soar diferente: você sempre parte de onde está.',
    'howit.g':'Cola',
    'howit.g1':'Drone — uma nota infinita ao fundo, como uma gaita de foles.',
    'howit.g2':'Arpejo — o acompanhamento percorre as notas da sua escala em loop.',
    'howit.g3':'Bend — deslizar a altura da nota, como um guitarrista puxando a corda.',
    'howit.g4':'Tônica (root) — a nota “casa” da escala; tudo volta para ela.',
    'backdesc.drone':'Uma nota longa zumbe ao fundo, como uma gaita de foles.',
    'backdesc.shimmer':'Um pad flutuante com ecos cintilantes.',
    'backdesc.arp':'As notas da sua escala em loop.',
    'backdesc.both':'Drone e arpejo juntos.',
    'backdesc.padperc':'Pad suave com baixo e percussão.',
    'backdesc.arpperc':'Arpejo em loop com baixo e percussão.',
    'backdesc.vamp':'Dois acordes balançando.',
    'backdesc.gong':'Um ciclo lento de gongo marca o tempo.',
    'backdesc.pattern':'Padrões entrelaçados de metalofones.',
    'backdesc.drive':'Baixo pulsante e bumbo em todos os tempos.',
    'backdesc.tape':'Acordes empoeirados e batida preguiçosa.',
    'backdesc.swing':'Walking bass, prato ride e piano.',
    'taste.label':'Degustação','pw.tasteT':'Curtiu {name}?',
    'role.stepN':'grau {n}',
    'variant.freygish':'Hijaz','variant.hungarian':'Cigana','variant.romanian':'Klezmer',
    'pick.jazz.d':'a escala segue os acordes (sequência dourada)',
    'kd.t':'🧪 A Cozinha','kd.d':'novos instrumentos são criados e testados aqui','kd.sub':'Aqui tudo está vivo: muda, às vezes quebra — e você vê primeiro.','kd.back':'← Voltar',
    'pick.lab.d':'monte sua própria escala com as 12 notas',
    'mode.jazz.sub':'· escala automática · 🧪 cozinha interna',
    'pw.li1':'Mais cinco instrumentos: Blues, Oriente, Sonho, Gamelão, Synthwave',
    'pw.li2':'🧪 Chaves da cozinha: Jazz e o laboratório de escalas — experimentos em primeira mão',
    'intro.hero':'Aqui não existe nota errada.',
    'intro.p':'As teclas são passos pela escala. Escolha um instrumento:',
    'pick.again':'toque de novo para entrar',
    'pick.blues.m':'estrada, garagem, uísque','pick.vostok.m':'deserto, serpentes, transe',
    'pick.koto.m':'um jardim zen na chuva','pick.dream.m':'gravidade zero',
    'pick.gamelan.m':'a orquestra de bronze de Bali','pick.light.m':'manhã e sol',
    'pick.synth.m':'néon e estrada à noite','pick.lab.m':'seu laboratório de som',
    'pick.jazz.m':'porão esfumaçado, contrabaixo',
  },
  de: {
    'tut.offer.t':'Zum ersten Mal hier?','tut.offer.d':'Eine Minute — und du spielst. Womit fangen wir an?',
    'tut.offer.skip':'Ich komm selbst klar',
    'tut.s1':'Drücke und halte die leuchtende Taste','tut.s2':'Tippe sie wieder und wieder — du steigst die Tonleiter hinauf',
    'tut.s3':'Jetzt geh wieder hinunter','tut.s4':'Derselbe Schritt — nur drei auf einmal',
    'tut.sstrip':'Fahre mit dem Finger die Leiter entlang — sie ist die Karte der Tonleiter',
    'tut.s5':'Halte die Taste und zieh sie nach oben oder unten — das ist ein Bend','tut.s6':'Jetzt starte die Begleitung',
    'tut.done':"🎓 Tutorial geschafft — spiel einfach weiter. Einen falschen Ton gibt es hier nicht.",
    'tut.skip':'Überspringen','tut.replay':'🎓 Tutorial',
    'howit.open':'Wie funktioniert das?','howit.title':'Wie es funktioniert',
    'howit.p1':'Das Klavier teilt die Oktave in 12 gleiche Töne. Zum Improvisieren muss man wissen, welche zusammenpassen — sonst klingt es schief.',
    'howit.p2':'Tatsächlich nutzt jeder Stil nur eine kleine Teilmenge dieser Töne — eine Tonleiter. Blues 6, Koto 5, Orient 7.',
    'howit.p3':'JamBrew behält nur die Töne des gewählten Stils. Was immer du drückst — es passt.',
    'howit.p4':'Und die Tasten sind keine Töne, sondern Schritte auf der Tonleiter: 0 wiederholt den aktuellen Ton, +1 geht einen Schritt hinauf, −3 drei hinunter. Alle Tasten tun dasselbe, nur die Entfernung ist anders. Darum kann dieselbe Taste jedes Mal anders klingen: Du gehst immer von dort los, wo du stehst.',
    'howit.g':'Spickzettel',
    'howit.g1':'Drone — ein endloser Ton im Hintergrund, wie bei einem Dudelsack.',
    'howit.g2':'Arpeggio — die Begleitung spielt die Töne deiner Tonleiter in Schleife.',
    'howit.g3':'Bend — die Tonhöhe gleiten lassen, wie ein Gitarrist die Saite zieht.',
    'howit.g4':'Grundton (Root) — der »Heimatton« der Tonleiter; alles strebt zu ihm zurück.',
    'backdesc.drone':'Ein langer Ton brummt im Hintergrund — wie ein Dudelsack.',
    'backdesc.shimmer':'Eine schwebende Fläche mit glitzernden Echos.',
    'backdesc.arp':'Die Töne deiner Tonleiter in Schleife.',
    'backdesc.both':'Drone und Arpeggio zusammen.',
    'backdesc.padperc':'Weiche Fläche plus Bass und Percussion.',
    'backdesc.arpperc':'Arpeggio in Schleife plus Bass und Percussion.',
    'backdesc.vamp':'Zwei Akkorde schaukeln hin und her.',
    'backdesc.gong':'Ein langsamer Gong-Zyklus gibt den Takt vor.',
    'backdesc.pattern':'Verzahnte Metallophon-Muster.',
    'backdesc.drive':'Pumpender Bass und Four-on-the-Floor.',
    'backdesc.tape':'Staubige Akkorde und ein fauler Beat.',
    'backdesc.swing':'Walking Bass, Ride und Klavier.',
    'taste.label':'Kostprobe','pw.tasteT':'Gefällt dir {name}?',
    'role.stepN':'Stufe {n}',
    'variant.freygish':'Hijaz','variant.hungarian':'Ungarisch Moll','variant.romanian':'Klezmer',
    'pick.jazz.d':'die Skala folgt den Akkorden (goldene Sequenz)',
    'kd.t':'🧪 Die Küche','kd.d':'hier werden neue Instrumente entwickelt und getestet','kd.sub':'Hier ist alles lebendig: es ändert sich, manchmal geht etwas kaputt — und du siehst es zuerst.','kd.back':'← Zurück',
    'pick.lab.d':'baue deine eigene Skala aus den 12 Tönen',
    'mode.jazz.sub':'· Auto-Skala · 🧪 interne Küche',
    'pw.li1':'Fünf weitere Instrumente: Blues, Orient, Traum, Gamelan, Synthwave',
    'pw.li2':'🧪 Schlüssel zur Küche: Jazz und das Skalen-Labor — Experimente, die du zuerst siehst',
    'intro.hero':'Hier gibt es keinen falschen Ton.',
    'intro.p':'Die Tasten sind Schritte auf der Tonleiter. Wähle ein Instrument:',
    'pick.again':'nochmal tippen zum Start',
    'pick.blues.m':'Landstraße, Garage, Whiskey','pick.vostok.m':'Wüste, Schlangen, Trance',
    'pick.koto.m':'ein Zen-Garten im Regen','pick.dream.m':'Schwerelosigkeit',
    'pick.gamelan.m':'das Bronzeorchester von Bali','pick.light.m':'Morgen und Sonne',
    'pick.synth.m':'Neon und nächtliche Autobahn','pick.lab.m':'dein Klanglabor',
    'pick.jazz.m':'verrauchter Keller, Kontrabass',
  },
  fr: {
    'tut.offer.t':'Première fois ici ?','tut.offer.d':'Une minute et tu joues. On commence par quoi ?',
    'tut.offer.skip':'Je me débrouille',
    'tut.s1':'Appuie sur la touche lumineuse et maintiens-la','tut.s2':'Tape-la encore et encore — tu montes la gamme',
    'tut.s3':'Maintenant redescends','tut.s4':"Le même pas — juste trois d'un coup",
    'tut.sstrip':"Fais glisser ton doigt le long de l'échelle — c'est la carte de la gamme",
    'tut.s5':"Maintiens la touche et glisse vers le haut ou le bas — c'est un bend",'tut.s6':"Maintenant lance l'accompagnement",
    'tut.done':"🎓 Tutoriel terminé — continue de jouer. Ici, la fausse note n'existe pas.",
    'tut.skip':'Passer','tut.replay':'🎓 Tutoriel',
    'howit.open':'Comment ça marche ?','howit.title':'Comment ça marche',
    'howit.p1':"Le piano divise l'octave en 12 notes égales. Pour improviser, il faut savoir lesquelles vont ensemble — sinon ça sonne faux.",
    'howit.p2':"En réalité chaque style n'utilise qu'un petit sous-ensemble de ces notes : une gamme. Le blues en prend 6, le koto 5, l'Orient 7.",
    'howit.p3':'JamBrew ne garde que les notes du style choisi. Quoi que tu presses, ça tombe juste.',
    'howit.p4':"Et les touches ne sont pas des notes mais des pas le long de la gamme : 0 répète la note actuelle, +1 monte d'un pas, −3 descend de trois. Toutes les touches font la même chose, seule la distance change. Voilà pourquoi une même touche peut sonner différemment : tu pars toujours de là où tu es.",
    'howit.g':'Antisèche',
    'howit.g1':'Bourdon — une note infinie en fond, comme une cornemuse.',
    'howit.g2':"Arpège — l'accompagnement égrène en boucle les notes de ta gamme.",
    'howit.g3':'Bend — faire glisser la hauteur de la note, comme un guitariste qui tire sur une corde.',
    'howit.g4':'Tonique (root) — la note « maison » de la gamme ; tout y revient.',
    'backdesc.drone':'Une longue note bourdonne en fond — comme une cornemuse.',
    'backdesc.shimmer':'Une nappe flottante aux échos scintillants.',
    'backdesc.arp':'Les notes de ta gamme en boucle.',
    'backdesc.both':'Bourdon et arpège ensemble.',
    'backdesc.padperc':'Nappe douce plus basse et percussions.',
    'backdesc.arpperc':'Arpège en boucle plus basse et percussions.',
    'backdesc.vamp':'Deux accords qui se balancent.',
    'backdesc.gong':'Un cycle lent de gong tient le temps.',
    'backdesc.pattern':'Motifs entrelacés de métallophones.',
    'backdesc.drive':'Basse pulsée et grosse caisse à chaque temps.',
    'backdesc.tape':'Accords poussiéreux et rythme nonchalant.',
    'backdesc.swing':'Walking bass, ride et piano.',
    'taste.label':'Dégustation','pw.tasteT':'{name} te plaît ?',
    'role.stepN':'degré {n}',
    'variant.freygish':'Hijaz','variant.hungarian':'Tzigane','variant.romanian':'Klezmer',
    'pick.jazz.d':'la gamme suit les accords (séquence dorée)',
    'kd.t':'🧪 La Cuisine','kd.d':'de nouveaux instruments sont créés et testés ici','kd.sub':'Ici tout est vivant : ça change, parfois ça casse — et tu le vois en premier.','kd.back':'← Retour',
    'pick.lab.d':'construis ta gamme avec les 12 notes',
    'mode.jazz.sub':'· gamme auto · 🧪 cuisine interne',
    'pw.li1':'Cinq instruments de plus : Blues, Orient, Rêve, Gamelan, Synthwave',
    'pw.li2':'🧪 Les clés de la cuisine : Jazz et le labo de gammes — les expériences en avant-première',
    'intro.hero':'Ici, la fausse note n’existe pas.',
    'intro.p':'Les touches sont des pas le long de la gamme. Choisis un instrument :',
    'pick.again':'retape pour entrer',
    'pick.blues.m':'route, garage, whisky','pick.vostok.m':'désert, serpents, transe',
    'pick.koto.m':'un jardin zen sous la pluie','pick.dream.m':'apesanteur',
    'pick.gamelan.m':"l'orchestre de bronze de Bali",'pick.light.m':'matin et soleil',
    'pick.synth.m':'néon et autoroute de nuit','pick.lab.m':'ton laboratoire du son',
    'pick.jazz.m':'cave enfumée, contrebasse',
  },
  ja: {
    'tut.offer.t':'はじめてですか？','tut.offer.d':'1分で弾けるようになります。どれから始めますか？',
    'tut.offer.skip':'自分で試してみる',
    'tut.s1':'光っているキーを押さえたままにして','tut.s2':'何度も押してみて — 音階を上っています',
    'tut.s3':'今度は下りてみましょう','tut.s4':'同じ一歩 — ただし3歩ぶんいっぺんに',
    'tut.sstrip':'はしごに沿って指をすべらせて — 音階の地図です',
    'tut.s5':'キーを押さえたまま上または下へドラッグ — これがベンド','tut.s6':'伴奏を入れましょう',
    'tut.done':'🎓 チュートリアル完了 — そのまま弾き続けよう。ここに間違った音はありません。',
    'tut.skip':'スキップ','tut.replay':'🎓 チュートリアル',
    'howit.open':'仕組みは？','howit.title':'仕組み',
    'howit.p1':'ピアノはオクターブを12等分します。即興するにはどの音が合うか知らないと、外れた音になります。',
    'howit.p2':'実際どのスタイルも、その中の少数の音＝音階しか使いません。ブルースは6音、琴は5音、オリエントは7音。',
    'howit.p3':'JamBrewは選んだスタイルの音だけを残します。何を押しても合うのです。',
    'howit.p4':'キーは音ではなく音階上の歩み：0は同じ音を繰り返し、+1は一歩上へ、−3は三歩下へ。どのキーも同じ動きで、距離が違うだけ。だから同じキーでも毎回違う音になる — いまいる場所から歩き出すからです。',
    'howit.g':'ミニ用語集',
    'howit.g1':'ドローン — バグパイプのように背景で鳴り続けるひとつの音。',
    'howit.g2':'アルペジオ — 伴奏が音階の音を順にループ再生。',
    'howit.g3':'ベンド — ギターのチョーキングのように音程を滑らかに変えること。',
    'howit.g4':'ルート — 音階の「家」となる音。すべてがそこへ帰ります。',
    'backdesc.drone':'長い音が背景で鳴り続けます — バグパイプのように。',
    'backdesc.shimmer':'きらめく残響を伴う浮遊パッド。',
    'backdesc.arp':'音階の音をループで爪弾きます。',
    'backdesc.both':'ドローンとアルペジオを同時に。',
    'backdesc.padperc':'柔らかいパッドにベースと打楽器。',
    'backdesc.arpperc':'ループするアルペジオにベースと打楽器。',
    'backdesc.vamp':'2つのコードがゆらゆら交替。',
    'backdesc.gong':'ゆったりした銅鑼のサイクルが時を刻みます。',
    'backdesc.pattern':'メタロフォンの絡み合うパターン。',
    'backdesc.drive':'うねるベースと4つ打ちのドラム。',
    'backdesc.tape':'ほこりっぽいコードとゆるいビート。',
    'backdesc.swing':'ウォーキングベース、ライド、ピアノ。',
    'taste.label':'お試し中','pw.tasteT':'{name}、気に入った？',
    'role.stepN':'第{n}音',
    'variant.freygish':'ヒジャーズ','variant.hungarian':'ジプシー','variant.romanian':'クレズマー',
    'pick.jazz.d':'音階がコードを追いかける（黄金の進行）',
    'kd.t':'🧪 キッチン','kd.d':'新しい楽器はここで作られ、試されます','kd.sub':'ここは生きています。変わり、ときに壊れます — 最初に見るのはあなた。','kd.back':'← 戻る',
    'pick.lab.d':'12音から自分の音階を作ろう',
    'mode.jazz.sub':'· コード追従スケール · 🧪 キッチン',
    'pw.li1':'さらに5つの楽器：ブルース、東方、ドリーム、ガムラン、シンセウェイヴ',
    'pw.li2':'🧪 キッチンの鍵：ジャズと音階ラボ — 実験をいち早く',
    'intro.hero':'ここに間違った音はありません。',
    'intro.p':'キーは音階の歩み。楽器を選んでください：',
    'pick.again':'もう一度タップで開始',
    'pick.blues.m':'夜道、ガレージ、ウイスキー','pick.vostok.m':'砂漠、蛇、トランス',
    'pick.koto.m':'雨の石庭','pick.dream.m':'無重力',
    'pick.gamelan.m':'バリの青銅オーケストラ','pick.light.m':'朝と太陽',
    'pick.synth.m':'ネオンと夜のハイウェイ','pick.lab.m':'きみの音の実験室',
    'pick.jazz.m':'煙るジャズバーとウッドベース',
  },
  zh: {
    'tut.offer.t':'第一次来？','tut.offer.d':'一分钟就能上手。从哪个开始？',
    'tut.offer.skip':'我自己摸索',
    'tut.s1':'按住发光的琴键','tut.s2':'再按几次——你正沿着音阶往上走',
    'tut.s3':'现在往回走','tut.s4':'同样的一步——只是一次跨三步',
    'tut.sstrip':'沿着梯子滑动手指——这是音阶的地图',
    'tut.s5':'按住琴键往上或往下拖——这就是推弦','tut.s6':'现在开启伴奏',
    'tut.done':'🎓 教程完成——继续弹吧。在这里不存在错音。',
    'tut.skip':'跳过','tut.replay':'🎓 教程',
    'howit.open':'它是怎么工作的？','howit.title':'工作原理',
    'howit.p1':'钢琴把八度分成12个等分的音。要即兴，就得知道哪些音搭配——否则就跑调。',
    'howit.p2':'其实每种风格只用其中一小部分音——音阶。布鲁斯用6个，古筝5个，东方7个。',
    'howit.p3':'JamBrew只保留所选风格的音。随便按，都在调上。',
    'howit.p4':'琴键不是音符，而是沿音阶走的步子：0重复当前音，+1上一步，−3下三步。所有琴键做的事一样，只是距离不同。所以同一个键每次可能不一样——你总是从当前位置出发。',
    'howit.g':'小抄',
    'howit.g1':'持续音（Drone）——像风笛那样在背景里一直响的一个音。',
    'howit.g2':'琶音——伴奏循环拨响你音阶里的音。',
    'howit.g3':'推弦（Bend）——平滑地推高或压低音高，就像吉他手拉弦。',
    'howit.g4':'主音（Root）——音阶的“家”；一切都回到它。',
    'backdesc.drone':'一个长音在背景里嗡鸣——像风笛。',
    'backdesc.shimmer':'漂浮的铺底，带闪烁的回声。',
    'backdesc.arp':'音阶的音循环拨响。',
    'backdesc.both':'持续音加琶音。',
    'backdesc.padperc':'柔和铺底，加贝斯和打击乐。',
    'backdesc.arpperc':'循环琶音，加贝斯和打击乐。',
    'backdesc.vamp':'两个和弦来回摇摆。',
    'backdesc.gong':'缓慢的锣声循环掌握节拍。',
    'backdesc.pattern':'金属琴交织的音型。',
    'backdesc.drive':'抽送的贝斯与四四拍底鼓。',
    'backdesc.tape':'带灰尘感的和弦与慵懒节拍。',
    'backdesc.swing':'行走贝斯、叮叮镲和钢琴。',
    'taste.label':'试玩','pw.tasteT':'喜欢{name}吗？',
    'role.stepN':'第{n}级',
    'variant.freygish':'希贾兹','variant.hungarian':'吉普赛','variant.romanian':'克莱兹默',
    'pick.jazz.d':'音阶跟着和弦走（黄金进行）',
    'kd.t':'🧪 厨房','kd.d':'新乐器在这里打造并测试','kd.sub':'这里的一切都是活的：会变化，偶尔会坏——而你最先看到。','kd.back':'← 返回',
    'pick.lab.d':'用12个音打造你自己的音阶',
    'mode.jazz.sub':'· 和弦自动音阶 · 🧪 内部厨房',
    'pw.li1':'再加五件乐器：布鲁斯、东方、梦境、甘美兰、合成波',
    'pw.li2':'🧪 厨房钥匙：爵士与音阶实验室——抢先体验实验品',
    'intro.hero':'在这里不存在错音。',
    'intro.p':'琴键是沿音阶走的步子。选择一件乐器：',
    'pick.again':'再点一次进入',
    'pick.blues.m':'公路、车库、威士忌','pick.vostok.m':'沙漠、蛇、出神',
    'pick.koto.m':'雨中的枯山水','pick.dream.m':'失重',
    'pick.gamelan.m':'巴厘岛的青铜乐队','pick.light.m':'清晨与阳光',
    'pick.synth.m':'霓虹与午夜公路','pick.lab.m':'你的声音实验室',
    'pick.jazz.m':'烟雾地下室与低音提琴',
  },
};
for(const l in X){ if(I18N[l]) Object.assign(I18N[l], X[l]); }

/* ============ Tutorial engine ============ */
// Steps complete on real actions (jl:* events from app.js), never on "Next" buttons.
// Other keys stay playable throughout — a tutorial must not police the instrument.
function keyEl(off){
  for(const k of document.querySelectorAll('.keys .key')){
    const o=k.querySelector('.off'); if(o && parseInt(o.textContent,10)===off) return k;
  } return null;
}
const STEPS=[
  {key:'tut.s1', target:()=>keyEl(0),  ev:'jl:note',    ok:d=>d&&d.offset===0,  need:1},
  {key:'tut.s2', target:()=>keyEl(1),  ev:'jl:note',    ok:d=>d&&d.offset===1,  need:3},
  {key:'tut.s3', target:()=>keyEl(-1), ev:'jl:note',    ok:d=>d&&d.offset===-1, need:2},
  {key:'tut.s4', target:()=>keyEl(3),  ev:'jl:note',    ok:d=>d&&d.offset===3,  need:1},
  {key:'tut.sstrip', target:()=>document.getElementById('stepStrip'), ev:'jl:strip', ok:()=>true, need:4},   // a short slide or a few taps
  // aim at a key that can actually bend right now (either direction); re-aimed on every stray tap (see onEvent)
  {key:'tut.s5', target:()=>document.querySelector('.keys .key.canup, .keys .key.candn')||keyEl(0), ev:'jl:bend', ok:()=>true, need:1},
  {key:'tut.s6', target:()=>document.getElementById('accBtn'), ev:'jl:backing', ok:()=>true, need:1},
];
let hooks=null, active=false, stepI=0, hits=0, advancing=false, barEl=null, lit=null;

function light(el){ if(lit) lit.classList.remove('tutlit'); lit=el; if(el) el.classList.add('tutlit'); }
function barText(){ if(!barEl) return;
  barEl.querySelector('.tuttext').textContent=t(STEPS[stepI].key);
  [...barEl.querySelectorAll('.tutdot')].forEach((d,i)=>{ d.classList.toggle('done',i<stepI); d.classList.toggle('cur',i===stepI); }); }
function makeBar(){
  barEl=document.createElement('div'); barEl.id='tutbar';
  barEl.innerHTML=`<div class="tutdots">${STEPS.map(()=>'<span class="tutdot"></span>').join('')}</div><div class="tuttext"></div><button class="tutskip">${t('tut.skip')}</button>`;
  barEl.querySelector('.tutskip').addEventListener('click',()=>{ track('tut_skip',{step:stepI}); stopTutorial(); });
  document.querySelector('.display').before(barEl);
}
function pulseBar(){ if(barEl){ barEl.classList.remove('hit'); void barEl.offsetWidth; barEl.classList.add('hit'); } }
function onEvent(name,e){ if(!active||advancing) return;
  if(lit && !lit.isConnected) light(STEPS[stepI].target());   // keys were rebuilt (variant change) — re-aim
  const st=STEPS[stepI];
  if(st.ev==='jl:bend' && name==='jl:note') light(st.target());   // stray taps moved the position → re-aim glow at a still-bendable key
  if(st.ev!==name || !st.ok(e.detail)) return;
  hits++; pulseBar();
  if(hits>=st.need){ advancing=true; setTimeout(nextStep,650); }
}
function nextStep(){ advancing=false; stepI++; hits=0;
  if(stepI>=STEPS.length) return celebrate();
  const st=STEPS[stepI];
  if(st.ev==='jl:backing' && document.getElementById('accBtn').classList.contains('on')) return celebrate();  // band already playing
  light(st.target()); barText();
}
function celebrate(){ active=false; light(null); document.body.classList.remove('tut'); unlisten(); markDone();
  track('tut_done');
  if(barEl){ const b=barEl; barEl=null; b.classList.add('donefx');
    b.querySelector('.tuttext').textContent=t('tut.done');
    const sk=b.querySelector('.tutskip'); if(sk) sk.remove();
    [...b.querySelectorAll('.tutdot')].forEach(d=>d.classList.add('done'));
    setTimeout(()=>b.remove(),4500); }
}
function stopTutorial(){ active=false; light(null); document.body.classList.remove('tut'); unlisten(); markDone();
  if(barEl){ barEl.remove(); barEl=null; } }
const L={};
function listen(){ ['jl:note','jl:bend','jl:backing','jl:strip'].forEach(n=>{ L[n]=e=>onEvent(n,e); document.addEventListener(n,L[n]); }); }
function unlisten(){ for(const n in L){ document.removeEventListener(n,L[n]); delete L[n]; } }
function markDone(){ try{ localStorage.setItem('jamlab.tutDone','1'); }catch(e){} }
function startTutorial(){ if(active) stopTutorial();
  active=true; stepI=0; hits=0; advancing=false;
  document.body.classList.add('tut');
  makeBar(); light(STEPS[0].target()); barText(); listen(); }

/* ============ Chooser + help entries + backing toast ============ */
function showChooser(){ document.getElementById('tutov').classList.remove('hidden'); }
let toastT=null;
function showBackDesc(id){ const k='backdesc.'+id; if(!I18N.en[k]) return;
  let el=document.getElementById('uxtoast');
  if(!el){ el=document.createElement('div'); el.id='uxtoast'; document.body.appendChild(el); }
  el.textContent=t(k); el.classList.add('show');
  clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove('show'),3500);
}
export function initTutorial(h){ hooks=h;
  const tutov=document.getElementById('tutov');
  tutov.querySelectorAll('.tutpick').forEach(b=>b.addEventListener('click',()=>{
    tutov.classList.add('hidden'); markDone();
    track('tut_start',{mode:b.dataset.tmode});
    hooks.enterMode(b.dataset.tmode);                 // tutorial entry: no auto-backing, lock bypassed (guided taste)
    setTimeout(startTutorial,350);
  }));
  document.getElementById('tutSkip').addEventListener('click',()=>{ tutov.classList.add('hidden'); markDone(); });
  // dismissing the chooser any other way (Esc/backdrop) also counts as "not now" — replay lives in Help
  new MutationObserver(()=>{ if(tutov.classList.contains('hidden')) markDone(); }).observe(tutov,{attributes:true,attributeFilter:['class']});
  document.getElementById('tutReplayBtn').addEventListener('click',()=>{
    document.getElementById('help').classList.add('hidden'); showChooser(); });
  document.getElementById('howitBtn').addEventListener('click',()=>{
    document.getElementById('help').classList.add('hidden');
    document.getElementById('howit').classList.remove('hidden'); });
  document.getElementById('closeHowit').addEventListener('click',()=>document.getElementById('howit').classList.add('hidden'));
  document.getElementById('backSel').addEventListener('change',e=>showBackDesc(e.target.value));
  let first=false; try{ first=!localStorage.getItem('jamlab.tutDone'); }catch(e){}
  if(first){ track('tut_offer'); showChooser(); }
}
