## Szkriptek

### `relacios-solver.js`

Relációs feladatok megoldásához. Kiszámolja a gráfok szimmetrikus, reflexív és tranzitív lezártját.

1. Illeszd be a konzolba a feladat oldalán a moodle-ben.
2. Húzd az éleket a táblázat megfelelő oszlopából.

### `nfa-dfa-injector.js`

Ha szövegesen van egy NFA-d vagy DFA-d, automata "felrajzolja" NFA/DFA feladatoknál. Legtöbbször arra használtam, hogy LLM generált feladatmegoldásokat ne kelljen manuálisan felrajzolni.

1. Illeszd be a konzolba a feladat oldalán a moodle-ben.
2. Hívd meg az `injectDfa(input)` függvényt, ahol "`input`" a bevinni kívánt NFA-t/DFA.
3. Kattints a "Következő Oldal" vagy "Ellenőrzés" gombra

Ennek formátuma lehet egy HTML table vagy egy JSON objektum. (További infó a fájlban.)

### `regex_to_dfa_solver_full_workflow.js`

Előző szkript automatizált verziója.

**Regex -> DFA** vagy **Regex -> NFA** feladatok megoldásához.

1. Illeszd be a konzolba a feladat oldalán a moodle-ben.
2. Add meg a regexet a felugró ablakban.
3. Kattints a "Következő Oldal" vagy "Ellenőrzés" gombra

## Promptok

### `prompts.md`

Félév során használt, elmentett promptjaim ömlesztett verzióban :)
