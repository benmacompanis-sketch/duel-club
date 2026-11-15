# Imágenes para DUEL CLUB con Gemini (estilo HISTORIETA)

Todo el juego usa una identidad de **historieta/cómic**: tinta negra gruesa, sombras duras, tramado de puntos (halftone), colores planos y fuertes. Las imágenes tienen que seguir ese estilo, no el 3D tipo Pixar.

**Cómo usar esta guía:** pegá siempre primero la **BASE** y después la descripción. Si una imagen sale rara, pedile "otra versión con la misma frase" en vez de cambiar el texto: así todas quedan parejas.

---

## 1. Formatos y nombres

| Tipo | Tamaño | Formato | Fondo | Carpeta | Nombre |
|---|---|---|---|---|---|
| Personaje | 1024 × 1024 | PNG | transparente (o blanco liso, se recorta) | `public/assets/chars/` | `<id>.png` (ej. `volt.png`) |
| Pose de victoria / derrota (opcional) | 1024 × 1024 | PNG | transparente | `public/assets/chars/` | `<id>_win.png`, `<id>_lose.png` |
| Accesorio | 512 × 512 | PNG | transparente | `public/assets/acc/` | `<id>.png` (ej. `hat_corona.png`) |
| Portada de minijuego | 800 × 800 | PNG o WebP | con fondo (es una viñeta) | `public/assets/covers/` | `<id>.png` (ej. `pong.png`) |

- Optimizá antes de subir (por ejemplo con squoosh.app): menos de **250 KB** por imagen.
- Después de subir, **agregá el nombre al manifiesto** `public/assets/manifest.json` (ver sección 5). El juego solo usa las imágenes que están en el manifiesto; las demás siguen dibujadas por código.

## 2. BASE para personajes y accesorios
> Comic book illustration, bold thick black ink outlines, flat vivid colors, cel shading with hard-edged shadows, halftone dot texture in the shadows, dynamic cartoon proportions, expressive face, full body, three-quarter view facing right, centered, isolated on a plain white background, no text, no frame, square image.

**Importante:** el cuerpo principal en **blanco o gris muy claro** (el juego le aplica el color de cada jugador). Los detalles (ojos, picos, botones, rayos) sí pueden tener color.

| Archivo | Descripción (después de la BASE) |
|---|---|
| volt.png | a small friendly robot with a rounded square screen face showing two glowing cyan eyes, an antenna with a yellow light bulb, white body, gray metal arms, confident pose |
| mochi.png | a cute bouncy jelly blob with a dome shape, glossy white body, big shiny eyes and pink cheeks, no arms, playful pose |
| pico.png | a small round speedy bird with a short orange beak, an orange feather crest, white body, thin orange legs, running pose |
| brik.png | a sturdy golem made of stacked white blocks, square head, a yellow lightning symbol on the chest, arms crossed |
| nimbus.png | a fluffy storm cloud spirit with a sleepy smirk, white puffy body, a small yellow lightning bolt crackling below |
| fang.png | a clever little fox standing on two legs, white fur, cream belly, pink inner ears, huge fluffy tail, sly grin |
| ozzy.png | a one-eyed alien with one big green eye, white jelly body, wavy tentacle legs, two antennae with lime tips |
| rex.png | a small cute dinosaur, white body, little yellow spikes on its back, tiny arms raised, roaring happily |
| npc.png | an ordinary guy with brown hair, a white plaid shirt, a blank friendly stare, hands in pockets |
| formal.png | a very serious office worker with glasses, slicked hair, white shirt, dark suit and tie, holding a briefcase |
| frigo.png | a living refrigerator with a small screen face, white body, colorful fridge magnets, tiny wheels |
| toasty.png | a character with a toaster for a head with two toast slices popping out, white body, excited expression |
| silla.png | a white plastic patio chair with a cute face on the backrest, standing like a character |
| tuntun.png | a wooden log character holding a wooden bat, simple determined face, blue headband |
| creador.png | a mysterious hooded figure in a long purple robe with gold trim, glowing golden eyes inside the hood, a small floating golden crown above the hood, holding a glowing purple orb |

Poses extra (opcional): la misma frase agregando **"celebrating with both arms up, comic motion lines"** → `<id>_win.png`, y **"sad, slumped, looking down, small rain cloud"** → `<id>_lose.png`.

### Accesorios (BASE + descripción, sin personaje)
> …mismo estilo, **only the accessory object, no character**, centered, front view.

Ejemplos: `hat_corona.png` "a golden crown with three points and red gems", `hat_vikingo.png` "a viking helmet with two white horns", `face_lentes.png` "pixelated black sunglasses 'deal with it' meme", `body_capa.png` "a short red superhero cape seen from the front".

## 3. BASE para portadas de minijuegos
> Comic book cover panel, bold thick black ink outlines, flat vivid colors, halftone dots, dramatic diagonal composition, speed lines and impact bursts, one blue character versus one red character, square image, no text, no logo.

| Archivo | Descripción (después de la BASE) |
|---|---|
| reaction.png | two characters slamming big buttons as a traffic light turns green, lightning sparks |
| race.png | two tiny cars drifting around a tight curve of a race track, smoke and speed lines |
| pong.png | two glowing paddles hitting a ball that leaves a fiery trail, center line, bumpers |
| platform.png | two characters jumping between crumbling floating platforms over a void, lasers |
| hoop.png | a basketball flying into a hoop, two shooters at the bottom, golden rim |
| memory.png | face-down cards on a table, two hands flipping matching cards, sparkles |
| color.png | a grid floor half blue half red, two characters painting tiles as they run, paint splashes |
| arena.png | two cartoon fighters clashing fists in a dojo, impact burst |
| target.png | crosshairs aiming at colorful bullseye targets, a bomb target to avoid |
| beat.png | four arrow lanes with falling notes, two characters dancing, music notes |
| fish.png | two small boats fishing on a sunset sea, a legendary golden fish jumping |
| blocks.png | falling colorful blocks in two wells, a line clearing with a flash |
| sneak.png | a dark maze lit by a flashlight cone, glowing crystals, a shadow trap |
| tennis.png | two players on a tennis court, the ball blazing over the net |
| tower.png | two climbers jumping up a tall tower of platforms, springs and lasers |
| blast.png | two characters dodging bouncing explosive orbs in an arena, shields |

## 4. Logo
El logo oficial ya está hecho y versionado en `public/brand/`:
- `logo-dark.svg` / `logo-dark.png` (fondo oscuro), `logo-light.svg` / `logo-light.png` (fondo claro), `logo-dark-transparent.png`.
- `favicon.svg`, `favicon-32.png`, `icon-192.png`, `icon-512.png` (pestaña, celular).

## 5. Manifiesto (para que el juego use las imágenes)
Editá `public/assets/manifest.json` y agregá los nombres (sin extensión) de lo que subiste:

```json
{ "covers": ["pong", "race"], "chars": [], "acc": [] }
```

- **Portadas:** si un minijuego está en `covers`, el juego muestra la imagen en lugar del dibujo.
- **Personajes y accesorios:** quedan registrados para la próxima etapa (el reemplazo dentro de las partidas necesita ajustar posiciones de accesorios por personaje; se activa cuando estén todas las imágenes de un personaje).

Si una imagen no está en el manifiesto o no carga, el juego sigue usando el dibujo por código: nunca se rompe nada.
