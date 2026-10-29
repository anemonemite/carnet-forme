// ---------- données fixes de l'app : sports, catalogue d'exercices, modèles de séance ----------

export const SPORTS=[
  {id:"muscu",name:"Musculation"},
  {id:"natation",name:"Natation"},
  {id:"cyclisme",name:"Cyclisme"},
  {id:"boxe",name:"Punch boxing"},
  {id:"autre",name:"Autre"}
];
export const QUICK=[{name:"Shaker whey",g:25,kcal:113}];

export const DEFAULT_EX=["Développé couché","Développé incliné","Squat","Soulevé de terre","Tractions","Développé militaire","Rowing barre","Tirage vertical","Curl biceps","Extension triceps poulie","Dips","Presse à cuisses","Fentes","Élévations latérales","Leg curl"];

export const GROUPS=[["pecs","Pectoraux"],["dos","Dos"],["epaules","Épaules"],["biceps","Biceps"],["triceps","Triceps"],["jambes","Jambes"],["fessiers","Fessiers"],["mollets","Mollets"],["abdos","Abdos"],["autres","Autres"]];
export const EQUIP=[["barre","Barre"],["halteres","Haltères"],["machine","Machine"],["poulie","Poulie"],["pdc","Poids du corps"]];
// [nom, groupe, matériel, muscles travaillés, consignes]
export const CATALOG=[
["Développé couché","pecs","barre","Pectoraux, triceps, avant d'épaule",["Omoplates serrées et basses sur le banc","Barre qui touche le bas des pecs","Pieds bien ancrés au sol"]],
["Développé incliné","pecs","barre","Haut des pectoraux, épaules",["Banc réglé vers 30°","Descente contrôlée vers le haut du torse"]],
["Développé couché haltères","pecs","halteres","Pectoraux, triceps",["Plus d'amplitude qu'à la barre","Coudes à environ 45° du buste"]],
["Développé incliné haltères","pecs","halteres","Haut des pectoraux",["Banc entre 30 et 45°","Rapprocher les haltères en haut sans les cogner"]],
["Écarté haltères","pecs","halteres","Pectoraux",["Coudes légèrement fléchis et fixes","Descendre jusqu'à l'étirement, pas plus"]],
["Écarté poulie vis-à-vis","pecs","poulie","Pectoraux",["Buste légèrement penché en avant","Ramener les mains devant le bas des pecs"]],
["Pec deck","pecs","machine","Pectoraux",["Dos plaqué au dossier","Tenir une seconde en contraction"]],
["Dips","pecs","pdc","Bas des pectoraux, triceps",["Buste penché en avant pour cibler les pecs","Descendre jusqu'à épaules au niveau des coudes"]],
["Pompes","pecs","pdc","Pectoraux, triceps, gainage",["Corps aligné de la tête aux talons","Poitrine à un poing du sol"]],
["Tractions","dos","pdc","Grand dorsal, biceps",["Partir bras tendus","Menton au-dessus de la barre, sans élan"]],
["Tirage vertical","dos","poulie","Grand dorsal",["Tirer la barre vers le haut de la poitrine","Coudes vers le bas et l'arrière"]],
["Rowing barre","dos","barre","Épaisseur du dos, rhomboïdes",["Buste incliné vers 45°, dos neutre","Tirer la barre vers le nombril"]],
["Rowing haltère","dos","halteres","Grand dorsal",["Un genou et une main sur le banc","Tirer le coude vers la hanche"]],
["Tirage horizontal poulie","dos","poulie","Milieu du dos",["Buste droit, sans balancer","Serrer les omoplates en fin de tirage"]],
["Rowing machine","dos","machine","Milieu du dos",["Poitrine contre l'appui","Pause d'une seconde omoplates serrées"]],
["Pull-over poulie","dos","poulie","Grand dorsal",["Bras presque tendus","Ramener la barre jusqu'aux cuisses"]],
["Soulevé de terre","dos","barre","Toute la chaîne arrière",["Barre collée aux tibias","Dos neutre, pousser le sol avec les jambes"]],
["Développé militaire","epaules","barre","Épaules, triceps",["Gainer abdos et fessiers","La tête passe sous la barre en haut"]],
["Développé haltères assis","epaules","halteres","Épaules",["Dossier presque vertical","Ne pas cambrer le bas du dos"]],
["Élévations latérales","epaules","halteres","Milieu d'épaule",["Monter jusqu'à l'horizontale","Coudes légèrement fléchis, sans élan"]],
["Élévations latérales poulie","epaules","poulie","Milieu d'épaule",["Tension constante tout le mouvement","Un bras à la fois"]],
["Oiseau haltères","epaules","halteres","Arrière d'épaule",["Buste penché, dos plat","Ouvrir les bras sur les côtés"]],
["Face pull","epaules","poulie","Arrière d'épaule, coiffe des rotateurs",["Corde à hauteur du visage","Tirer en écartant les mains"]],
["Shrugs haltères","epaules","halteres","Trapèzes",["Hausser les épaules vers les oreilles","Pas de rotation des épaules"]],
["Curl barre","biceps","barre","Biceps",["Coudes fixes le long du corps","Pas de balancier du buste"]],
["Curl haltères","biceps","halteres","Biceps",["Tourner la paume vers le haut en montant","Descente lente et contrôlée"]],
["Curl marteau","biceps","halteres","Brachial, avant-bras",["Prise neutre, pouces vers le haut","Coudes immobiles"]],
["Curl incliné haltères","biceps","halteres","Biceps, longue portion",["Banc à 45°, bras pendants","Amplitude complète"]],
["Pupitre biceps machine","biceps","machine","Biceps",["Aisselles calées sur le pupitre","Ne pas verrouiller les coudes en bas"]],
["Extension triceps poulie","triceps","poulie","Triceps",["Coudes collés au buste","Tendre complètement les bras en bas"]],
["Barre au front","triceps","barre","Triceps",["Coudes serrés et pointés vers le plafond","Descendre la barre vers le front"]],
["Extension triceps au-dessus de la tête","triceps","halteres","Triceps, longue portion",["Un haltère tenu à deux mains","Coudes pointés vers le plafond"]],
["Développé couché prise serrée","triceps","barre","Triceps, pectoraux",["Mains à largeur d'épaules","Coudes le long du corps"]],
["Kickback triceps","triceps","halteres","Triceps",["Bras parallèle au sol","Tendre sans bouger l'épaule"]],
["Dips banc","triceps","pdc","Triceps",["Mains sur le banc derrière toi","Coudes vers l'arrière, pas sur les côtés"]],
["Squat","jambes","barre","Quadriceps, fessiers",["Genoux dans l'axe des pieds","Descendre au moins cuisses parallèles au sol"]],
["Presse à cuisses","jambes","machine","Quadriceps, fessiers",["Bas du dos plaqué au dossier","Ne pas verrouiller les genoux en haut"]],
["Hack squat","jambes","machine","Quadriceps",["Pieds bas sur la plateforme pour les quadris","Amplitude complète"]],
["Leg extension","jambes","machine","Quadriceps",["Tenir une seconde en haut","Descente lente"]],
["Leg curl","jambes","machine","Ischio-jambiers",["Hanches plaquées","Contrôler le retour"]],
["Soulevé de terre roumain","jambes","barre","Ischio-jambiers, fessiers",["Jambes presque tendues","Hanches vers l'arrière, barre le long des cuisses"]],
["Fentes","jambes","halteres","Quadriceps, fessiers",["Grand pas en avant","Genou arrière qui frôle le sol"]],
["Squat bulgare","jambes","halteres","Quadriceps, fessiers",["Pied arrière posé sur un banc","Buste un peu penché pour cibler les fessiers"]],
["Goblet squat","jambes","halteres","Quadriceps, fessiers",["Un haltère tenu contre la poitrine","Coudes entre les genoux en bas"]],
["Hip thrust","fessiers","barre","Fessiers",["Haut du dos appuyé sur le banc","Serrer les fessiers une seconde en haut"]],
["Abducteurs machine","fessiers","machine","Moyen fessier",["Buste légèrement penché en avant","Mouvement lent dans les deux sens"]],
["Kickback fessier poulie","fessiers","poulie","Fessiers",["Jambe qui part vers l'arrière","Pas de cambrure du bas du dos"]],
["Mollets debout machine","mollets","machine","Mollets",["Étirement complet en bas","Pause en haut"]],
["Mollets assis machine","mollets","machine","Soléaire",["Genoux à 90°","Amplitude complète"]],
["Crunch poulie","abdos","poulie","Grand droit",["À genoux, corde derrière la tête","Enrouler la colonne, pas tirer avec les bras"]],
["Relevés de jambes suspendu","abdos","pdc","Bas des abdos",["Pas de balancier","Enrouler le bassin en haut"]],
["Roue abdominale","abdos","pdc","Sangle abdominale",["Dos légèrement rond, jamais cambré","Aller aussi loin que tu contrôles"]],
["Gainage planche","abdos","pdc","Sangle abdominale",["Corps aligné, fessiers serrés","Note la durée en secondes dans le champ reps"]],
["Russian twist","abdos","pdc","Obliques",["Pieds décollés pour plus de difficulté","Rotation du buste, pas seulement des bras"]]
];

// rotation poussée / tirage / jambes : on choisit le bloc dont le groupe principal a le plus récupéré
export const TEMPLATES=[
  {id:"push",name:"Poussée",groups:[["pecs",2],["epaules",2],["triceps",1]]},
  {id:"pull",name:"Tirage",groups:[["dos",3],["biceps",2]]},
  {id:"legs",name:"Jambes",groups:[["jambes",3],["fessiers",1],["mollets",1]]}
];
