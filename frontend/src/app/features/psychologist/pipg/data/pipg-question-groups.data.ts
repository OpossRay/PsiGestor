/**
 * Reactivos P-IPG transcritos del Excel original.
 * Orden vertical: J (9 grupos), G (9), D (10), A (10).
 * Cada grupo contiene cuatro reactivos consecutivos de una misma columna.
 */
export interface PipgOption {
  id: string;
  sourceColumn: 'J' | 'G' | 'D' | 'A';
  text: string;
  plusCell: string;
  minusCell: string;
}

export interface PipgQuestionGroup {
  id: number;
  part: string;
  options: PipgOption[];
}

export const PIPG_QUESTION_GROUPS: PipgQuestionGroup[] = [
  {
    "id": 1,
    "part": "PARTE 1",
    "options": [
      {
        "id": "J7",
        "sourceColumn": "J",
        "text": "es bastante sociable",
        "plusCell": "K7",
        "minusCell": "L7"
      },
      {
        "id": "J8",
        "sourceColumn": "J",
        "text": "le falta confianza en sí mismo (a)",
        "plusCell": "K8",
        "minusCell": "L8"
      },
      {
        "id": "J9",
        "sourceColumn": "J",
        "text": "es perfeccionista con cualquier trabajo que realiza",
        "plusCell": "K9",
        "minusCell": "L9"
      },
      {
        "id": "J10",
        "sourceColumn": "J",
        "text": "tiende a ser algo emocional",
        "plusCell": "K10",
        "minusCell": "L10"
      }
    ]
  },
  {
    "id": 2,
    "part": "PARTE 1",
    "options": [
      {
        "id": "J11",
        "sourceColumn": "J",
        "text": "no le interesa estar con otras personas",
        "plusCell": "K11",
        "minusCell": "L11"
      },
      {
        "id": "J12",
        "sourceColumn": "J",
        "text": "se siente libre de ansiedades y tensiones",
        "plusCell": "K12",
        "minusCell": "L12"
      },
      {
        "id": "J13",
        "sourceColumn": "J",
        "text": "es una persona poco confiable",
        "plusCell": "K13",
        "minusCell": "L13"
      },
      {
        "id": "J14",
        "sourceColumn": "J",
        "text": "toma la conducción de discusiones de grupo",
        "plusCell": "K14",
        "minusCell": "L14"
      }
    ]
  },
  {
    "id": 3,
    "part": "PARTE 1",
    "options": [
      {
        "id": "J15",
        "sourceColumn": "J",
        "text": "actúa de manera nerviosa e inestable",
        "plusCell": "K15",
        "minusCell": "L15"
      },
      {
        "id": "J16",
        "sourceColumn": "J",
        "text": "tiene una gran influencia sobre los demás",
        "plusCell": "K16",
        "minusCell": "L16"
      },
      {
        "id": "J17",
        "sourceColumn": "J",
        "text": "no le gustan las reuniones sociales",
        "plusCell": "K17",
        "minusCell": "L17"
      },
      {
        "id": "J18",
        "sourceColumn": "J",
        "text": "es un(a) trabajador(a) muy persistente y formal",
        "plusCell": "K18",
        "minusCell": "L18"
      }
    ]
  },
  {
    "id": 4,
    "part": "PARTE 1",
    "options": [
      {
        "id": "J19",
        "sourceColumn": "J",
        "text": "se le facilita hacer nuevas amistades",
        "plusCell": "K19",
        "minusCell": "L19"
      },
      {
        "id": "J20",
        "sourceColumn": "J",
        "text": "no puede realizar la misma tarea por mucho tiempo",
        "plusCell": "K20",
        "minusCell": "L20"
      },
      {
        "id": "J21",
        "sourceColumn": "J",
        "text": "es fácilmente manejado(a) por los demás",
        "plusCell": "K21",
        "minusCell": "L21"
      },
      {
        "id": "J22",
        "sourceColumn": "J",
        "text": "mantiene el autocontrol aún si está frustrado(a)",
        "plusCell": "K22",
        "minusCell": "L22"
      }
    ]
  },
  {
    "id": 5,
    "part": "PARTE 1",
    "options": [
      {
        "id": "J23",
        "sourceColumn": "J",
        "text": "es capaz de tomar decisiones importantes sin ayuda",
        "plusCell": "K23",
        "minusCell": "L23"
      },
      {
        "id": "J24",
        "sourceColumn": "J",
        "text": "no se relaciona fácilmente con gente desconocida",
        "plusCell": "K24",
        "minusCell": "L24"
      },
      {
        "id": "J25",
        "sourceColumn": "J",
        "text": "tiende a sentirse tenso(a) o muy presionado(a)",
        "plusCell": "K25",
        "minusCell": "L25"
      },
      {
        "id": "J26",
        "sourceColumn": "J",
        "text": "concluye su trabajo a pesar de los problemas",
        "plusCell": "K26",
        "minusCell": "L26"
      }
    ]
  },
  {
    "id": 6,
    "part": "PARTE 1",
    "options": [
      {
        "id": "J27",
        "sourceColumn": "J",
        "text": "no le interesa mucho ser sociable",
        "plusCell": "K27",
        "minusCell": "L27"
      },
      {
        "id": "J28",
        "sourceColumn": "J",
        "text": "no toma en serio sus responsabilidades",
        "plusCell": "K28",
        "minusCell": "L28"
      },
      {
        "id": "J29",
        "sourceColumn": "J",
        "text": "se mantiene estable y sereno(a)",
        "plusCell": "K29",
        "minusCell": "L29"
      },
      {
        "id": "J30",
        "sourceColumn": "J",
        "text": "toma el mando en actividades de grupo",
        "plusCell": "K30",
        "minusCell": "L30"
      }
    ]
  },
  {
    "id": 7,
    "part": "PARTE 1",
    "options": [
      {
        "id": "J31",
        "sourceColumn": "J",
        "text": "es una persona en quien se puede confiar",
        "plusCell": "K31",
        "minusCell": "L31"
      },
      {
        "id": "J32",
        "sourceColumn": "J",
        "text": "se disgusta fácilmente cuando las cosas van mal",
        "plusCell": "K32",
        "minusCell": "L32"
      },
      {
        "id": "J33",
        "sourceColumn": "J",
        "text": "no se siente muy seguro(a) de sus propias opiniones",
        "plusCell": "K33",
        "minusCell": "L33"
      },
      {
        "id": "J34",
        "sourceColumn": "J",
        "text": "prefiere estar cerca de la gente",
        "plusCell": "K34",
        "minusCell": "L34"
      }
    ]
  },
  {
    "id": 8,
    "part": "PARTE 1",
    "options": [
      {
        "id": "J35",
        "sourceColumn": "J",
        "text": "le resulta fácil influir en los demás",
        "plusCell": "K35",
        "minusCell": "L35"
      },
      {
        "id": "J36",
        "sourceColumn": "J",
        "text": "termina sus trabajos a pesar de los obstáculos",
        "plusCell": "K36",
        "minusCell": "L36"
      },
      {
        "id": "J37",
        "sourceColumn": "J",
        "text": "limita sus relaciones sociales a unos cuantos",
        "plusCell": "K37",
        "minusCell": "L37"
      },
      {
        "id": "J38",
        "sourceColumn": "J",
        "text": "tiende a ser una persona más bien nerviosa",
        "plusCell": "K38",
        "minusCell": "L38"
      }
    ]
  },
  {
    "id": 9,
    "part": "PARTE 1",
    "options": [
      {
        "id": "J39",
        "sourceColumn": "J",
        "text": "no hace amigos fácilmente",
        "plusCell": "K39",
        "minusCell": "L39"
      },
      {
        "id": "J40",
        "sourceColumn": "J",
        "text": "toma parte activa en los asuntos de grupo",
        "plusCell": "K40",
        "minusCell": "L40"
      },
      {
        "id": "J41",
        "sourceColumn": "J",
        "text": "persiste en tareas rutinarias hasta concluirlas",
        "plusCell": "K41",
        "minusCell": "L41"
      },
      {
        "id": "J42",
        "sourceColumn": "J",
        "text": "no se encuentra emocionalmente equilibrado(a)",
        "plusCell": "K42",
        "minusCell": "L42"
      }
    ]
  },
  {
    "id": 10,
    "part": "PARTE 2",
    "options": [
      {
        "id": "G7",
        "sourceColumn": "G",
        "text": "se siente seguro(a) en sus relaciones con los demás",
        "plusCell": "H7",
        "minusCell": "I7"
      },
      {
        "id": "G8",
        "sourceColumn": "G",
        "text": "sus sentimientos son heridos fácilmente",
        "plusCell": "H8",
        "minusCell": "I8"
      },
      {
        "id": "G9",
        "sourceColumn": "G",
        "text": "tiene hábitos de trabajo bien desarrollados",
        "plusCell": "H9",
        "minusCell": "I9"
      },
      {
        "id": "G10",
        "sourceColumn": "G",
        "text": "prefiere conservar un grupo pequeño de amigos",
        "plusCell": "H10",
        "minusCell": "I10"
      }
    ]
  },
  {
    "id": 11,
    "part": "PARTE 2",
    "options": [
      {
        "id": "G11",
        "sourceColumn": "G",
        "text": "se irrita con facilidad",
        "plusCell": "H11",
        "minusCell": "I11"
      },
      {
        "id": "G12",
        "sourceColumn": "G",
        "text": "es capaz de manejar cualquier situación",
        "plusCell": "H12",
        "minusCell": "I12"
      },
      {
        "id": "G13",
        "sourceColumn": "G",
        "text": "no le gusta conversar con extraños",
        "plusCell": "H13",
        "minusCell": "I13"
      },
      {
        "id": "G14",
        "sourceColumn": "G",
        "text": "es perfeccionista en el trabajo que realiza",
        "plusCell": "H14",
        "minusCell": "I14"
      }
    ]
  },
  {
    "id": 12,
    "part": "PARTE 2",
    "options": [
      {
        "id": "G15",
        "sourceColumn": "G",
        "text": "prefiere no discutir con los demás",
        "plusCell": "H15",
        "minusCell": "I15"
      },
      {
        "id": "G16",
        "sourceColumn": "G",
        "text": "es incapaz de mantener un horario fijo",
        "plusCell": "H16",
        "minusCell": "I16"
      },
      {
        "id": "G17",
        "sourceColumn": "G",
        "text": "es una persona tranquila y serena",
        "plusCell": "H17",
        "minusCell": "I17"
      },
      {
        "id": "G18",
        "sourceColumn": "G",
        "text": "tiende a ser muy sociable",
        "plusCell": "H18",
        "minusCell": "I18"
      }
    ]
  },
  {
    "id": 13,
    "part": "PARTE 2",
    "options": [
      {
        "id": "G19",
        "sourceColumn": "G",
        "text": "se siente libre de inquietudes y preocupaciones",
        "plusCell": "H19",
        "minusCell": "I19"
      },
      {
        "id": "G20",
        "sourceColumn": "G",
        "text": "le falta sentido de responsabilidad",
        "plusCell": "H20",
        "minusCell": "I20"
      },
      {
        "id": "G21",
        "sourceColumn": "G",
        "text": "no le interesa relacionarse con el sexo opuesto",
        "plusCell": "H21",
        "minusCell": "I21"
      },
      {
        "id": "G22",
        "sourceColumn": "G",
        "text": "es hábil para tratar a otras personas",
        "plusCell": "H22",
        "minusCell": "I22"
      }
    ]
  },
  {
    "id": 14,
    "part": "PARTE 2",
    "options": [
      {
        "id": "G23",
        "sourceColumn": "G",
        "text": "le resulta fácil ser amistoso(a)",
        "plusCell": "H23",
        "minusCell": "I23"
      },
      {
        "id": "G24",
        "sourceColumn": "G",
        "text": "prefiere que otros dirijan las actividades de grupo",
        "plusCell": "H24",
        "minusCell": "I24"
      },
      {
        "id": "G25",
        "sourceColumn": "G",
        "text": "parece estar siempre preocupado(a)",
        "plusCell": "H25",
        "minusCell": "I25"
      },
      {
        "id": "G26",
        "sourceColumn": "G",
        "text": "perservera en un trabajo a pesar de los problemas",
        "plusCell": "H26",
        "minusCell": "I26"
      }
    ]
  },
  {
    "id": 15,
    "part": "PARTE 2",
    "options": [
      {
        "id": "G27",
        "sourceColumn": "G",
        "text": "es capaz de cambiar las opiniones de otros",
        "plusCell": "H27",
        "minusCell": "I27"
      },
      {
        "id": "G28",
        "sourceColumn": "G",
        "text": "no le interesa unirse a actividades grupales",
        "plusCell": "H28",
        "minusCell": "I28"
      },
      {
        "id": "G29",
        "sourceColumn": "G",
        "text": "es una persona muy nerviosa",
        "plusCell": "H29",
        "minusCell": "I29"
      },
      {
        "id": "G30",
        "sourceColumn": "G",
        "text": "es muy persistente en el trabajo que realiza",
        "plusCell": "H30",
        "minusCell": "I30"
      }
    ]
  },
  {
    "id": 16,
    "part": "PARTE 2",
    "options": [
      {
        "id": "G31",
        "sourceColumn": "G",
        "text": "es calmado(a) y fácil de tratar",
        "plusCell": "H31",
        "minusCell": "I31"
      },
      {
        "id": "G32",
        "sourceColumn": "G",
        "text": "no puede perseverar en el trabajo que realiza",
        "plusCell": "H32",
        "minusCell": "I32"
      },
      {
        "id": "G33",
        "sourceColumn": "G",
        "text": "disfruta rodeándose de mucha gente",
        "plusCell": "H33",
        "minusCell": "I33"
      },
      {
        "id": "G34",
        "sourceColumn": "G",
        "text": "no confía mucho en sus propias habilidades",
        "plusCell": "H34",
        "minusCell": "I34"
      }
    ]
  },
  {
    "id": 17,
    "part": "PARTE 2",
    "options": [
      {
        "id": "G35",
        "sourceColumn": "G",
        "text": "es una persona totalmente confiable",
        "plusCell": "H35",
        "minusCell": "I35"
      },
      {
        "id": "G36",
        "sourceColumn": "G",
        "text": "no le interesa la compañía de la mayoría de la gente",
        "plusCell": "H36",
        "minusCell": "I36"
      },
      {
        "id": "G37",
        "sourceColumn": "G",
        "text": "le resulta difícil relajarse",
        "plusCell": "H37",
        "minusCell": "I37"
      },
      {
        "id": "G38",
        "sourceColumn": "G",
        "text": "toma parte activa en las discusiones de grupo",
        "plusCell": "H38",
        "minusCell": "I38"
      }
    ]
  },
  {
    "id": 18,
    "part": "PARTE 2",
    "options": [
      {
        "id": "G39",
        "sourceColumn": "G",
        "text": "nose deja vencer fácilmente",
        "plusCell": "H39",
        "minusCell": "I39"
      },
      {
        "id": "G40",
        "sourceColumn": "G",
        "text": "tiende a ser algo nervioso(a)",
        "plusCell": "H40",
        "minusCell": "I40"
      },
      {
        "id": "G41",
        "sourceColumn": "G",
        "text": "carece de seguridad en sí mismo(a)",
        "plusCell": "H41",
        "minusCell": "I41"
      },
      {
        "id": "G42",
        "sourceColumn": "G",
        "text": "prefiere pasar el tiempo en compañía de otros",
        "plusCell": "H42",
        "minusCell": "I42"
      }
    ]
  },
  {
    "id": 19,
    "part": "PARTE 3",
    "options": [
      {
        "id": "D7",
        "sourceColumn": "D",
        "text": "tiene ideas muy originales",
        "plusCell": "E7",
        "minusCell": "F7"
      },
      {
        "id": "D8",
        "sourceColumn": "D",
        "text": "es una persona un poco lenta y despreocupada",
        "plusCell": "E8",
        "minusCell": "F8"
      },
      {
        "id": "D9",
        "sourceColumn": "D",
        "text": "tiende a criticar a los demás",
        "plusCell": "E9",
        "minusCell": "F9"
      },
      {
        "id": "D10",
        "sourceColumn": "D",
        "text": "piensa mucho antes de tomar decisiones",
        "plusCell": "E10",
        "minusCell": "F10"
      }
    ]
  },
  {
    "id": 20,
    "part": "PARTE 3",
    "options": [
      {
        "id": "D11",
        "sourceColumn": "D",
        "text": "cree que toda la gente es esencialmente honesta",
        "plusCell": "E11",
        "minusCell": "F11"
      },
      {
        "id": "D12",
        "sourceColumn": "D",
        "text": "le gusta tomar con calma el trabajo o el juego",
        "plusCell": "E12",
        "minusCell": "F12"
      },
      {
        "id": "D13",
        "sourceColumn": "D",
        "text": "tiene una actitud muy inquisitiva",
        "plusCell": "E13",
        "minusCell": "F13"
      },
      {
        "id": "D14",
        "sourceColumn": "D",
        "text": "tiende a actuar impulsivamente",
        "plusCell": "E14",
        "minusCell": "F14"
      }
    ]
  },
  {
    "id": 21,
    "part": "PARTE 3",
    "options": [
      {
        "id": "D15",
        "sourceColumn": "D",
        "text": "es una persona muy activa",
        "plusCell": "E15",
        "minusCell": "F15"
      },
      {
        "id": "D16",
        "sourceColumn": "D",
        "text": "no se enoja con los demás",
        "plusCell": "E16",
        "minusCell": "F16"
      },
      {
        "id": "D17",
        "sourceColumn": "D",
        "text": "le disgusta trabajar con problemas complejos y difíciles",
        "plusCell": "E17",
        "minusCell": "F17"
      },
      {
        "id": "D18",
        "sourceColumn": "D",
        "text": "prefiere fiestas animadas a reuniones tranquilas",
        "plusCell": "E18",
        "minusCell": "F18"
      }
    ]
  },
  {
    "id": 22,
    "part": "PARTE 3",
    "options": [
      {
        "id": "D19",
        "sourceColumn": "D",
        "text": "disfruta las discusiones filosóficas",
        "plusCell": "E19",
        "minusCell": "F19"
      },
      {
        "id": "D20",
        "sourceColumn": "D",
        "text": "se cansa fácilmente",
        "plusCell": "E20",
        "minusCell": "F20"
      },
      {
        "id": "D21",
        "sourceColumn": "D",
        "text": "piensa las cosas con mucho cuidado antes de actuar",
        "plusCell": "E21",
        "minusCell": "F21"
      },
      {
        "id": "D22",
        "sourceColumn": "D",
        "text": "no confía mucho en la gente",
        "plusCell": "E22",
        "minusCell": "F22"
      }
    ]
  },
  {
    "id": 23,
    "part": "PARTE 3",
    "options": [
      {
        "id": "D23",
        "sourceColumn": "D",
        "text": "le gusta trabajar principalmente con ideas",
        "plusCell": "E23",
        "minusCell": "F23"
      },
      {
        "id": "D24",
        "sourceColumn": "D",
        "text": "sigue un ritmo lento al realizar sus acciones",
        "plusCell": "E24",
        "minusCell": "F24"
      },
      {
        "id": "D25",
        "sourceColumn": "D",
        "text": "es muy cuidadoso(a) al tomar una decisión",
        "plusCell": "E25",
        "minusCell": "F25"
      },
      {
        "id": "D26",
        "sourceColumn": "D",
        "text": "le es difícil llevarse bien con algunas personas",
        "plusCell": "E26",
        "minusCell": "F26"
      }
    ]
  },
  {
    "id": 24,
    "part": "PARTE 3",
    "options": [
      {
        "id": "D27",
        "sourceColumn": "D",
        "text": "se distingue por arriesgarse",
        "plusCell": "E27",
        "minusCell": "F27"
      },
      {
        "id": "D28",
        "sourceColumn": "D",
        "text": "se irrita fácilmente con los demás",
        "plusCell": "E28",
        "minusCell": "F28"
      },
      {
        "id": "D29",
        "sourceColumn": "D",
        "text": "puede hacer poco en mucho tiempo",
        "plusCell": "E29",
        "minusCell": "F29"
      },
      {
        "id": "D30",
        "sourceColumn": "D",
        "text": "emplea bastante tiempo pensando en nuevas ideas",
        "plusCell": "E30",
        "minusCell": "F30"
      }
    ]
  },
  {
    "id": 25,
    "part": "PARTE 3",
    "options": [
      {
        "id": "D31",
        "sourceColumn": "D",
        "text": "es una persona muy paciente",
        "plusCell": "E31",
        "minusCell": "F31"
      },
      {
        "id": "D32",
        "sourceColumn": "D",
        "text": "busca lo emocionante y excitante",
        "plusCell": "E32",
        "minusCell": "F32"
      },
      {
        "id": "D33",
        "sourceColumn": "D",
        "text": "es capaz de trabajar durante largos lapsos",
        "plusCell": "E33",
        "minusCell": "F33"
      },
      {
        "id": "D34",
        "sourceColumn": "D",
        "text": "prefiere poner en práctica un proyecto que planearlo",
        "plusCell": "E34",
        "minusCell": "F34"
      }
    ]
  },
  {
    "id": 26,
    "part": "PARTE 3",
    "options": [
      {
        "id": "D35",
        "sourceColumn": "D",
        "text": "se siente cansado(a) y fastidiado(a) al final de un día",
        "plusCell": "E35",
        "minusCell": "F35"
      },
      {
        "id": "D36",
        "sourceColumn": "D",
        "text": "tiende a hacer juicios apresurados",
        "plusCell": "E36",
        "minusCell": "F36"
      },
      {
        "id": "D37",
        "sourceColumn": "D",
        "text": "no muestra resentimiento hacia los demás",
        "plusCell": "E37",
        "minusCell": "F37"
      },
      {
        "id": "D38",
        "sourceColumn": "D",
        "text": "tiene una gran sed de conocimientos",
        "plusCell": "E38",
        "minusCell": "F38"
      }
    ]
  },
  {
    "id": 27,
    "part": "PARTE 3",
    "options": [
      {
        "id": "D39",
        "sourceColumn": "D",
        "text": "no actúa impulsivamente",
        "plusCell": "E39",
        "minusCell": "F39"
      },
      {
        "id": "D40",
        "sourceColumn": "D",
        "text": "se irrita con los errores de los demás",
        "plusCell": "E40",
        "minusCell": "F40"
      },
      {
        "id": "D41",
        "sourceColumn": "D",
        "text": "carece de interés para pensar de manera crítica",
        "plusCell": "E41",
        "minusCell": "F41"
      },
      {
        "id": "D42",
        "sourceColumn": "D",
        "text": "prefiere trabajar rápidamente",
        "plusCell": "E42",
        "minusCell": "F42"
      }
    ]
  },
  {
    "id": 28,
    "part": "PARTE 3",
    "options": [
      {
        "id": "D43",
        "sourceColumn": "D",
        "text": "tiende a disgustarse mucho con la gente",
        "plusCell": "E43",
        "minusCell": "F43"
      },
      {
        "id": "D44",
        "sourceColumn": "D",
        "text": "le gusta estar siempre activo(a)",
        "plusCell": "E44",
        "minusCell": "F44"
      },
      {
        "id": "D45",
        "sourceColumn": "D",
        "text": "preferiría no correr riesgos",
        "plusCell": "E45",
        "minusCell": "F45"
      },
      {
        "id": "D46",
        "sourceColumn": "D",
        "text": "prefiere el trabajo que requiere pocas ideas originales",
        "plusCell": "E46",
        "minusCell": "F46"
      }
    ]
  },
  {
    "id": 29,
    "part": "PARTE 4",
    "options": [
      {
        "id": "A7",
        "sourceColumn": "A",
        "text": "es una persona muy cautelosa",
        "plusCell": "B7",
        "minusCell": "C7"
      },
      {
        "id": "A8",
        "sourceColumn": "A",
        "text": "prefiere trabajar despacio",
        "plusCell": "B8",
        "minusCell": "C8"
      },
      {
        "id": "A9",
        "sourceColumn": "A",
        "text": "es muy diplomático(a) y discreto(a)",
        "plusCell": "B9",
        "minusCell": "C9"
      },
      {
        "id": "A10",
        "sourceColumn": "A",
        "text": "prefiere no ocupar su mente en pensamientos profundos",
        "plusCell": "B10",
        "minusCell": "C10"
      }
    ]
  },
  {
    "id": 30,
    "part": "PARTE 4",
    "options": [
      {
        "id": "A11",
        "sourceColumn": "A",
        "text": "pierde la paciencia con los demás rápidamente",
        "plusCell": "B11",
        "minusCell": "C11"
      },
      {
        "id": "A12",
        "sourceColumn": "A",
        "text": "tiene menos resistencia que la mayoría de la gente",
        "plusCell": "B12",
        "minusCell": "C12"
      },
      {
        "id": "A13",
        "sourceColumn": "A",
        "text": "tiende a ser creativo(a) y original",
        "plusCell": "B13",
        "minusCell": "C13"
      },
      {
        "id": "A14",
        "sourceColumn": "A",
        "text": "no le interesa mucho lo emocionante",
        "plusCell": "B14",
        "minusCell": "C14"
      }
    ]
  },
  {
    "id": 31,
    "part": "PARTE 4",
    "options": [
      {
        "id": "A15",
        "sourceColumn": "A",
        "text": "tiende a actuar siguiendo sus presentimientos",
        "plusCell": "B15",
        "minusCell": "C15"
      },
      {
        "id": "A16",
        "sourceColumn": "A",
        "text": "tiene un gran vigor y dinamismo",
        "plusCell": "B16",
        "minusCell": "C16"
      },
      {
        "id": "A17",
        "sourceColumn": "A",
        "text": "no confía en los demás hasta que demuestren que son de fiar",
        "plusCell": "B17",
        "minusCell": "C17"
      },
      {
        "id": "A18",
        "sourceColumn": "A",
        "text": "disfruta los problemas que requieren de bastante reflexión",
        "plusCell": "B18",
        "minusCell": "C18"
      }
    ]
  },
  {
    "id": 32,
    "part": "PARTE 4",
    "options": [
      {
        "id": "A19",
        "sourceColumn": "A",
        "text": "no le gusta trabajar rápidamente",
        "plusCell": "B19",
        "minusCell": "C19"
      },
      {
        "id": "A20",
        "sourceColumn": "A",
        "text": "tiene mucha fe en la gente",
        "plusCell": "B20",
        "minusCell": "C20"
      },
      {
        "id": "A21",
        "sourceColumn": "A",
        "text": "tiende a ceder al deseo del momento",
        "plusCell": "B21",
        "minusCell": "C21"
      },
      {
        "id": "A22",
        "sourceColumn": "A",
        "text": "le agrada resolver problemas complicados",
        "plusCell": "B22",
        "minusCell": "C22"
      }
    ]
  },
  {
    "id": 33,
    "part": "PARTE 4",
    "options": [
      {
        "id": "A23",
        "sourceColumn": "A",
        "text": "es un(a) trabajador(a) muy activo(a)",
        "plusCell": "B23",
        "minusCell": "C23"
      },
      {
        "id": "A24",
        "sourceColumn": "A",
        "text": "acepta la crítica con buen ánimo",
        "plusCell": "B24",
        "minusCell": "C24"
      },
      {
        "id": "A25",
        "sourceColumn": "A",
        "text": "le disgustan los problemas que requieren mucho razonamiento",
        "plusCell": "B25",
        "minusCell": "C25"
      },
      {
        "id": "A26",
        "sourceColumn": "A",
        "text": "tiende a actuar primero y pensar después",
        "plusCell": "B26",
        "minusCell": "C26"
      }
    ]
  },
  {
    "id": 34,
    "part": "PARTE 4",
    "options": [
      {
        "id": "A27",
        "sourceColumn": "A",
        "text": "no habla sino lo mejor sobre otras personas",
        "plusCell": "B27",
        "minusCell": "C27"
      },
      {
        "id": "A28",
        "sourceColumn": "A",
        "text": "es muy cauteloso(a) antes de actuar",
        "plusCell": "B28",
        "minusCell": "C28"
      },
      {
        "id": "A29",
        "sourceColumn": "A",
        "text": "no le interesan las discusiones que inciten a pensar",
        "plusCell": "B29",
        "minusCell": "C29"
      },
      {
        "id": "A30",
        "sourceColumn": "A",
        "text": "no se apresura yendo de un lugar a otro",
        "plusCell": "B30",
        "minusCell": "C30"
      }
    ]
  },
  {
    "id": 35,
    "part": "PARTE 4",
    "options": [
      {
        "id": "A31",
        "sourceColumn": "A",
        "text": "no tiene una mente inquisitiva",
        "plusCell": "B31",
        "minusCell": "C31"
      },
      {
        "id": "A32",
        "sourceColumn": "A",
        "text": "no actúa impulsivamente",
        "plusCell": "B32",
        "minusCell": "C32"
      },
      {
        "id": "A33",
        "sourceColumn": "A",
        "text": "generalmente está desbordante de energía",
        "plusCell": "B33",
        "minusCell": "C33"
      },
      {
        "id": "A34",
        "sourceColumn": "A",
        "text": "se irrita fácilmente por las debilidades de los demás",
        "plusCell": "B34",
        "minusCell": "C34"
      }
    ]
  },
  {
    "id": 36,
    "part": "PARTE 4",
    "options": [
      {
        "id": "A35",
        "sourceColumn": "A",
        "text": "puede realizar más cosas que otras personas",
        "plusCell": "B35",
        "minusCell": "C35"
      },
      {
        "id": "A36",
        "sourceColumn": "A",
        "text": "le gusta correr riesgos sólo por la emoción de hacerlo",
        "plusCell": "B36",
        "minusCell": "C36"
      },
      {
        "id": "A37",
        "sourceColumn": "A",
        "text": "se ofende cuando es criticado(a)",
        "plusCell": "B37",
        "minusCell": "C37"
      },
      {
        "id": "A38",
        "sourceColumn": "A",
        "text": "prefiere trabajar con ideas que con cosas",
        "plusCell": "B38",
        "minusCell": "C38"
      }
    ]
  },
  {
    "id": 37,
    "part": "PARTE 4",
    "options": [
      {
        "id": "A39",
        "sourceColumn": "A",
        "text": "confía mucho en las personas",
        "plusCell": "B39",
        "minusCell": "C39"
      },
      {
        "id": "A40",
        "sourceColumn": "A",
        "text": "prefiere desempeñar un trabajo rutinario y simple",
        "plusCell": "B40",
        "minusCell": "C40"
      },
      {
        "id": "A41",
        "sourceColumn": "A",
        "text": "actúa impulsivamente",
        "plusCell": "B41",
        "minusCell": "C41"
      },
      {
        "id": "A42",
        "sourceColumn": "A",
        "text": "está lleno(a) de vigor y energía",
        "plusCell": "B42",
        "minusCell": "C42"
      }
    ]
  },
  {
    "id": 38,
    "part": "PARTE 4",
    "options": [
      {
        "id": "A43",
        "sourceColumn": "A",
        "text": "toma decisiones muy rápidamente",
        "plusCell": "B43",
        "minusCell": "C43"
      },
      {
        "id": "A44",
        "sourceColumn": "A",
        "text": "le simpatiza toda la gente",
        "plusCell": "B44",
        "minusCell": "C44"
      },
      {
        "id": "A45",
        "sourceColumn": "A",
        "text": "mantiene un ritmo vivaz en el trabajo o el juego",
        "plusCell": "B45",
        "minusCell": "C45"
      },
      {
        "id": "A46",
        "sourceColumn": "A",
        "text": "no tiene un gran interés en adquirir conocimientos",
        "plusCell": "B46",
        "minusCell": "C46"
      }
    ]
  }
];
