/*
 * Datos con los que arranca la aplicación la primera vez (o al restablecer).
 * Las fechas de caducidad se calculan al momento de cargar, a partir de la fecha actual.
 */
var DATOS_INICIALES = (function () {
  var indicaciones = [
    ['dolor', 'Dolor'],
    ['fiebre', 'Fiebre'],
    ['inflamacion', 'Inflamación'],
    ['colico_abdominal', 'Cólico abdominal'],
    ['colico_menstrual', 'Cólico menstrual'],
    ['acidez_reflujo', 'Acidez/reflujo'],
    ['gastritis', 'Gastritis'],
    ['diarrea', 'Diarrea'],
    ['deshidratacion', 'Deshidratación'],
    ['alergia_rinitis', 'Alergia/rinitis'],
    ['gripa', 'Síntomas de gripa'],
    ['tos_flema', 'Tos con flema'],
    ['infeccion_bacteriana', 'Infección bacteriana'],
    ['presion_alta', 'Presión arterial alta'],
    ['diabetes_t2', 'Diabetes tipo 2'],
    ['colesterol_alto', 'Colesterol alto'],
    ['hipotiroidismo', 'Hipotiroidismo'],
    ['hongos_piel', 'Hongos en piel'],
    ['parasitos', 'Parásitos intestinales'],
    ['nausea_mareo', 'Náusea/mareo']
  ].map(function (i) { return { id: i[0], nombre: i[1], activa: true }; });

  var preguntas = [
    { etiqueta: 'alergia_penicilinas', texto: '¿Es alérgico a penicilinas o cefalosporinas?', motivo: 'alergia a penicilinas o cefalosporinas' },
    { etiqueta: 'alergia_aines', texto: '¿Es alérgico o intolerante a antiinflamatorios, aspirina o metamizol?', motivo: 'alergia o intolerancia a antiinflamatorios, aspirina o metamizol' },
    { etiqueta: 'embarazo_lactancia', texto: '¿Está embarazada o en periodo de lactancia?', motivo: 'embarazo o lactancia' },
    { etiqueta: 'menor_12', texto: '¿El paciente es menor de 12 años?', motivo: 'paciente menor de 12 años' },
    { etiqueta: 'ulcera_gastritis', texto: '¿Tiene úlcera, gastritis o sangrado digestivo?', motivo: 'úlcera, gastritis o sangrado digestivo' },
    { etiqueta: 'anticoagulantes', texto: '¿Toma anticoagulantes?', motivo: 'toma anticoagulantes' },
    { etiqueta: 'renal_hepatica', texto: '¿Tiene enfermedad renal o hepática?', motivo: 'enfermedad renal o hepática' },
    { etiqueta: 'receta', texto: '¿Cuenta con receta médica?', motivo: 'requiere receta médica', tipo: 'receta' }
  ].map(function (p) {
    return { id: p.etiqueta, etiqueta: p.etiqueta, texto: p.texto, motivo: p.motivo, tipo: p.tipo || 'precaucion', activa: true };
  });

  // Laboratorios para productos genéricos (se asignan de forma rotativa).
  var LABS_GENERICOS = ['Laboratorios Alameda', 'Farmacéutica del Bajío', 'Genéricos Anáhuac', 'Laboratorios Sierra Madre'];
  var GEN = '*';

  var AINE = 'alergia_aines ulcera_gastritis anticoagulantes embarazo_lactancia renal_hepatica';
  var KETO = AINE + ' menor_12';
  var ASA = 'menor_12 alergia_aines ulcera_gastritis anticoagulantes embarazo_lactancia';

  // [id, nombre comercial, principio(s) activo(s), concentración, forma, laboratorio, tipo M/G,
  //  indicaciones, precauciones, receta 0/1, existencias, mínimo, precio, {cad: días hasta caducidad}]
  var productos = [
    // 1 · Paracetamol
    ['tempra500', 'Tempra 500 mg tabletas', 'Paracetamol', '500 mg', 'Tabletas', 'Reckitt', 'M', 'dolor fiebre', 'renal_hepatica', 0, 0, 10, 62],
    ['paracetamol500', 'Paracetamol 500 mg tabletas', 'Paracetamol', '500 mg', 'Tabletas', GEN, 'G', 'dolor fiebre', 'renal_hepatica', 0, 4, 15, 22],
    ['tylenol500', 'Tylenol 500 mg tabletas', 'Paracetamol', '500 mg', 'Tabletas', 'Kenvue', 'M', 'dolor fiebre', 'renal_hepatica', 0, 18, 6, 78],
    ['tempraInfantil', 'Tempra Infantil suspensión 160 mg/5 mL', 'Paracetamol', '160 mg/5 mL', 'Suspensión oral', 'Reckitt', 'M', 'dolor fiebre', 'renal_hepatica', 0, 9, 4, 95, { cad: 38 }],
    // 2 · Ibuprofeno
    ['motrin400', 'Motrin 400 mg tabletas', 'Ibuprofeno', '400 mg', 'Tabletas', 'Kenvue', 'M', 'dolor fiebre inflamacion', AINE, 0, 0, 8, 89],
    ['ibuprofeno400', 'Ibuprofeno 400 mg tabletas', 'Ibuprofeno', '400 mg', 'Tabletas', GEN, 'G', 'dolor fiebre inflamacion', AINE, 0, 40, 12, 28],
    ['ibuprofenoSusp', 'Ibuprofeno suspensión 100 mg/5 mL', 'Ibuprofeno', '100 mg/5 mL', 'Suspensión oral', GEN, 'G', 'dolor fiebre inflamacion', AINE, 0, 7, 4, 45, { cad: 44 }],
    // 3 · Naproxeno
    ['flanax275', 'Flanax 275 mg tabletas', 'Naproxeno sódico', '275 mg', 'Tabletas', 'Bayer', 'M', 'dolor inflamacion colico_menstrual', AINE, 0, 14, 6, 85],
    ['naproxeno275', 'Naproxeno sódico 275 mg tabletas', 'Naproxeno sódico', '275 mg', 'Tabletas', GEN, 'G', 'dolor inflamacion colico_menstrual', AINE, 0, 30, 10, 30],
    ['flanax550', 'Flanax 550 mg tabletas', 'Naproxeno sódico', '550 mg', 'Tabletas', 'Bayer', 'M', 'dolor inflamacion colico_menstrual', AINE, 0, 10, 4, 135],
    // 4 · Ácido acetilsalicílico
    ['aspirina500', 'Aspirina 500 mg tabletas', 'Ácido acetilsalicílico', '500 mg', 'Tabletas', 'Bayer', 'M', 'dolor fiebre', ASA, 0, 22, 8, 48],
    ['asa500', 'Ácido acetilsalicílico 500 mg tabletas', 'Ácido acetilsalicílico', '500 mg', 'Tabletas', GEN, 'G', 'dolor fiebre', ASA, 0, 35, 10, 18],
    // 5 · Metamizol
    ['neomelubrina500', 'Neo-Melubrina 500 mg tabletas', 'Metamizol sódico', '500 mg', 'Tabletas', 'Opella', 'M', 'dolor fiebre', 'alergia_aines embarazo_lactancia', 0, 16, 6, 78],
    ['metamizol500', 'Metamizol sódico 500 mg tabletas', 'Metamizol sódico', '500 mg', 'Tabletas', GEN, 'G', 'dolor fiebre', 'alergia_aines embarazo_lactancia', 0, 28, 10, 25],
    // 6 · Ketorolaco
    ['dolac10', 'Dolac 10 mg tabletas', 'Ketorolaco trometamina', '10 mg', 'Tabletas', '', 'M', 'dolor', KETO, 1, 12, 5, 145],
    ['ketorolaco10', 'Ketorolaco 10 mg tabletas', 'Ketorolaco trometamina', '10 mg', 'Tabletas', GEN, 'G', 'dolor', KETO, 1, 25, 8, 35],
    ['supradol10', 'Supradol 10 mg tabletas', 'Ketorolaco trometamina', '10 mg', 'Tabletas', 'Liomont', 'M', 'dolor', KETO, 1, 11, 4, 110],
    // 7 · Diclofenaco
    ['voltaren50', 'Voltaren 50 mg grageas', 'Diclofenaco sódico', '50 mg', 'Grageas', 'Novartis', 'M', 'dolor inflamacion', AINE, 0, 15, 6, 120],
    ['diclofenaco50', 'Diclofenaco sódico 50 mg grageas', 'Diclofenaco sódico', '50 mg', 'Grageas', GEN, 'G', 'dolor inflamacion', AINE, 0, 40, 12, 25],
    ['voltarenGel', 'Voltaren Emulgel 1% gel', 'Diclofenaco', '1%', 'Gel tópico', 'Haleon', 'M', 'dolor inflamacion', 'alergia_aines embarazo_lactancia', 0, 9, 4, 165],
    // 8 · Diclofenaco + complejo B
    ['doloneurobion', 'Dolo-Neurobión tabletas', 'Diclofenaco + tiamina + piridoxina + cianocobalamina', '50 mg / 50 mg / 50 mg / 0.25 mg', 'Tabletas', 'P&G Health', 'M', 'dolor inflamacion', AINE, 0, 12, 5, 195],
    ['diclofenacoB', 'Diclofenaco con complejo B tabletas', 'Diclofenaco + tiamina + piridoxina + cianocobalamina', '50 mg / 50 mg / 50 mg / 0.25 mg', 'Tabletas', GEN, 'G', 'dolor inflamacion', AINE, 0, 20, 6, 85],
    // 9 · Butilhioscina
    ['buscapina10', 'Buscapina 10 mg grageas', 'Butilhioscina', '10 mg', 'Grageas', 'Opella', 'M', 'colico_abdominal', 'embarazo_lactancia', 0, 0, 8, 98],
    ['butilhioscina10', 'Butilhioscina 10 mg grageas', 'Butilhioscina', '10 mg', 'Grageas', GEN, 'G', 'colico_abdominal', 'embarazo_lactancia', 0, 24, 8, 35],
    ['buscapinaComp', 'Buscapina Compositum grageas', 'Butilhioscina + metamizol sódico', '10 mg / 250 mg', 'Grageas', 'Opella', 'M', 'colico_abdominal dolor', 'embarazo_lactancia alergia_aines', 0, 13, 5, 135],
    // 10 · Magaldrato
    ['riopanSusp', 'Riopan suspensión', 'Magaldrato', '800 mg/10 mL', 'Suspensión oral', 'Takeda', 'M', 'acidez_reflujo gastritis', 'renal_hepatica', 0, 10, 4, 135],
    ['magaldratoSusp', 'Magaldrato suspensión 800 mg/10 mL', 'Magaldrato', '800 mg/10 mL', 'Suspensión oral', GEN, 'G', 'acidez_reflujo gastritis', 'renal_hepatica', 0, 18, 6, 70],
    ['riopanTab', 'Riopan tabletas masticables 800 mg', 'Magaldrato', '800 mg', 'Tabletas masticables', 'Takeda', 'M', 'acidez_reflujo gastritis', 'renal_hepatica', 0, 12, 4, 110],
    ['riopanPlus', 'Riopan Plus suspensión', 'Magaldrato + dimeticona', '800 mg / 60 mg por 10 mL', 'Suspensión oral', 'Takeda', 'M', 'acidez_reflujo gastritis', 'renal_hepatica', 0, 8, 4, 150],
    ['meloxSusp', 'Melox suspensión', 'Hidróxido de aluminio + hidróxido de magnesio', '3.7 g / 4 g por 100 mL', 'Suspensión oral', 'Opella', 'M', 'acidez_reflujo gastritis', 'renal_hepatica', 0, 14, 5, 105],
    // 11 · Esomeprazol
    ['nexium40', 'Nexium 40 mg tabletas', 'Esomeprazol', '40 mg', 'Tabletas', 'AstraZeneca', 'M', 'acidez_reflujo gastritis', '', 1, 0, 4, 520],
    ['esomeprazol40', 'Esomeprazol 40 mg tabletas', 'Esomeprazol', '40 mg', 'Tabletas', GEN, 'G', 'acidez_reflujo gastritis', '', 1, 15, 5, 180],
    ['nexium20', 'Nexium 20 mg tabletas', 'Esomeprazol', '20 mg', 'Tabletas', 'AstraZeneca', 'M', 'acidez_reflujo gastritis', '', 1, 6, 3, 380],
    ['omeprazol20', 'Omeprazol 20 mg cápsulas', 'Omeprazol', '20 mg', 'Cápsulas', GEN, 'G', 'acidez_reflujo gastritis', '', 0, 5, 20, 45],
    ['pantozol40', 'Pantozol 40 mg tabletas', 'Pantoprazol', '40 mg', 'Tabletas', 'Takeda', 'M', 'acidez_reflujo gastritis', '', 1, 8, 3, 480],
    // 12 · Loperamida
    ['imodium2', 'Imodium 2 mg cápsulas', 'Loperamida', '2 mg', 'Cápsulas', 'Kenvue', 'M', 'diarrea', 'menor_12 embarazo_lactancia', 0, 14, 5, 95],
    ['loperamida2', 'Loperamida 2 mg cápsulas', 'Loperamida', '2 mg', 'Cápsulas', GEN, 'G', 'diarrea', 'menor_12 embarazo_lactancia', 0, 22, 8, 30],
    // 13 · Electrolitos orales
    ['electrolit', 'Electrolit 625 mL', 'Solución de electrolitos orales', '625 mL', 'Solución oral', 'Pisa', 'M', 'deshidratacion diarrea', '', 0, 0, 24, 28],
    ['vidaSuero', 'Vida Suero Oral sobres', 'Sales de rehidratación oral', '27.9 g', 'Polvo para solución (sobre)', '', 'M', 'deshidratacion diarrea', '', 0, 30, 10, 14],
    ['sueroGen', 'Suero oral sobres', 'Sales de rehidratación oral', '27.9 g', 'Polvo para solución (sobre)', GEN, 'G', 'deshidratacion diarrea', '', 0, 50, 15, 9],
    // 14 · Loratadina
    ['clarityne10', 'Clarityne 10 mg tabletas', 'Loratadina', '10 mg', 'Tabletas', 'Bayer', 'M', 'alergia_rinitis', '', 0, 0, 6, 165],
    ['loratadina10', 'Loratadina 10 mg tabletas', 'Loratadina', '10 mg', 'Tabletas', GEN, 'G', 'alergia_rinitis', '', 0, 3, 12, 30],
    ['claritynejarabe', 'Clarityne jarabe 5 mg/5 mL', 'Loratadina', '5 mg/5 mL', 'Jarabe', 'Bayer', 'M', 'alergia_rinitis', '', 0, 7, 3, 175],
    ['zyrtec10', 'Zyrtec 10 mg tabletas', 'Cetirizina', '10 mg', 'Tabletas', '', 'M', 'alergia_rinitis', '', 0, 10, 4, 150],
    // 15 · Fexofenadina
    ['allegra120', 'Allegra 120 mg tabletas', 'Fexofenadina', '120 mg', 'Tabletas', 'Opella', 'M', 'alergia_rinitis', '', 0, 11, 4, 210],
    ['fexofenadina120', 'Fexofenadina 120 mg tabletas', 'Fexofenadina', '120 mg', 'Tabletas', GEN, 'G', 'alergia_rinitis', '', 0, 16, 5, 80],
    ['allegra180', 'Allegra 180 mg tabletas', 'Fexofenadina', '180 mg', 'Tabletas', 'Opella', 'M', 'alergia_rinitis', '', 0, 8, 3, 260],
    // 16 · Clorfenamina
    ['clorotrimeton4', 'Clorotrimeton 4 mg tabletas', 'Clorfenamina', '4 mg', 'Tabletas', 'Bayer', 'M', 'alergia_rinitis gripa', 'embarazo_lactancia', 0, 15, 5, 55],
    ['clorfenamina4', 'Clorfenamina 4 mg tabletas', 'Clorfenamina', '4 mg', 'Tabletas', GEN, 'G', 'alergia_rinitis gripa', 'embarazo_lactancia', 0, 30, 10, 18],
    // 17 · Ambroxol
    ['mucosolvan', 'Mucosolvan jarabe adulto', 'Ambroxol', '30 mg/5 mL', 'Jarabe', 'Opella', 'M', 'tos_flema', 'embarazo_lactancia', 0, 12, 4, 115],
    ['ambroxolAdulto', 'Ambroxol jarabe adulto 30 mg/5 mL', 'Ambroxol', '30 mg/5 mL', 'Jarabe', GEN, 'G', 'tos_flema', 'embarazo_lactancia', 0, 8, 4, 45, { cad: 49 }],
    ['ambroxolPed', 'Ambroxol jarabe pediátrico 15 mg/5 mL', 'Ambroxol', '15 mg/5 mL', 'Jarabe', GEN, 'G', 'tos_flema', 'embarazo_lactancia', 0, 10, 4, 40],
    ['bisolvon', 'Bisolvon jarabe', 'Bromhexina', '8 mg/5 mL', 'Jarabe', 'Opella', 'M', 'tos_flema', 'embarazo_lactancia', 0, 9, 4, 105],
    // 18 · Amoxicilina
    ['amoxil500', 'Amoxil 500 mg cápsulas', 'Amoxicilina', '500 mg', 'Cápsulas', 'GSK', 'M', 'infeccion_bacteriana', 'alergia_penicilinas', 1, 0, 6, 210],
    ['amoxicilina500', 'Amoxicilina 500 mg cápsulas', 'Amoxicilina', '500 mg', 'Cápsulas', GEN, 'G', 'infeccion_bacteriana', 'alergia_penicilinas', 1, 30, 10, 65],
    ['amoxicilinaSusp', 'Amoxicilina suspensión 250 mg/5 mL', 'Amoxicilina', '250 mg/5 mL', 'Polvo para suspensión', GEN, 'G', 'infeccion_bacteriana', 'alergia_penicilinas', 1, 9, 4, 55, { cad: 54 }],
    // 19 · Amoxicilina + ácido clavulánico
    ['augmentin875', 'Augmentin 875/125 mg tabletas', 'Amoxicilina + ácido clavulánico', '875 mg / 125 mg', 'Tabletas', 'GSK', 'M', 'infeccion_bacteriana', 'alergia_penicilinas renal_hepatica', 1, 9, 4, 420],
    ['amoxiclav875', 'Amoxicilina/ácido clavulánico 875/125 mg tabletas', 'Amoxicilina + ácido clavulánico', '875 mg / 125 mg', 'Tabletas', GEN, 'G', 'infeccion_bacteriana', 'alergia_penicilinas renal_hepatica', 1, 14, 5, 180],
    ['amoxiclavSusp', 'Amoxicilina/ácido clavulánico suspensión 400/57 mg/5 mL', 'Amoxicilina + ácido clavulánico', '400 mg / 57 mg por 5 mL', 'Polvo para suspensión', GEN, 'G', 'infeccion_bacteriana', 'alergia_penicilinas renal_hepatica', 1, 7, 3, 160],
    // 20 · Azitromicina
    ['zithromax500', 'Zithromax 500 mg tabletas', 'Azitromicina', '500 mg', 'Tabletas', 'Pfizer', 'M', 'infeccion_bacteriana', 'renal_hepatica', 1, 8, 3, 380],
    ['azitromicina500', 'Azitromicina 500 mg tabletas', 'Azitromicina', '500 mg', 'Tabletas', GEN, 'G', 'infeccion_bacteriana', 'renal_hepatica', 1, 20, 6, 95],
    ['azitromicinaSusp', 'Azitromicina suspensión 200 mg/5 mL', 'Azitromicina', '200 mg/5 mL', 'Polvo para suspensión', GEN, 'G', 'infeccion_bacteriana', 'renal_hepatica', 1, 8, 3, 120],
    // 21 · Ciprofloxacino
    ['ciproxina500', 'Ciproxina 500 mg tabletas', 'Ciprofloxacino', '500 mg', 'Tabletas', 'Bayer', 'M', 'infeccion_bacteriana', 'embarazo_lactancia menor_12', 1, 7, 3, 350],
    ['ciprofloxacino500', 'Ciprofloxacino 500 mg tabletas', 'Ciprofloxacino', '500 mg', 'Tabletas', GEN, 'G', 'infeccion_bacteriana', 'embarazo_lactancia menor_12', 1, 25, 8, 60],
    // 22 · Cefalexina
    ['keflex500', 'Keflex 500 mg cápsulas', 'Cefalexina', '500 mg', 'Cápsulas', '', 'M', 'infeccion_bacteriana', 'alergia_penicilinas', 1, 6, 3, 240],
    ['cefalexina500', 'Cefalexina 500 mg cápsulas', 'Cefalexina', '500 mg', 'Cápsulas', GEN, 'G', 'infeccion_bacteriana', 'alergia_penicilinas', 1, 20, 6, 70],
    ['cefalexinaSusp', 'Cefalexina suspensión 250 mg/5 mL', 'Cefalexina', '250 mg/5 mL', 'Polvo para suspensión', GEN, 'G', 'infeccion_bacteriana', 'alergia_penicilinas', 1, 8, 3, 85],
    // 23 · Losartán
    ['cozaar50', 'Cozaar 50 mg tabletas', 'Losartán potásico', '50 mg', 'Tabletas', 'Organon', 'M', 'presion_alta', 'embarazo_lactancia renal_hepatica', 1, 0, 5, 480],
    ['losartan50', 'Losartán potásico 50 mg tabletas', 'Losartán potásico', '50 mg', 'Tabletas', GEN, 'G', 'presion_alta', 'embarazo_lactancia renal_hepatica', 1, 0, 10, 60],
    ['micardis40', 'Micardis 40 mg tabletas', 'Telmisartán', '40 mg', 'Tabletas', 'Boehringer Ingelheim', 'M', 'presion_alta', 'embarazo_lactancia renal_hepatica', 1, 9, 3, 520],
    ['renitec10', 'Renitec 10 mg tabletas', 'Enalapril', '10 mg', 'Tabletas', 'Organon', 'M', 'presion_alta', 'embarazo_lactancia renal_hepatica', 1, 12, 4, 230],
    // 24 · Amlodipino
    ['norvas5', 'Norvas 5 mg tabletas', 'Amlodipino', '5 mg', 'Tabletas', 'Viatris', 'M', 'presion_alta', '', 1, 10, 4, 410],
    ['amlodipino5', 'Amlodipino 5 mg tabletas', 'Amlodipino', '5 mg', 'Tabletas', GEN, 'G', 'presion_alta', '', 1, 30, 10, 45],
    ['amlodipino10', 'Amlodipino 10 mg tabletas', 'Amlodipino', '10 mg', 'Tabletas', GEN, 'G', 'presion_alta', '', 1, 20, 6, 70],
    // 25 · Metformina
    ['dabex850', 'Dabex 850 mg tabletas', 'Metformina', '850 mg', 'Tabletas', 'Merck', 'M', 'diabetes_t2', 'renal_hepatica', 1, 14, 5, 120],
    ['metformina850', 'Metformina 850 mg tabletas', 'Metformina', '850 mg', 'Tabletas', GEN, 'G', 'diabetes_t2', 'renal_hepatica', 1, 40, 12, 35],
    ['glucophage850', 'Glucophage 850 mg tabletas', 'Metformina', '850 mg', 'Tabletas', 'Merck', 'M', 'diabetes_t2', 'renal_hepatica', 1, 10, 4, 150],
    ['metformina500', 'Metformina 500 mg tabletas', 'Metformina', '500 mg', 'Tabletas', GEN, 'G', 'diabetes_t2', 'renal_hepatica', 1, 30, 10, 30],
    // 26 · Atorvastatina
    ['lipitor20', 'Lipitor 20 mg tabletas', 'Atorvastatina', '20 mg', 'Tabletas', 'Viatris', 'M', 'colesterol_alto', 'embarazo_lactancia renal_hepatica', 1, 8, 3, 620],
    ['atorvastatina20', 'Atorvastatina 20 mg tabletas', 'Atorvastatina', '20 mg', 'Tabletas', GEN, 'G', 'colesterol_alto', 'embarazo_lactancia renal_hepatica', 1, 25, 8, 90],
    ['atorvastatina40', 'Atorvastatina 40 mg tabletas', 'Atorvastatina', '40 mg', 'Tabletas', GEN, 'G', 'colesterol_alto', 'embarazo_lactancia renal_hepatica', 1, 15, 5, 140],
    ['simvastatina20', 'Simvastatina 20 mg tabletas', 'Simvastatina', '20 mg', 'Tabletas', GEN, 'G', 'colesterol_alto', 'embarazo_lactancia renal_hepatica', 1, 20, 6, 55],
    // 27 · Levotiroxina
    ['eutirox100', 'Eutirox 100 mcg tabletas', 'Levotiroxina sódica', '100 mcg', 'Tabletas', 'Merck', 'M', 'hipotiroidismo', '', 1, 12, 4, 95],
    ['levotiroxina100', 'Levotiroxina sódica 100 mcg tabletas', 'Levotiroxina sódica', '100 mcg', 'Tabletas', GEN, 'G', 'hipotiroidismo', '', 1, 20, 6, 55],
    ['eutirox50', 'Eutirox 50 mcg tabletas', 'Levotiroxina sódica', '50 mcg', 'Tabletas', 'Merck', 'M', 'hipotiroidismo', '', 1, 10, 4, 80],
    // 28 · Clotrimazol
    ['canesten', 'Canesten crema 1%', 'Clotrimazol', '1%', 'Crema', 'Bayer', 'M', 'hongos_piel', '', 0, 10, 4, 95],
    ['clotrimazolCrema', 'Clotrimazol crema 1%', 'Clotrimazol', '1%', 'Crema', GEN, 'G', 'hongos_piel', '', 0, 18, 6, 35],
    ['lamisilCrema', 'Lamisil crema 1%', 'Terbinafina', '1%', 'Crema', '', 'M', 'hongos_piel', '', 0, 7, 3, 160],
    // 29 · Mebendazol
    ['vermox100', 'Vermox 100 mg tabletas', 'Mebendazol', '100 mg', 'Tabletas', '', 'M', 'parasitos', 'embarazo_lactancia', 0, 10, 4, 70],
    ['mebendazol100', 'Mebendazol 100 mg tabletas', 'Mebendazol', '100 mg', 'Tabletas', GEN, 'G', 'parasitos', 'embarazo_lactancia', 0, 25, 8, 25],
    ['vermoxSusp', 'Vermox suspensión 100 mg/5 mL', 'Mebendazol', '100 mg/5 mL', 'Suspensión oral', '', 'M', 'parasitos', 'embarazo_lactancia', 0, 7, 3, 85],
    ['zentel400', 'Zentel 400 mg tabletas', 'Albendazol', '400 mg', 'Tabletas', 'GSK', 'M', 'parasitos', 'embarazo_lactancia', 0, 9, 3, 85],
    // 30 · Dimenhidrinato
    ['dramamine50', 'Dramamine 50 mg tabletas', 'Dimenhidrinato', '50 mg', 'Tabletas', '', 'M', 'nausea_mareo', 'embarazo_lactancia', 0, 12, 4, 60],
    ['dimenhidrinato50', 'Dimenhidrinato 50 mg tabletas', 'Dimenhidrinato', '50 mg', 'Tabletas', GEN, 'G', 'nausea_mareo', 'embarazo_lactancia', 0, 25, 8, 22]
  ];

  // [producto A, producto B, tipo, nota]. Las relaciones repetidas en sentido inverso se ignoran.
  var relaciones = [
    ['tempra500', 'paracetamol500', 'G'], ['tempra500', 'tylenol500', 'G'], ['tempra500', 'tempraInfantil', 'P'], ['tempra500', 'motrin400', 'T'],
    ['motrin400', 'ibuprofeno400', 'G'], ['motrin400', 'ibuprofenoSusp', 'P'], ['motrin400', 'flanax275', 'T'],
    ['flanax275', 'naproxeno275', 'G'], ['flanax275', 'flanax550', 'P'], ['flanax275', 'motrin400', 'T'],
    ['aspirina500', 'asa500', 'G'], ['aspirina500', 'tempra500', 'T'],
    ['neomelubrina500', 'metamizol500', 'G'], ['neomelubrina500', 'tempra500', 'T'],
    ['dolac10', 'ketorolaco10', 'G'], ['dolac10', 'supradol10', 'G'], ['dolac10', 'motrin400', 'T'],
    ['voltaren50', 'diclofenaco50', 'G'], ['voltaren50', 'voltarenGel', 'P'], ['voltaren50', 'doloneurobion', 'C'], ['voltaren50', 'flanax275', 'T'],
    ['doloneurobion', 'diclofenacoB', 'G'], ['doloneurobion', 'voltaren50', 'C'],
    ['buscapina10', 'butilhioscina10', 'G'], ['buscapina10', 'buscapinaComp', 'C'],
    ['riopanSusp', 'magaldratoSusp', 'G'], ['riopanSusp', 'riopanTab', 'P'], ['riopanSusp', 'riopanPlus', 'C'], ['riopanSusp', 'meloxSusp', 'T'],
    ['nexium40', 'esomeprazol40', 'G'], ['nexium40', 'nexium20', 'P'], ['nexium40', 'omeprazol20', 'T'], ['nexium40', 'pantozol40', 'T'],
    ['imodium2', 'loperamida2', 'G'],
    ['electrolit', 'vidaSuero', 'T'], ['electrolit', 'sueroGen', 'T'],
    ['clarityne10', 'loratadina10', 'G'], ['clarityne10', 'claritynejarabe', 'P'], ['clarityne10', 'allegra120', 'T'], ['clarityne10', 'zyrtec10', 'T'],
    ['allegra120', 'fexofenadina120', 'G'], ['allegra120', 'allegra180', 'P'], ['allegra120', 'clarityne10', 'T'],
    ['clorotrimeton4', 'clorfenamina4', 'G'], ['clorotrimeton4', 'clarityne10', 'T'],
    ['mucosolvan', 'ambroxolAdulto', 'G'], ['mucosolvan', 'ambroxolPed', 'P'], ['mucosolvan', 'bisolvon', 'T'],
    ['amoxil500', 'amoxicilina500', 'G'], ['amoxil500', 'amoxicilinaSusp', 'P'], ['amoxil500', 'augmentin875', 'C'],
    ['augmentin875', 'amoxiclav875', 'G'], ['augmentin875', 'amoxiclavSusp', 'P'],
    ['zithromax500', 'azitromicina500', 'G'], ['zithromax500', 'azitromicinaSusp', 'P'],
    ['ciproxina500', 'ciprofloxacino500', 'G'],
    ['keflex500', 'cefalexina500', 'G'], ['keflex500', 'cefalexinaSusp', 'P'],
    ['cozaar50', 'losartan50', 'G'], ['cozaar50', 'micardis40', 'T'], ['cozaar50', 'renitec10', 'T'],
    ['norvas5', 'amlodipino5', 'G'], ['norvas5', 'amlodipino10', 'P'],
    ['dabex850', 'metformina850', 'G'], ['dabex850', 'glucophage850', 'G'], ['dabex850', 'metformina500', 'P'],
    ['lipitor20', 'atorvastatina20', 'G'], ['lipitor20', 'atorvastatina40', 'P'], ['lipitor20', 'simvastatina20', 'T'],
    ['eutirox100', 'levotiroxina100', 'G', 'El cambio de marca requiere seguimiento médico'], ['eutirox100', 'eutirox50', 'P'],
    ['canesten', 'clotrimazolCrema', 'G'], ['canesten', 'lamisilCrema', 'T'],
    ['vermox100', 'mebendazol100', 'G'], ['vermox100', 'vermoxSusp', 'P'], ['vermox100', 'zentel400', 'T'],
    ['dramamine50', 'dimenhidrinato50', 'G']
  ];

  /* Construye un estado completo a partir de la fecha de hoy. */
  function construir(hoy) {
    hoy = hoy || new Date();
    function sumarDias(n) {
      var d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + n);
      return aIso(d);
    }
    function sumarMeses(n) {
      var d = new Date(hoy.getFullYear(), hoy.getMonth() + n, 1);
      // Último día del mes, como suelen indicar los empaques.
      d = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return aIso(d);
    }
    function aIso(d) {
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    var anio = String(hoy.getFullYear()).slice(2);
    var labIdx = 0;
    var lista = productos.map(function (r, i) {
      var extra = r[13] || {};
      var lab = r[5] === GEN ? LABS_GENERICOS[(labIdx++) % LABS_GENERICOS.length] : r[5];
      return {
        id: r[0],
        sku: 'SR-' + (1001 + i),
        nombre: r[1],
        activos: r[2],
        concentracion: r[3],
        forma: r[4],
        laboratorio: lab,
        tipo: r[6] === 'G' ? 'generico' : 'marca',
        indicaciones: r[7] ? r[7].split(' ') : [],
        precauciones: r[8] ? r[8].split(' ') : [],
        receta: !!r[9],
        existencias: r[10],
        minimo: r[11],
        precio: r[12],
        lote: 'L' + anio + String(1000 + ((i * 397 + 211) % 9000)),
        caducidad: extra.cad ? sumarDias(extra.cad) : sumarMeses(8 + ((i * 7) % 22))
      };
    });

    var vistos = {};
    var rels = [];
    relaciones.forEach(function (r) {
      var clave = [r[0], r[1]].sort().join('|');
      if (vistos[clave]) return;
      vistos[clave] = true;
      rels.push({ id: 'r' + String(rels.length + 1).padStart(3, '0'), a: r[0], b: r[1], tipo: r[2], nota: r[3] || '' });
    });

    return {
      version: 1,
      creado: new Date().toISOString(),
      actualizado: new Date().toISOString(),
      indicaciones: JSON.parse(JSON.stringify(indicaciones)),
      preguntas: JSON.parse(JSON.stringify(preguntas)),
      productos: lista,
      relaciones: rels
    };
  }

  return { construir: construir };
})();
