// Catálogo de DUEL CLUB: fuente única de verdad para cosméticos, títulos y tarjetas.
// El servidor recibe precios, rarezas y desbloqueos desde este archivo (scripts/gen-seed.mjs).
// Ningún cosmético da ventajas: solo cambian el aspecto.

import { SEASONS } from './pass.js';

export const RARITIES = {
  common: { name: 'Común', color: '#A7B0C8', price: 100, order: 0 },
  uncommon: { name: 'Poco común', color: '#48D597', price: 250, order: 1 },
  rare: { name: 'Raro', color: '#3985FF', price: 500, order: 2 },
  epic: { name: 'Épico', color: '#9B6CFF', price: 1000, order: 3 },
  legendary: { name: 'Legendario', color: '#FFD16B', price: 2200, order: 4 },
  mythic: { name: 'Mítico', color: '#FF3B5C', price: 5000, order: 5 },
};

export const CATEGORIES = {
  char: { name: 'Personajes', slot: 'char' },
  skin: { name: 'Skins', slot: 'skin' },
  hat: { name: 'Sombreros', slot: 'hat' },
  face: { name: 'Máscaras y gafas', slot: 'face' },
  body: { name: 'Accesorios de cuerpo', slot: 'body' },
  entrance: { name: 'Efectos de entrada', slot: 'entrance' },
  victory: { name: 'Efectos de victoria', slot: 'victory' },
  emote: { name: 'Emotes', slot: 'emote' },
  frame: { name: 'Marcos de perfil', slot: 'frame' },
  card: { name: 'Tarjetas de perfil', slot: 'card' },
  title: { name: 'Títulos', slot: 'title' },
};

// it(id, categoría, rareza, nombre, descripción, extra)
// extra.sale=false → no se vende; extra.default → todos lo tienen; extra.meme → MEME COLLECTION
const it = (id, category, rarity, name, desc, extra = {}) => ({ id, category, rarity, name, desc, sale: true, theme: null, ...extra });

// Exclusivos: no se venden, solo se consiguen con logros (el texto de desbloqueo lo completa achievements.js)
export const ACH_ONLY = new Set(["card_minimal", "emo_signo", "hat_cono", "face_payaso", "emo_cine", "card_npc", "skin_cristal", "vic_pies", "skin_glitch", "emo_contrato", "card_diamante", "hat_corona_hielo", "char_silla", "hat_pato", "body_armadura_silla", "card_silla", "emo_necesidad", "skin_cosmico", "emo_aura", "frame_cosmico", "card_caos"]);

export const ITEMS = [
  // ===================================================================== PERSONAJES
  it('char_volt', 'char', 'common', 'Volt', 'El robot optimista. Viene de fábrica con buena onda.', { sale: false, default: true }),
  it('char_mochi', 'char', 'common', 'Mochi', 'Gelatina competitiva. Rebota de cualquier derrota.', { sale: false, default: true }),
  it('char_pico', 'char', 'common', 'Pico', 'Nunca aprendió a volar, así que aprendió a correr.', { sale: false, default: true }),
  it('char_brik', 'char', 'common', 'Brik', 'Gólem de bloques. Lento para hablar, rápido para ganar.', { sale: false, default: true }),
  it('char_nimbus', 'char', 'rare', 'Nimbus', 'Siempre parece dormido, hasta que cae el primer rayo.', { sale: false, unlock: 'Logro: Primera victoria' }),
  it('char_fang', 'char', 'rare', 'Fang', 'Lee a sus rivales como un libro abierto.', { sale: false, unlock: 'Logro: Cinco estrellas' }),
  it('char_ozzy', 'char', 'epic', 'Ozzy', 'Vino de otra galaxia a estudiar juegos terrestres. Ya es adicto.', { sale: false, unlock: 'Logro: En racha' }),
  it('char_rex', 'char', 'legendary', 'Rex', 'Bracitos cortos, ambición enorme.', { sale: false, unlock: 'Logro: Campeón del club' }),
  it('char_npc', 'char', 'rare', 'Gerardo NPC', 'Un ciudadano exageradamente normal. Camisa a cuadros, mirada perdida, cero contexto.', { meme: true, theme: 'Meme' }),
  it('char_formal', 'char', 'epic', 'Sr. Formalidad', 'Oficinista extremadamente serio. Llega a los duelos con planilla de Excel.', { meme: true, theme: 'Meme' }),
  it('char_frigo', 'char', 'epic', 'Frigo-Bot', 'Un robot heladera. Mantiene la calma a 4 °C.', { meme: true, theme: 'Robot' }),
  it('char_toasty', 'char', 'legendary', 'Tostadín', 'Cabeza de tostadora. Salta cada vez que algo le sale bien.', { meme: true, theme: 'Meme' }),
  it('char_silla', 'char', 'legendary', 'La Silla', 'La silla de plástico que sobrevivió a mil asados. Ahora compite.', { meme: true, theme: 'Absurdo' }),
  it('char_tuntun', 'char', 'mythic', 'Tung Tung Tung Sahur', 'El tronco con bate más famoso de internet. Tung. Tung. Tung. Sahur.', { meme: true, theme: 'Meme' }),

  // ===================================================================== SKINS (diseño sobre el cuerpo)
  it('skin_rayas', 'skin', 'common', 'Rayas', 'Rayas diagonales. Clásico que nunca falla.', { theme: 'Retro' }),
  it('skin_lunares', 'skin', 'common', 'Lunares', 'Puntos blancos con autoestima alta.', { theme: 'Retro' }),
  it('skin_cuadros', 'skin', 'common', 'Cuadros', 'Patrón de mantel de picnic.', { theme: 'Retro' }),
  it('skin_camuflaje', 'skin', 'common', 'Camuflaje', 'Te esconde perfectamente en un bosque de píxeles.', { theme: 'Retro' }),
  it('skin_retro', 'skin', 'uncommon', 'Píxel retro', 'Directo desde una máquina recreativa de 1987.', { theme: 'Retro' }),
  it('skin_neon', 'skin', 'uncommon', 'Contorno neón', 'Brilla en la oscuridad del club.', { theme: 'Neón' }),
  it('skin_hielo', 'skin', 'uncommon', 'Escarcha', 'Frío por fuera, más frío por dentro.', { theme: 'Hielo' }),
  it('skin_selva', 'skin', 'uncommon', 'Selva', 'Hojas tropicales. Huele a protector solar.', { theme: 'Bosque' }),
  it('skin_fuego', 'skin', 'rare', 'Fuego', 'Llamas que suben cuando vas ganando.', { theme: 'Fuego' }),
  it('skin_cyber', 'skin', 'rare', 'Circuitos cyberpunk', 'Pistas de circuito que laten como un servidor sobrecalentado.', { theme: 'Cyberpunk' }),
  it('skin_cristal', 'skin', 'rare', 'Cristal', 'Facetas que reflejan tus decisiones cuestionables.', { theme: 'Cristal' }),
  it('skin_volcan', 'skin', 'rare', 'Volcán', 'Roca negra con grietas de lava.', { theme: 'Volcán' }),
  it('skin_galaxia', 'skin', 'epic', 'Galaxia', 'Lleva el universo puesto. Literalmente.', { theme: 'Galaxia' }),
  it('skin_glitch', 'skin', 'epic', 'Glitch', 'Algo se rompió y quedó hermoso.', { theme: 'Glitch' }),
  it('skin_fantasma', 'skin', 'epic', 'Fantasma', 'Medio transparente. Los rivales te miran y no te ven.', { theme: 'Fantasma' }),
  it('skin_oro', 'skin', 'legendary', 'Oro puro', 'Brillo de 24 quilates. Cero ventajas competitivas, mucha actitud.', { theme: 'Oro' }),
  it('skin_samurai', 'skin', 'legendary', 'Placas samurái', 'Armadura lacada. El honor no se compra (esta skin sí).', { theme: 'Samurai' }),
  it('skin_cosmico', 'skin', 'mythic', 'Cósmico', 'Una nebulosa viva que gira mientras jugás.', { theme: 'Cósmico' }),

  // ===================================================================== SOMBREROS
  it('hat_lana', 'hat', 'common', 'Gorro de lana', 'Abrigado y competitivo.', { theme: 'Hielo' }),
  it('hat_bandana', 'hat', 'common', 'Vincha deportiva', 'Para transpirar como si fuera una final.', { theme: 'Retro' }),
  it('hat_gorra_atras', 'hat', 'common', 'Gorra para atrás', 'Nivel de confianza: injustificado.', { theme: 'Meme', meme: true }),
  it('hat_vaquero', 'hat', 'uncommon', 'Sombrero vaquero', 'Este pueblo es chico para los dos.', { theme: 'Retro' }),
  it('hat_cono', 'hat', 'uncommon', 'Cono de tránsito', 'Precaución: jugador en obra.', { theme: 'Absurdo', meme: true }),
  it('hat_olla', 'hat', 'uncommon', 'Olla de guerra', 'Protección máxima, dignidad mínima.', { theme: 'Absurdo', meme: true }),
  it('hat_kabuto', 'hat', 'rare', 'Kabuto', 'Casco samurái con media luna dorada.', { theme: 'Samurai' }),
  it('hat_mago', 'hat', 'rare', 'Sombrero de mago', 'Con estrellas. No hace magia, pero intimida.', { theme: 'Galaxia' }),
  it('hat_gamer', 'hat', 'rare', 'Auriculares RGB', 'Mil colores, cero sonido extra.', { theme: 'Cyberpunk' }),
  it('hat_corona_hielo', 'hat', 'epic', 'Corona de hielo', 'Fría como tu racha de victorias.', { theme: 'Hielo' }),
  it('hat_cuernos_fuego', 'hat', 'epic', 'Cuernos de fuego', 'Arden un poquito. Ojo con el flequillo.', { theme: 'Fuego' }),
  it('hat_pato', 'hat', 'legendary', 'Pato en la cabeza', 'No sabemos cómo llegó ahí. No se quiere ir.', { theme: 'Meme', meme: true }),
  it('hat_corona_xl', 'hat', 'legendary', 'Corona exagerada', 'Ocupa media pantalla. Absolutamente innecesaria.', { theme: 'Meme', meme: true }),
  it('hat_corona_cosmica', 'hat', 'mythic', 'Corona cósmica', 'Tiene planetas orbitando. Uno se llama Gerardo.', { theme: 'Cósmico' }),

  // ===================================================================== MÁSCARAS Y GAFAS
  it('face_bigote', 'face', 'common', 'Bigote elegante', 'Le da 10 años de experiencia a tu cara.', { theme: 'Retro' }),
  it('face_curita', 'face', 'common', 'Curita', 'Recuerdo de un Pong muy intenso.', { theme: 'Absurdo' }),
  it('face_nerd', 'face', 'common', 'Lentes de nerd', 'Calculan trayectorias. No es cierto, pero se ven así.', { theme: 'Retro' }),
  it('face_3d', 'face', 'uncommon', 'Lentes 3D', 'Rojo y azul, como J1 y J2.', { theme: 'Retro' }),
  it('face_monoculo', 'face', 'uncommon', 'Monóculo', 'Para mirar al rival por encima del hombro.', { theme: 'Meme', meme: true }),
  it('face_payaso', 'face', 'uncommon', 'Nariz de payaso', 'Ideal para después de perder 0 a 7.', { theme: 'Meme', meme: true }),
  it('face_visor', 'face', 'rare', 'Visor cyberpunk', 'Muestra datos que nadie pidió.', { theme: 'Cyberpunk' }),
  it('face_menpo', 'face', 'rare', 'Máscara samurái', 'Media máscara de guerrero. Muy seria.', { theme: 'Samurai' }),
  it('face_fantasma', 'face', 'epic', 'Máscara espectral', 'Sonríe aunque pierdas.', { theme: 'Fantasma' }),
  it('face_aura', 'face', 'legendary', 'Lentes Deal With It', 'Los lentes pixelados del meme: bajan solos cuando ganás.', { theme: 'Meme', meme: true }),

  // ===================================================================== ACCESORIOS DE CUERPO
  it('body_bufanda', 'body', 'common', 'Bufanda', 'Para los duelos de invierno.', { theme: 'Hielo' }),
  it('body_corbata', 'body', 'common', 'Moño corbata', 'Formalidad mínima indispensable.', { theme: 'Retro' }),
  it('body_capa', 'body', 'uncommon', 'Capa corta', 'Flamea aunque no haya viento.', { theme: 'Neón' }),
  it('body_mochila', 'body', 'uncommon', 'Mochila', 'Lleva snacks para el torneo.', { theme: 'Retro' }),
  it('body_cadena', 'body', 'rare', 'Cadena de oro', 'Pesa más que tu personaje.', { theme: 'Oro' }),
  it('body_alas_neon', 'body', 'epic', 'Alas de neón', 'No vuelan. Brillan.', { theme: 'Neón' }),
  it('body_armadura_silla', 'body', 'legendary', 'Armadura de silla', 'Armadura hecha con una silla de plástico. Resistencia: emocional.', { theme: 'Absurdo', meme: true }),
  it('body_aura_fuego', 'body', 'mythic', 'Aura infernal', 'Un aura de llamas que no quema nada. Solo ego.', { theme: 'Fuego' }),

  // ===================================================================== EFECTOS DE ENTRADA (pantalla VS)
  it('ent_burbujas', 'entrance', 'uncommon', 'Burbujas', 'Llegás flotando entre burbujas, sin apuro.', { theme: 'Hielo' }),
  it('ent_teletransporte', 'entrance', 'epic', 'Teletransporte', 'Anillos de energía te materializan en el lugar.', { theme: 'Cyberpunk' }),
  it('ent_humo', 'entrance', 'common', 'Nube de humo', 'Aparecés entre humo como en un recital barato.', { theme: 'Retro' }),
  it('ent_confeti', 'entrance', 'uncommon', 'Confeti', 'Llegás festejando antes de tiempo.', { theme: 'Neón' }),
  it('ent_rayo', 'entrance', 'rare', 'Rayo', 'Caés del cielo como un rayo. Dramático.', { theme: 'Cyberpunk' }),
  it('ent_portal', 'entrance', 'epic', 'Portal', 'Entrás por un portal de otra dimensión.', { theme: 'Galaxia' }),
  it('ent_alfombra', 'entrance', 'legendary', 'Confianza injustificada', 'Alfombra roja, flashes y una caminata de campeón. Todavía no ganaste nada.', { theme: 'Meme', meme: true }),
  it('ent_meteorito', 'entrance', 'mythic', 'Meteorito', 'Llegás estrellándote desde el espacio.', { theme: 'Cósmico' }),

  // ===================================================================== EFECTOS DE VICTORIA
  it('vic_arcoiris', 'victory', 'rare', 'Arcoíris', 'Un arcoíris se dibuja detrás del ganador.', { theme: 'Neón' }),
  it('vic_corona', 'victory', 'epic', 'Corona del campeón', 'Una corona dorada baja del cielo y se queda brillando.', { theme: 'Oro' }),
  it('vic_aplausos', 'victory', 'common', 'Aplausos', 'Una tribuna invisible te aplaude.', { theme: 'Retro' }),
  it('vic_fuegos', 'victory', 'uncommon', 'Fuegos artificiales', 'Para festejar como año nuevo.', { theme: 'Neón' }),
  it('vic_pies', 'victory', 'rare', 'Lluvia de PIES', 'Caen piecitos dorados del cielo. No preguntes.', { theme: 'Meme', meme: true }),
  it('vic_rayos', 'victory', 'epic', 'Rayos dorados', 'Un haz de luz celestial te ilumina.', { theme: 'Oro' }),
  it('vic_silla', 'victory', 'legendary', 'Silla legendaria', 'Una silla de plástico desciende del cielo como reliquia sagrada.', { theme: 'Absurdo', meme: true }),
  it('vic_supernova', 'victory', 'mythic', 'Supernova', 'Explotás de gloria. Sin daños colaterales.', { theme: 'Cósmico' }),

  // ===================================================================== EMOTES (aparecen en los resultados)
  it('emo_gg', 'emote', 'common', '"GG"', 'Buen juego. A veces es sincero.', { theme: 'Retro' }),
  it('emo_jaja', 'emote', 'common', '"JAJA"', 'Se ríe en tu cara, con respeto.', { theme: 'Meme' }),
  it('emo_vacio', 'emote', 'uncommon', 'Mirada de los mil metros', 'Tu personaje mira al horizonte procesando lo que pasó.', { theme: 'Meme', meme: true }),
  it('emo_signo', 'emote', 'uncommon', '"¿?"', 'Ni vos entendés cómo ganaste.', { theme: 'Meme' }),
  it('emo_cine', 'emote', 'rare', '"CINE ABSOLUTO"', 'Para las remontadas de película.', { theme: 'Meme', meme: true }),
  it('emo_contrato', 'emote', 'epic', 'Cartel del contrato', '"ESTO NO ESTABA EN EL CONTRATO".', { theme: 'Meme', meme: true }),
  it('emo_necesidad', 'emote', 'legendary', '"QUÉ NECESIDAD"', 'Para cuando ganás por 0,003 segundos.', { theme: 'Meme', meme: true }),
  it('emo_aura', 'emote', 'mythic', '"+1000 AURA"', 'El emote más innecesario del club.', { theme: 'Meme', meme: true }),

  // ===================================================================== MARCOS DE PERFIL
  it('frame_simple', 'frame', 'common', 'Marco simple', 'Un borde prolijo. Nada más, nada menos.', { theme: 'Retro' }),
  it('frame_neon', 'frame', 'uncommon', 'Marco neón', 'Borde que brilla en violeta.', { theme: 'Neón' }),
  it('frame_hielo', 'frame', 'rare', 'Marco de hielo', 'Cristales de escarcha en las esquinas.', { theme: 'Hielo' }),
  it('frame_fuego', 'frame', 'epic', 'Marco de fuego', 'Bordes en llamas animadas.', { theme: 'Fuego' }),
  it('frame_oro', 'frame', 'legendary', 'Marco de oro', 'Dorado, pesado y con brillo que recorre el borde.', { theme: 'Oro' }),
  it('frame_cosmico', 'frame', 'mythic', 'Marco cósmico', 'Un borde de galaxias que nunca deja de girar.', { theme: 'Cósmico' }),

  // ===================================================================== TARJETAS (24 estilos)
  it('card_clasica', 'card', 'common', 'Clásica', 'La tarjeta de siempre, con tu color.', { sale: false, default: true }),
  it('card_neon', 'card', 'common', 'Neón', 'Violeta y azul eléctrico.', { sale: false, default: true }),
  it('card_atardecer', 'card', 'common', 'Atardecer', 'Naranja y rosa.', { sale: false, default: true }),
  it('card_lluvia', 'card', 'uncommon', 'Lluvia de neón', 'Gotas de luz que caen sin parar.', { theme: 'Neón' }),
  it('card_cerezo', 'card', 'rare', 'Cerezo', 'Rosa suave con pétalos que vuelan.', { theme: 'Bosque' }),
  it('card_lava', 'card', 'epic', 'Río de lava', 'Lava y brasas que laten bajo tu nombre.', { theme: 'Fuego' }),
  it('card_arcade', 'card', 'rare', 'Arcade', 'Cuadrícula retro y colores de fichín.', { theme: 'Retro' }),
  it('card_oceano', 'card', 'common', 'Océano', 'Turquesa profundo.', { theme: 'Hielo' }),
  it('card_bosque', 'card', 'common', 'Bosque', 'Verde selva.', { theme: 'Bosque' }),
  it('card_minimal', 'card', 'common', 'Minimalista', 'Gris grafito, cero distracciones.', { theme: 'Retro' }),
  it('card_competitiva', 'card', 'uncommon', 'Competitiva', 'Franjas diagonales de estadio.', { theme: 'Neón' }),
  it('card_cyberpunk', 'card', 'uncommon', 'Cyberpunk', 'Magenta y cian con rejilla.', { theme: 'Cyberpunk' }),
  it('card_volcan', 'card', 'uncommon', 'Volcán', 'Magma bajo roca negra.', { theme: 'Volcán' }),
  it('card_cristal', 'card', 'rare', 'Cristal', 'Facetas translúcidas.', { theme: 'Cristal' }),
  it('card_fantasma', 'card', 'rare', 'Fantasma', 'Niebla espectral que se mueve.', { theme: 'Fantasma' }),
  it('card_glitch', 'card', 'rare', 'Glitch', 'Se rompe en franjas cada tanto.', { theme: 'Glitch' }),
  it('card_npc', 'card', 'rare', 'NPC Premium', 'Beige corporativo con marca de agua "NPC".', { theme: 'Meme', meme: true }),
  it('card_diamante', 'card', 'epic', 'Diamante', 'Destellos que recorren la tarjeta.', { theme: 'Cristal' }),
  it('card_galaxia', 'card', 'epic', 'Galaxia', 'Un cielo estrellado de fondo.', { theme: 'Galaxia', sale: false, unlock: 'Nivel 20' }),
  it('card_meme', 'card', 'epic', 'Meme Supremo', 'Impact blanco, fondo saturado. Peak de la comedia.', { theme: 'Meme', meme: true }),
  it('card_oro', 'card', 'legendary', 'Oro', 'Dorada de verdad.', { theme: 'Oro', sale: false, unlock: 'Nivel 10' }),
  it('card_legendaria', 'card', 'legendary', 'Legendaria', 'Dorado con rayos de luz giratorios.', { theme: 'Oro' }),
  it('card_silla', 'card', 'legendary', 'Silla Legendaria', 'Una silla de plástico iluminada como una reliquia.', { theme: 'Absurdo', meme: true }),
  it('card_cosmica', 'card', 'mythic', 'Cósmica', 'Nebulosas animadas.', { theme: 'Cósmico', sale: false, unlock: 'Logro' }),
  it('card_caos', 'card', 'mythic', 'Caos Absoluto', 'Colores que no se ponen de acuerdo. Animada.', { theme: 'Meme', meme: true }),
  it('card_nivel67', 'card', 'mythic', 'Nivel 67', 'Solo para EL ELEGIDO. Brillo dorado y el número sagrado.', { sale: false, unlock: 'Nivel 67' }),
  it('card_inmortal', 'card', 'mythic', 'Inmortal', 'Llamas blancas y doradas. Para quien llegó al nivel 100.', { sale: false, unlock: 'Nivel 100' }),
  it('card_maestro', 'card', 'epic', 'Maestro Arcade', 'Rejilla dorada de máquina recreativa.', { sale: false, unlock: 'Nivel 50' }),

  // ===================================================================== ACCESORIOS CLÁSICOS (versión anterior)
  it('acc_cap', 'hat', 'common', 'Gorra', 'La gorra de siempre.', { sale: false, default: true }),
  it('acc_bow', 'hat', 'common', 'Moño', 'Un moño rosa con personalidad.', { sale: false, default: true }),
  it('acc_party', 'hat', 'common', 'Gorro de fiesta', 'Todo duelo es una fiesta.', { sale: false, default: true }),
  it('acc_headphones', 'hat', 'rare', 'Auriculares', 'Para escuchar el ritmo de la victoria.', { sale: false, unlock: 'Logro: ¡PERFECT!' }),
  it('acc_shades', 'face', 'rare', 'Gafas de sol', 'Reflejos de otro planeta.', { sale: false, unlock: 'Logro: Rayo humano' }),
  it('acc_helmet', 'hat', 'rare', 'Casco de piloto', 'Para pilotos que no chocan.', { sale: false, unlock: 'Logro: Piloto impecable' }),
  it('acc_halo', 'hat', 'epic', 'Aureola', 'Para quien gana por un pelo.', { sale: false, unlock: 'Logro: Por un pelo' }),
  it('acc_horns', 'hat', 'epic', 'Casco vikingo', 'Sobrevivió a mil batallas (de minijuegos).', { sale: false, unlock: 'Logro: Superviviente' }),
  it('acc_tophat', 'hat', 'legendary', 'Galera', 'Elegancia de campeón de torneo.', { sale: false, unlock: 'Logro: Rey del torneo' }),
  it('acc_crown', 'hat', 'legendary', 'Corona', 'Ganaste todos los minijuegos. Sos realeza.', { sale: false, unlock: 'Logro: Todoterreno' }),

  // ===================================================================== DESBLOQUEOS POR NIVEL Y SECRETOS
  it('hat_aureola67', 'hat', 'mythic', 'Aureola del Elegido', 'Un anillo dorado con el 67 grabado. Nadie sabe por qué.', { sale: false, unlock: 'Nivel 67' }),
  it('ent_elegido', 'entrance', 'mythic', 'Llegada del Elegido', 'Un coro celestial anuncia tu llegada. Es el nivel 67.', { sale: false, unlock: 'Nivel 67' }),
  it('body_toalla', 'body', 'epic', 'Toalla interestelar', 'Nunca viajes sin tu toalla. Respuesta a todo.', { sale: false, unlock: 'Nivel 42' }),
  it('emo_serio', 'emote', 'rare', 'Modo serio', 'Una cara completamente seria. Demasiado seria.', { sale: false, unlock: 'Nivel 21' }),
  it('vic_icono', 'victory', 'legendary', 'Ícono del club', 'Tu silueta aparece en un cartel de neón gigante.', { sale: false, unlock: 'Nivel 75' }),
  it('frame_maestro', 'frame', 'legendary', 'Marco de Maestro', 'Bordes de máquina recreativa dorada.', { sale: false, unlock: 'Nivel 50' }),
  it('frame_vida', 'frame', 'mythic', '¿Tenés vida?', 'Un marco que te mira con preocupación. Nivel 150.', { sale: false, unlock: 'Nivel 150' }),
  it('emo_empate', 'emote', 'epic', 'Empate eterno', '"Nadie quiso hacerse cargo."', { sale: false, unlock: 'Secreto' }),
];

// ===================================================================== TÍTULOS
// tt(id, nombre, rareza, cómo se consigue, extra)
const tt = (id, name, rarity, unlock, extra = {}) => ({ id: 'title_' + id, category: 'title', rarity, name, desc: unlock, unlock, sale: false, ...extra });
export const TITLES = [
  tt('novato', 'Novato', 'common', 'Nivel 1', { default: true }),
  tt('aspirante', 'Aspirante', 'common', 'Nivel 5'),
  tt('sospechoso', 'Sos sospechoso', 'uncommon', 'Nivel 6'),
  tt('competidor', 'Competidor', 'uncommon', 'Nivel 10'),
  tt('veterano', 'Veterano', 'rare', 'Nivel 15'),
  tt('elite', 'Élite', 'rare', 'Nivel 20'),
  tt('modo_serio', 'Modo serio', 'rare', 'Nivel 21'),
  tt('leyenda_club', 'Leyenda del Club', 'epic', 'Nivel 30'),
  tt('la_respuesta', 'La respuesta', 'epic', 'Nivel 42'),
  tt('maestro_arcade', 'Maestro Arcade', 'legendary', 'Nivel 50'),
  tt('el_elegido', 'EL ELEGIDO', 'mythic', 'Nivel 67'),
  tt('no_preguntes', 'No preguntes', 'legendary', 'Nivel 69'),
  tt('icono', 'Ícono del Club', 'legendary', 'Nivel 75'),
  tt('inmortal', 'INMORTAL', 'mythic', 'Nivel 100'),
  tt('leyenda_absoluta', 'Leyenda absoluta', 'mythic', 'Nivel 100'),
  tt('tenes_vida', '¿Tenés vida?', 'mythic', 'Nivel 150'),
  tt('boton', 'Profesional del botón', 'rare', 'Logro: Profesional del botón'),
  tt('no_era_dificil', 'No era tan difícil', 'uncommon', 'Logro: No era tan difícil'),
  tt('sin_manos', 'Sin manos', 'legendary', 'Logro: Sin manos'),
  tt('el_de_67', 'El de los 67', 'epic', 'Logro: 67'),
  tt('toque_pasto', 'Toque pasto', 'uncommon', 'Logro secreto'),
  tt('pixeles', 'Señor de los píxeles', 'legendary', 'Logro: Todoterreno'),
  tt('npc', 'NPC certificado', 'rare', 'Logro: NPC certificado'),
  tt('ultimo_cerebro', 'Último cerebro disponible', 'epic', 'Logro: Memoria fotográfica'),
  tt('tiempo_libre', 'Demasiado tiempo libre', 'legendary', 'Logro: Demasiado tiempo libre'),
  tt('ceo_desastre', 'CEO del desastre', 'epic', 'Logro: CEO del desastre'),
  tt('no_me_salio', 'No me salió', 'common', 'Logro: No me salió'),
  tt('casualidad', 'Gané de casualidad', 'uncommon', 'Logro: Por un pelo'),
  tt('arquitecto', 'Arquitecto del caos', 'epic', 'Logro: Arquitecto del caos'),
  tt('innecesario', 'Absolutamente innecesario', 'rare', 'Logro: Absolutamente innecesario'),
  tt('verdadero_problema', 'El verdadero problema', 'epic', 'Logro: El verdadero problema'),
  tt('cine', 'Cine absoluto', 'rare', 'Logro: Remontada épica'),
  tt('coleccionista', 'El coleccionista', 'epic', 'Logro: El coleccionista'),
  tt('social', 'Alma del club', 'uncommon', 'Logro: Jugar con cinco amigos'),
  tt('aura', 'Main Character', 'epic', 'PIE STORE', { sale: true, meme: true }),
  tt('protagonista', 'Protagonista sin guion', 'rare', 'PIE STORE', { sale: true, meme: true }),
  tt('ceo_teclado', 'CEO del teclado', 'uncommon', 'PIE STORE', { sale: true, meme: true }),
  tt('cero_estres', 'Cero estrés (mentira)', 'common', 'PIE STORE', { sale: true, meme: true }),
];

// Dominio: el rango Maestro de cada minijuego da un título y una skin exclusiva
export const GAME_IDS = ['reaction', 'race', 'pong', 'platform', 'hoop', 'memory', 'color', 'arena', 'target', 'beat', 'fish', 'blocks', 'sneak', 'tennis', 'tower', 'blast'];
export const GAME_NAMES = {
  reaction: 'Reaction Rush', race: 'Micro Race', pong: 'Pong Chaos', platform: 'Last Platform', hoop: 'Hoop Master', memory: 'Memory War',
  color: 'Color Control', arena: 'Duel Arena', target: 'Target Panic', beat: 'Beat Battle', fish: 'Fish Frenzy', blocks: 'Block Battle',
  sneak: 'Shadow Sneak', tennis: 'Turbo Tennis', tower: 'Tower Climb', blast: 'Blast Zone',
};
export const GAME_COLORS = {
  reaction: '#FFC93C', race: '#25CFE6', pong: '#9B6CFF', platform: '#48D597', hoop: '#FF8E3C', memory: '#FF5FA2', color: '#48D597', arena: '#FF654F',
  target: '#FFC93C', beat: '#FF5FA2', fish: '#25CFE6', blocks: '#9B6CFF', sneak: '#6F7CFF', tennis: '#C6F04A', tower: '#FF9E5E', blast: '#FF4D6D',
};
export const MASTERY_ITEMS = GAME_IDS.flatMap((g) => [
  { id: 'skin_m_' + g, category: 'skin', rarity: 'legendary', name: `Maestría: ${GAME_NAMES[g]}`, desc: `Skin exclusiva del rango Maestro en ${GAME_NAMES[g]}.`, unlock: `Maestro en ${GAME_NAMES[g]}`, sale: false, mastery: g },
  { id: 'title_m_' + g, category: 'title', rarity: 'epic', name: `Maestro de ${GAME_NAMES[g]}`, desc: `Rango Maestro en ${GAME_NAMES[g]}.`, unlock: `Maestro en ${GAME_NAMES[g]}`, sale: false, mastery: g },
]);

export const MASTERY_RANKS = [
  { id: 0, name: 'Principiante', points: 0, xp: 0, pies: 0 },
  { id: 1, name: 'Aficionado', points: 12, xp: 50, pies: 40 },
  { id: 2, name: 'Competente', points: 35, xp: 100, pies: 80 },
  { id: 3, name: 'Experto', points: 80, xp: 200, pies: 150 },
  { id: 4, name: 'Maestro', points: 160, xp: 400, pies: 300 },
];
export const masteryPoints = (m) => (m ? m.played + m.wins * 2 : 0);
export function masteryRank(m) {
  const pts = masteryPoints(m);
  let r = 0;
  for (const k of MASTERY_RANKS) if (pts >= k.points) r = k.id;
  return r;
}

// Recompensas por nivel (además de +20 PIES por cada nivel)
export const LEVEL_REWARDS = [
  { level: 5, pies: 100, items: ['title_aspirante'] },
  { level: 6, pies: 0, items: ['title_sospechoso'] },
  { level: 10, pies: 150, items: ['title_competidor', 'card_oro'] },
  { level: 15, pies: 150, items: ['title_veterano'] },
  { level: 20, pies: 250, items: ['title_elite', 'card_galaxia'] },
  { level: 21, pies: 0, items: ['title_modo_serio', 'emo_serio'] },
  { level: 30, pies: 400, items: ['title_leyenda_club'] },
  { level: 42, pies: 42, items: ['title_la_respuesta', 'body_toalla'] },
  { level: 50, pies: 600, items: ['title_maestro_arcade', 'card_maestro', 'frame_maestro'] },
  { level: 67, pies: 670, items: ['title_el_elegido', 'card_nivel67', 'hat_aureola67', 'ent_elegido'] },
  { level: 69, pies: 69, items: ['title_no_preguntes'] },
  { level: 75, pies: 750, items: ['title_icono', 'vic_icono'] },
  { level: 100, pies: 1500, items: ['title_inmortal', 'title_leyenda_absoluta', 'card_inmortal'] },
  { level: 150, pies: 1500, items: ['title_tenes_vida', 'frame_vida'] },
];

// Títulos de nivel (el que corresponde por nivel se muestra si no elegís otro)
export const LEVEL_TITLES = [[1, 'Novato'], [5, 'Aspirante'], [10, 'Competidor'], [15, 'Veterano'], [20, 'Élite'], [30, 'Leyenda del Club'], [50, 'Maestro Arcade'], [67, 'EL ELEGIDO'], [75, 'Ícono del Club'], [100, 'Inmortal']];
export const SPECIAL_LEVELS = {
  6: 'Sos sospechoso', 21: 'Modo serio', 42: 'La respuesta', 67: 'EL ELEGIDO', 69: 'No preguntes', 100: 'Leyenda absoluta', 150: '¿Tenés vida?',
};

// Rangos de ELO (rating competitivo)
export const RESIST_TIERS = [
  { min: -Infinity, name: 'Principiante', color: '#8C96B8' },
  { min: 800, name: 'Aspirante', color: '#A7B0C8' },
  { min: 1000, name: 'Competidor', color: '#48D597' },
  { min: 1200, name: 'Avanzado', color: '#25CFE6' },
  { min: 1400, name: 'Experto', color: '#3985FF' },
  { min: 1600, name: 'Élite', color: '#9B6CFF' },
  { min: 1800, name: 'Maestro', color: '#FF5FA2' },
  { min: 2000, name: 'Gran Maestro', color: '#FF8E3C' },
  { min: 2200, name: 'Leyenda', color: '#FFD16B' },
  { min: 2500, name: 'Inmortal', color: '#FF3B5C' },
];
export const resistTier = (r) => {
  let t = RESIST_TIERS[0], i = 0;
  RESIST_TIERS.forEach((x, k) => { if (r >= x.min) { t = x; i = k; } });
  return { ...t, index: i };
};

// Niveles: hace falta 25·(L−1)·(L+2) XP para llegar al nivel L
export const xpForLevel = (L) => 25 * (L - 1) * (L + 2);
export function levelInfo(xp) {
  let L = 1;
  while (xpForLevel(L + 1) <= xp) L++;
  const cur = xpForLevel(L), next = xpForLevel(L + 1);
  let title = 'Novato';
  for (const [lv, name] of LEVEL_TITLES) if (L >= lv) title = name;
  return { level: L, xp, into: xp - cur, need: next - cur, progress: (xp - cur) / (next - cur), title, special: SPECIAL_LEVELS[L] || null };
}

// Set exclusivo del creador de DUEL CLUB (benuchinb2): no se vende, no se puede conseguir y no da ventajas
export const CREATOR_ITEMS = [
  ['char_creador', 'char', 'mythic', 'El Creador', 'Capucha, corona flotante y un orbe de energía. Personaje exclusivo.'],
  ['hat_corona_creador', 'hat', 'mythic', 'Corona del Creador', 'Corona dorada que flota sobre la cabeza.'],
  ['ent_creador', 'entrance', 'mythic', 'Llegada del Creador', 'Un rayo dorado y la firma del club anuncian tu entrada.'],
  ['vic_creador', 'victory', 'mythic', 'Victoria del Creador', 'Lluvia de oro y violeta con tu corona en el cielo.'],
  ['title_creador', 'title', 'mythic', 'Creador de DUEL CLUB', 'El que hizo el club.'],
  ['card_creador', 'card', 'mythic', 'Tarjeta del Creador', 'Violeta profundo, oro y la firma del club.'],
  ['frame_creador', 'frame', 'mythic', 'Marco del Creador', 'Oro y violeta que giran sin parar.'],
  ['emo_creador', 'emote', 'mythic', '"EL CREADOR"', 'Solo hay uno.'],
  ['skin_creador', 'skin', 'mythic', 'Skin del Creador', 'Violeta con circuitos dorados que laten.'],
].map(([id, category, rarity, name, desc]) => ({ id, category, rarity, name, desc, unlock: 'Exclusivo del creador de DUEL CLUB · no se vende', sale: false, creator: true }));

// Objetos exclusivos del Pase de Batalla (no se venden)
export const PASS_ITEMS = SEASONS.flatMap((se) => Object.entries(se.items).map(([id, [category, rarity, name, desc]]) =>
  ({ id, category, rarity, name, desc, unlock: `Pase de Batalla · ${se.name}`, sale: false, pass: se.id })));

export const ALL_ITEMS = [...ITEMS, ...TITLES, ...MASTERY_ITEMS, ...PASS_ITEMS, ...CREATOR_ITEMS].map((x) => {
  const sale = x.sale && !ACH_ONLY.has(x.id);
  return { ...x, sale, exclusive: !sale && !x.default, price: sale ? RARITIES[x.rarity].price : null };
});
export const ITEM_BY_ID = Object.fromEntries(ALL_ITEMS.map((x) => [x.id, x]));
export const STORE_ITEMS = ALL_ITEMS.filter((x) => x.sale);

// Récords por minijuego: dirección y rango plausible (el servidor descarta valores fuera de rango)
export const GAME_RECORDS = {
  reaction: ['lower', 100, 5000], race: ['lower', 5, 600], pong: ['higher', 0, 3000], platform: ['higher', 0, 900],
  hoop: ['higher', 0, 600], memory: ['higher', 0, 3000], color: ['higher', 0, 100], arena: ['higher', 0, 20000],
  target: ['higher', 0, 9000], beat: ['higher', 0, 200000], fish: ['higher', 0, 9000], blocks: ['higher', 0, 2000000],
  sneak: ['higher', 0, 2000], tennis: ['higher', 0, 2000], tower: ['higher', 0, 5000], blast: ['higher', 0, 9000],
};
