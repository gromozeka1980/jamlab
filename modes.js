// Music data: instrument modes, scales, harmonies, rhythms, jazz theory. Pure data, no dependencies.
export const MODES = {
  blues: {
    id:'blues', name:'mode.blues.name', sub:'mode.blues.sub', voice:'saw', back:'blues',
    theme:{bg1:'#18324f', accent:'#ffd43b', zero:'#2f9e44', neg:'#3b5bdb', pos:'#e8590c', blue:'#4dd0e1'},
    kind:'scale',
    scales:{minor:[0,3,5,6,7,10], major:[0,2,3,4,7,9]},
    variants:[{id:'minor',label:'variant.blues.minor'},{id:'major',label:'variant.blues.major'}], defVariant:'minor',
    backings:[{id:'shuffle',label:'backing.shuffle'},{id:'minor',label:'backing.minor'},{id:'rock',label:'backing.rock'},{id:'slow',label:'backing.slow'},{id:'country',label:'backing.country'},{id:'funk',label:'backing.funk'},{id:'rhumba',label:'backing.rhumba'},{id:'honky',label:'backing.honky'}], defBacking:'shuffle',
  },
  jazz: {
    id:'jazz', name:'mode.jazz.name', sub:'mode.jazz.sub', voice:'pluck', back:'jazz', defBpm:132,
    theme:{bg1:'#1a1a2e', accent:'#e0b974', zero:'#c44569', neg:'#5b6ee1', pos:'#d98c3a', blue:'#5ad1c8'},
    kind:'scale', variants:[],
    backings:[{id:'swing',label:'backing.swing'}], defBacking:'swing',
  },
  gamelan: {
    id:'gamelan', name:'mode.gamelan.name', sub:'mode.gamelan.sub', voice:'metal', back:'gamelan',
    theme:{bg1:'#3a2e10', accent:'#ffd43b', zero:'#e8a23a', neg:'#c98a2a', pos:'#e8c14a', blue:'#7fd1ff'},
    kind:'scale', scales:{pelog:[0,1,3,7,8], slendro:[0,2,5,7,10]},
    variants:[{id:'pelog',label:'variant.pelog'},{id:'slendro',label:'variant.slendro'}], defVariant:'pelog',
    backings:[{id:'gong',label:'backing.gong'},{id:'pattern',label:'backing.pattern'}], defBacking:'gong',
  },
  dream: {
    id:'dream', name:'mode.dream.name', sub:'mode.dream.sub', voice:'pad', back:'dream',
    theme:{bg1:'#243a66', accent:'#a5d8ff', zero:'#74c0fc', neg:'#748ffc', pos:'#b197fc', blue:'#99e9f2'},
    kind:'scale', scales:{whole:[0,2,4,6,8,10]}, variants:[], defVariant:'whole',
    backings:[{id:'drone',label:'backing.drone'},{id:'shimmer',label:'backing.shimmer'}], defBacking:'drone',
  },
  koto: {
    id:'koto', name:'mode.koto.name', sub:'mode.koto.sub', voice:'pluck', back:'koto', perc:'taiko',
    theme:{bg1:'#2a2150', accent:'#ffcf6b', zero:'#e23b3b', neg:'#4263eb', pos:'#e8590c', blue:'#4dd0e1'},
    kind:'scale',
    scales:{hira:[0,2,3,7,8], kumoi:[0,2,3,7,9], insen:[0,1,5,7,10], iwato:[0,1,5,6,10]},
    variants:[{id:'hira',label:'variant.hira'},{id:'kumoi',label:'variant.kumoi'},{id:'insen',label:'variant.insen'},{id:'iwato',label:'variant.iwato'}], defVariant:'hira',
    backings:[{id:'drone',label:'backing.drone',pad:1},{id:'arp',label:'backing.arp',arp:1},{id:'both',label:'backing.both',pad:1,arp:1},{id:'padperc',label:'backing.koto.padperc',pad:1,perc:1,bass:1},{id:'arpperc',label:'backing.koto.arpperc',arp:1,perc:1,bass:1}], defBacking:'arpperc',
  },
  vostok: {
    id:'vostok', name:'mode.vostok.name', sub:'mode.vostok.sub', voice:'pluck', back:'koto', perc:'darbuka', vamp:[0,1],
    theme:{bg1:'#3a2417', accent:'#e8b04b', zero:'#d6453b', neg:'#b5651d', pos:'#e8930c', blue:'#e8b04b'},
    kind:'scale',
    scales:{freygish:[0,1,4,5,7,8,10], hungarian:[0,2,3,6,7,8,11], romanian:[0,2,3,6,7,9,10]},
    variants:[{id:'freygish',label:'variant.freygish'},{id:'hungarian',label:'variant.hungarian'},{id:'romanian',label:'variant.romanian'}], defVariant:'freygish',
    backings:[{id:'drone',label:'backing.drone',pad:1},{id:'padperc',label:'backing.vostok.padperc',pad:1,perc:1,bass:1},{id:'arpperc',label:'backing.vostok.arpperc',arp:1,perc:1,bass:1},{id:'vamp',label:'backing.vostok.vamp',vamp:1,arp:1,perc:1,bass:1}], defBacking:'arpperc',
  },
  light: {
    id:'light', name:'mode.light.name', sub:'mode.light.sub', voice:'pluck', back:'koto', perc:'shaker',
    theme:{bg1:'#13405a', accent:'#ffe08a', zero:'#37b24d', neg:'#4dabf7', pos:'#ffa94d', blue:'#66d9e8'},
    kind:'scale',
    scales:{major:[0,2,4,7,9], minor:[0,3,5,7,10]},
    variants:[{id:'major',label:'variant.light.major'},{id:'minor',label:'variant.light.minor'}], defVariant:'major',
    backings:[{id:'drone',label:'backing.drone',pad:1},{id:'arp',label:'backing.arp',arp:1},{id:'padperc',label:'backing.light.padperc',pad:1,perc:1,bass:1},{id:'arpperc',label:'backing.light.arpperc',arp:1,perc:1,bass:1}], defBacking:'arpperc',
  },
  synth: {
    id:'synth', name:'mode.synth.name', sub:'mode.synth.sub', voice:'saw', back:'synth', defBpm:108,
    theme:{bg1:'#2b1055', accent:'#ff6ec7', zero:'#9d4edd', neg:'#4cc9f0', pos:'#f72585', blue:'#4cc9f0'},
    kind:'scale',
    scales:{minor:[0,2,3,5,7,8,10], penta:[0,3,5,7,10]},
    variants:[{id:'minor',label:'variant.minor'},{id:'penta',label:'variant.penta'}], defVariant:'minor',
    backings:[{id:'drive',label:'backing.synth.drive'}], defBacking:'drive',
  },
  lofi: {
    id:'lofi', name:'mode.lofi.name', sub:'mode.lofi.sub', voice:'keys', back:'lofi', defBpm:74,
    theme:{bg1:'#3b2f24', accent:'#ffb86b', zero:'#b08968', neg:'#7f9fb8', pos:'#e07a5f', blue:'#89b0ae'},
    kind:'scale',
    scales:{dorian:[0,2,3,5,7,9,10], penta:[0,3,5,7,10]},
    variants:[{id:'dorian',label:'variant.dorian'},{id:'penta',label:'variant.penta'}], defVariant:'dorian',
    backings:[{id:'tape',label:'backing.lofi.tape'}], defBacking:'tape',
  },
  lab: {
    id:'lab', name:'mode.lab.name', sub:'mode.lab.sub', voice:'pluck', back:'koto', perc:'taiko',
    theme:{bg1:'#241b52', accent:'#b39dff', zero:'#8f6fff', neg:'#5b6ee1', pos:'#c77dff', blue:'#9db4ff'},
    kind:'scale', lab:true,
    scales:{}, downScales:{}, variants:[], defVariant:'p_harm',   // filled at runtime from presets + saved custom scales
    backings:[{id:'drone',label:'backing.drone',pad:1},{id:'arp',label:'backing.arp',arp:1},{id:'padperc',label:'backing.light.padperc',pad:1,perc:1,bass:1},{id:'arpperc',label:'backing.light.arpperc',arp:1,perc:1,bass:1}], defBacking:'arpperc',
  },
  dorian: {
    id:'dorian', name:'mode.dorian.name', sub:'mode.dorian.sub', voice:'saw', back:'koto',
    theme:{bg1:'#13392b', accent:'#a9e34b', zero:'#37b24d', neg:'#3bc9db', pos:'#82c91e', blue:'#3bc9db'},
    kind:'scale',
    scales:{dorian:[0,2,3,5,7,9,10], aeolian:[0,2,3,5,7,8,10]},
    variants:[{id:'dorian',label:'variant.dorian'},{id:'aeolian',label:'variant.aeolian'}], defVariant:'dorian',
    backings:[{id:'drone',label:'backing.drone',pad:1}], defBacking:'drone',
  },
  cosmos: {
    id:'cosmos', name:'mode.cosmos.name', sub:'mode.cosmos.sub', voice:'pad', back:'flute',
    theme:{bg1:'#241a44', accent:'#b197fc', zero:'#9775fa', neg:'#5c7cfa', pos:'#da77f2', blue:'#66d9e8'},
    kind:'scale',
    scales:{lydian:[0,2,4,6,7,9,11], mixo:[0,2,4,5,7,9,10]},
    variants:[{id:'lydian',label:'variant.lydian'},{id:'mixo',label:'variant.mixo'}], defVariant:'lydian',
    backings:[{id:'drone',label:'backing.drone'}], defBacking:'drone',
  },
  flute: {
    id:'flute', name:'mode.flute.name', sub:'mode.flute.sub', voice:'flute', back:'flute',
    theme:{bg1:'#10302e', accent:'#9be7c4', zero:'#2f9e9e', neg:'#3b8bdb', pos:'#d6a24a', blue:'#7fd1ff'},
    kind:'harmonic', base:4,                 // index 0 -> 4th harmonic
    variants:[],
    backings:[{id:'drone',label:'backing.drone'}], defBacking:'drone',
  },
};
export const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

/* --- blues: 12 bars --- */
const DOM7=[0,4,7,10], MIN7=[0,3,7,10], MAJ=[0,4,7];
const MAJ6=[0,4,7,9];
const dom12=[0,0,0,0,5,5,0,0,7,5,0,7].map(r=>({root:r,ivs:DOM7}));
const cnt12=[0,0,0,0,5,5,0,0,7,5,0,7].map(r=>({root:r,ivs:MAJ6}));
const min12=[{root:0,ivs:MIN7},{root:0,ivs:MIN7},{root:0,ivs:MIN7},{root:0,ivs:MIN7},{root:5,ivs:MIN7},{root:5,ivs:MIN7},
             {root:0,ivs:MIN7},{root:0,ivs:MIN7},{root:8,ivs:MAJ},{root:7,ivs:DOM7},{root:0,ivs:MIN7},{root:7,ivs:DOM7}];
// --- harmony: progression + chord quality ---
export const HARMONY={ major:{bars:dom12}, minor:{bars:min12}, country:{bars:cnt12}, funk:{bars:[{root:0,ivs:DOM7}]} };
export const HARM_OPTS=[['major','harm.major'],['minor','harm.minor'],['country','harm.country'],['funk','harm.funk']];
// which scale fits the harmony (guard against clashing combos)
export const HARM_LADS={ major:['minor','major'], minor:['minor'], country:['major'], funk:['minor','major'] };
// --- rhythm: bass by "roles" (tones of the current chord), swing, drums, comping ---
export const RHYTHM={
  shuffle:{bass:['R','3','5','6','b7','6','5','3'],              swing:0.16, drum:'shuffle', comp:'sustain'},
  rock:   {bass:['R','5','R','5','R','5','R','5'],              swing:0,    drum:'rock',    comp:'sustain'},
  slow:   {bass:['R',null,'5',null,'b7',null,'5',null],         swing:0.2,  drum:'slow',    comp:'sustain'},
  train:  {bass:['R',null,null,null,'5',null,null,null],        swing:0.12, drum:'train',   comp:'stab'},
  rhumba: {bass:['R',null,null,'5',null,null,'R',null],         swing:0,    drum:'rhumba',  comp:'offbeat'},
  honky:  {bass:['R',null,null,null,'5',null,null,null],        swing:0.16, drum:'shuffle', comp:'offbeat'},
  funk:   {bass:['R',null,'5',null,'R',null,null,'b7'],         swing:0,    drum:'funk',    comp:'stab'},
};
export const RHY_OPTS=[['shuffle','rhy.shuffle'],['rock','rhy.rock'],['slow','rhy.slow']];   // train/rhumba/honky/funk stay in RHYTHM, hidden from the menu

/* --- modal backing patterns --- */
export const ARP=[0,7,12,7];                       // root-fifth-octave (consonant in any scale)
export const DREAMARP=[0,4,8,12,8,4];
export const GMPAT=[0,1,2,3,4,2,3,4];
export const DARBUKA=['D','.','t','.','D','t','.','t'];  // baladi-ish pattern over eighths
export const RIDE=[1,0,1,1,1,0,1,1];               // spang-a-lang over eighths

/* --- lab: built-in presets (melodic minor descends differently — our step model knows direction) --- */
export const LAB_PRESETS=[
  {id:'p_harm', label:'variant.harmmin', pcs:[0,2,3,5,7,8,11]},
  {id:'p_mel',  label:'variant.melmin',  pcs:[0,2,3,5,7,9,11], down:[0,2,3,5,7,8,10]},
  {id:'p_dbl',  label:'variant.dblharm', pcs:[0,1,4,5,7,8,11]},
];

/* --- synthwave / lo-fi progressions --- */
export const SYNTH_PROG=[{root:0,ivs:[0,3,7]},{root:8,ivs:[0,4,7]},{root:3,ivs:[0,4,7]},{root:10,ivs:[0,4,7]}];   // i–VI–III–VII
export const LOFI_PROG=[{root:0,ivs:[0,3,7,10]},{root:5,ivs:[0,3,7,10]}];                                          // im7 → ivm7

/* --- jazz theory --- */
// daring levels: which beats snap to a chord tone, and how wide the window — inside (all beats) → outside (beat 1 only)
export const DARING={ inside:{beats:[0,1,2,3],win:0.28}, bebop:{beats:[0,2],win:0.22}, outside:{beats:[0],win:0.16} };
const IONIAN=[0,2,4,5,7,9,11],LYDIAN=[0,2,4,6,7,9,11],MIXO=[0,2,4,5,7,9,10],
      DORIAN=[0,2,3,5,7,9,10],AEOL=[0,2,3,5,7,8,10],LOCR2=[0,2,3,5,6,8,10],LOCR=[0,1,3,5,6,8,10],
      PHRDOM=[0,1,4,5,7,8,10],LYDDOM=[0,2,4,6,7,9,10],ALT=[0,1,3,4,6,8,10],WHOLE=[0,2,4,6,8,10],HW=[0,1,3,4,6,7,9,10];
export const QUAL={                                // ivs — comping; calm — diatonic; hot — with alterations
  m7:    {ivs:[0,3,7,10], calm:[[DORIAN,'scale.dorian']], hot:[[DORIAN,'scale.dorian'],[AEOL,'scale.aeolian']]},
  dom:   {ivs:[0,4,7,10], calm:[[MIXO,'scale.mixo']], hot:[[LYDDOM,'scale.lyddom'],[ALT,'scale.alt'],[WHOLE,'scale.whole']]},
  maj7:  {ivs:[0,4,7,11], calm:[[IONIAN,'scale.ionian']], hot:[[LYDIAN,'scale.lydian']]},
  maj7iv:{ivs:[0,4,7,11], calm:[[LYDIAN,'scale.lydian']], hot:[[LYDIAN,'scale.lydian']]},
  m7b5:  {ivs:[0,3,6,10], calm:[[LOCR2,'scale.locr2']], hot:[[LOCR,'scale.locr']]},
  domV:  {ivs:[0,4,7,10], calm:[[PHRDOM,'scale.phrdom']], hot:[[ALT,'scale.alt'],[HW,'scale.hw']]},   // dominant into minor
};
// golden sequence in C/Am, A7 — turnaround back to Dm7
export const JAZZ_PROG=[
  {root:2, sfx:'m7',  q:'m7'},  {root:7, sfx:'7',  q:'dom'},
  {root:0, sfx:'maj7',q:'maj7'},{root:5, sfx:'maj7',q:'maj7iv'},
  {root:11,sfx:'m7♭5',q:'m7b5'},{root:4, sfx:'7',  q:'domV'},
  {root:9, sfx:'m7',  q:'m7'},  {root:9, sfx:'7',  q:'domV'},
];
