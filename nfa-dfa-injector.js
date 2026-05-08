// === NFA/DFA → Moodle Form Injector ===
//
// USAGE:
//   Paste this script into the browser console on the Moodle question page,
//   then call:
//
//     injectDfa(input)
//
//   where `input` is one of the two supported formats (see below).
//
// ─── INPUT FORMAT A: HTML Table ──────────────────────────────────────────────
//
//   A string produced by nfa2dfa.js / genDfaTable(). Shape:
//
//   <table class="table">
//     <thead>
//       <tr>
//         <th>NFA STATE</th>   ← ignored (NFA state set key)
//         <th>DFA STATE</th>   ← state name (A, B, C …)
//         <th>TYPE</th>        ← "start", "accept", or ""
//         <th>a</th>           ← one <th> per alphabet symbol
//         <th>b</th>
//         …
//       </tr>
//     </thead>
//     <tbody>
//       <tr>
//         <td>{0,1,2}</td>     ← NFA key (ignored)
//         <td>A</td>           ← DFA state name
//         <td>start</td>       ← type: "" | "start" | "accept"
//         <td>B</td>           ← transition target for symbol "a"
//         <td></td>            ← transition target for symbol "b" (empty = none)
//       </tr>
//       …
//     </tbody>
//   </table>
//
//   The first row in <tbody> is treated as the start state regardless of TYPE.
//
// ─── INPUT FORMAT B: JSON Object ─────────────────────────────────────────────
//
//   Pass a plain object (or JSON string) with the following shape:
//
//   {
//     "nodes": [
//       ["A", false],   // [stateName: string, isAccepting: boolean]
//       ["B", true],
//       …
//     ],
//     "edges": [
//       [-1, 0, ""],    // start arrow → index 0 (always first, label always "")
//       [0, 1, "a"],    // fromIndex, toIndex, label (comma-separated if multiple)
//       [1, 0, "b"],
//       …
//     ]
//   }
//
//   Node indices match the order in "nodes" (0-based).
//   The start edge [-1, 0, ""] is mandatory and must be the first edge.
//   Geometry is auto-generated; you can optionally provide
//   "nodeGeometry" and "edgeGeometry" arrays to override positions.
//
// ─── EXAMPLE ─────────────────────────────────────────────────────────────────
//
//   injectDfa({
//     nodes: [["A", false], ["B", true], ["C", false]],
//     edges: [
//       [-1, 0, ""],
//       [0, 1, "a"],
//       [1, 2, "b"],
//       [2, 0, "a,b"]
//     ]
//   });
//
// ─────────────────────────────────────────────────────────────────────────────

(() => {
  "use strict";

  // Converts an HTML-table DFA representation to the Moodle answer JSON object.
  function convertTableToJSON(tableHtml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(tableHtml, "text/html");
    const table = doc.querySelector("table");

    const headers = Array.from(table.querySelectorAll("thead th")).map((th) =>
      th.textContent.trim()
    );
    const symbolColumns = headers.slice(3);
    const rows = Array.from(table.querySelectorAll("tbody tr"));

    const nodes = rows.map((row) => {
      const cells = Array.from(row.querySelectorAll("td"));
      const stateName = cells[1].textContent.trim();
      const isAccepting = cells[2].textContent.trim() === "accept";
      return [stateName, isAccepting];
    });

    const stateToIndex = {};
    nodes.forEach((node, index) => {
      stateToIndex[node[0]] = index;
    });

    const edges = [];
    edges.push([-1, 0, ""]);

    rows.forEach((row) => {
      const cells = Array.from(row.querySelectorAll("td"));
      const fromState = cells[1].textContent.trim();
      const fromStateIndex = stateToIndex[fromState];
      const transitions = {};

      for (let i = 0; i < symbolColumns.length; i++) {
        const symbol = symbolColumns[i];
        const toState = cells[i + 3].textContent.trim();
        if (toState) {
          if (!transitions[toState]) { transitions[toState] = []; }
          transitions[toState].push(symbol);
        }
      }

      for (const [toState, symbols] of Object.entries(transitions)) {
        const toStateIndex = stateToIndex[toState];
        edges.push([fromStateIndex, toStateIndex, symbols.join(",")]);
      }
    });

    return buildMoodleObject(nodes, edges);
  }

  // Attaches auto-generated geometry and returns the full Moodle answer object.
  function buildMoodleObject(nodes, edges, nodeGeometry, edgeGeometry) {
    const defaultNodeGeometry = nodes.map(() => [203.23333740234375, 189.5500030517578]);
    const edgeGeometryTemplates = [
      { lineAngleAdjust: 0, parallelPart: 0.5, perpendicularPart: 0 },
      { deltaX: -86, deltaY: 0 },
      { lineAngleAdjust: 3.141592653589793, parallelPart: 0.5625, perpendicularPart: -66.5 },
    ];
    const defaultEdgeGeometry = edges.map((_, i) => ({
      ...edgeGeometryTemplates[i % edgeGeometryTemplates.length],
    }));

    return {
      edgeGeometry: edgeGeometry || defaultEdgeGeometry,
      nodeGeometry: nodeGeometry || defaultNodeGeometry,
      nodes,
      edges,
    };
  }

  // Parses the user-supplied input into a Moodle answer object.
  function parseInput(input) {
    if (typeof input === "string") {
      const trimmed = input.trim();
      if (trimmed.startsWith("<")) {
        // HTML table format
        return convertTableToJSON(trimmed);
      }
      // JSON string
      input = JSON.parse(trimmed);
    }
    // Plain object with nodes/edges
    if (input && Array.isArray(input.nodes) && Array.isArray(input.edges)) {
      return buildMoodleObject(
        input.nodes,
        input.edges,
        input.nodeGeometry || null,
        input.edgeGeometry || null
      );
    }
    throw new Error(
      "Érvénytelen bemenet. Adj meg egy HTML táblát vagy { nodes, edges } objektumot."
    );
  }

  // Injects the computed answer into the Moodle form on the next submit.
  window.injectDfa = function injectDfa(input) {
    try {
      const moodleObj = parseInput(input);
      const answer = JSON.stringify(moodleObj);

      const form = document.querySelector("form");
      if (!form) {
        throw new Error(
          "Nem található <form> elem ezen az oldalon. Biztosan Moodle tesztoldalon vagy?"
        );
      }

      const replaceAnswer = (e) => {
        const formData = e.formData;
        const answerKey = Array.from(formData.keys()).find((v) =>
          v.includes("answer")
        );

        if (answerKey === undefined) {
          form.removeEventListener("formdata", replaceAnswer);
          throw new Error(
            "Nem található 'answer' mező az űrlapadatokban."
          );
        }

        formData.set(answerKey, answer);
        form.removeEventListener("formdata", replaceAnswer);
      };

      form.addEventListener("formdata", replaceAnswer);
      console.log(
        "%c✓ Kész! A válasz submit-kor lesz injektálva.",
        "color: green; font-weight: bold;"
      );
    } catch (err) {
      console.error("[NFA Injector hiba]", err.message);
      console.error(err.stack);
    }
  };

  console.log(
    "%c✓ NFA Injector betöltve. Használat: injectDfa(input)",
    "color: blue; font-weight: bold;"
  );
})();
