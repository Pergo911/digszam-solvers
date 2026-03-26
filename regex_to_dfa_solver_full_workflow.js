// === Regex → NFA → DFA → Moodle Answer Injector ===
// HASZNÁLATI UTASÍTÁS:
// 1. Másold be ezt a szkriptet a böngésző konzoljába a Moodle feladatoldalon.
// 2. Add meg a regexet.
// 3. Solver lefut, és a helyes válasz submit-kor lesz injektálva.
(() => {
  "use strict";

  try {
    // ─── Step 1: Ask for regex input ───
    const regexInput = prompt("Add meg a reguláris kifejezést:");
    if (regexInput === null || regexInput.trim() === "") {
      throw new Error("Nincs megadva reguláris kifejezés.");
    }

    // ─── Engine: parseRegex (from CyberZHG/toolbox lexical.js) ───
    function parseRegex(text) {
      function parseSub(text, begin, end, first) {
        var i, sub, last = 0,
          node = { 'begin': begin, 'end': end },
          virNode, tempNode, stack = 0, parts = [];
        if (text.length === 0) {
          return 'Hiba: üres bemenet itt: ' + begin + '.';
        }
        if (first) {
          for (i = 0; i <= text.length; i += 1) {
            if (i === text.length || (text[i] === '|' && stack === 0)) {
              if (last === 0 && i === text.length) {
                return parseSub(text, begin + last, begin + i, false);
              }
              sub = parseSub(text.substr(last, i - last), begin + last, begin + i, true);
              if (typeof sub === 'string') { return sub; }
              parts.push(sub);
              last = i + 1;
            } else if (text[i] === '(') {
              stack += 1;
            } else if (text[i] === ')') {
              stack -= 1;
            }
          }
          if (parts.length === 1) { return parts[0]; }
          node.type = 'or';
          node.parts = parts;
        } else {
          for (i = 0; i < text.length; i += 1) {
            if (text[i] === '(') {
              last = i + 1;
              i += 1;
              stack = 1;
              while (i < text.length && stack !== 0) {
                if (text[i] === '(') { stack += 1; }
                else if (text[i] === ')') { stack -= 1; }
                i += 1;
              }
              if (stack !== 0) {
                return 'Hiba: hiányzó záró zárójel ennél: ' + (begin + last) + '.';
              }
              i -= 1;
              sub = parseSub(text.substr(last, i - last), begin + last, begin + i, true);
              if (typeof sub === 'string') { return sub; }
              sub.begin -= 1;
              sub.end += 1;
              parts.push(sub);
            } else if (text[i] === '*') {
              if (parts.length === 0) {
                return 'Hiba: váratlan * itt: ' + (begin + i) + '.';
              }
              tempNode = { 'begin': parts[parts.length - 1].begin, 'end': parts[parts.length - 1].end + 1 };
              tempNode.type = 'star';
              tempNode.sub = parts[parts.length - 1];
              parts[parts.length - 1] = tempNode;
            } else if (text[i] === '+') {
              if (parts.length === 0) {
                return 'Hiba: váratlan + itt: ' + (begin + i) + '.';
              }
              virNode = { 'begin': parts[parts.length - 1].begin, 'end': parts[parts.length - 1].end + 1 };
              virNode.type = 'star';
              virNode.sub = parts[parts.length - 1];
              tempNode = { 'begin': parts[parts.length - 1].begin, 'end': parts[parts.length - 1].end + 1 };
              tempNode.type = 'cat';
              tempNode.parts = [parts[parts.length - 1], virNode];
              parts[parts.length - 1] = tempNode;
            } else if (text[i] === '?') {
              if (parts.length === 0) {
                return 'Hiba: váratlan ? itt: ' + (begin + i) + '.';
              }
              virNode = { 'begin': parts[parts.length - 1].begin, 'end': parts[parts.length - 1].end + 1 };
              virNode.type = 'empty';
              tempNode = { 'begin': parts[parts.length - 1].begin, 'end': parts[parts.length - 1].end + 1 };
              tempNode.type = 'or';
              tempNode.parts = [parts[parts.length - 1], virNode];
              parts[parts.length - 1] = tempNode;
            } else if (text[i] === '\u03F5') {
              tempNode = { 'begin': begin + i, 'end': begin + i + 1 };
              tempNode.type = 'empty';
              parts.push(tempNode);
            } else {
              tempNode = { 'begin': begin + i, 'end': begin + i + 1 };
              tempNode.type = 'text';
              tempNode.text = text[i];
              parts.push(tempNode);
            }
          }
          if (parts.length === 1) { return parts[0]; }
          node.type = 'cat';
          node.parts = parts;
        }
        return node;
      }
      return parseSub(text, 0, text.length, true);
    }

    // ─── Engine: regexToNfa (from CyberZHG/toolbox lexical.js) ───
    function regexToNfa(text) {
      function generateGraph(node, start, end, count) {
        var i, last, temp, tempStart, tempEnd;
        if (!start.hasOwnProperty('id')) {
          start.id = count;
          count += 1;
        }
        switch (node.type) {
          case 'empty':
            start.edges.push(['\u03F5', end]);
            break;
          case 'text':
            start.edges.push([node.text, end]);
            break;
          case 'cat':
            last = start;
            for (i = 0; i < node.parts.length - 1; i += 1) {
              temp = { 'type': '', 'edges': [] };
              count = generateGraph(node.parts[i], last, temp, count);
              last = temp;
            }
            count = generateGraph(node.parts[node.parts.length - 1], last, end, count);
            break;
          case 'or':
            for (i = 0; i < node.parts.length; i += 1) {
              tempStart = { 'type': '', 'edges': [] };
              tempEnd = { 'type': '', 'edges': [['\u03F5', end]] };
              start.edges.push(['\u03F5', tempStart]);
              count = generateGraph(node.parts[i], tempStart, tempEnd, count);
            }
            break;
          case 'star':
            tempStart = { 'type': '', 'edges': [] };
            tempEnd = { 'type': '', 'edges': [['\u03F5', tempStart], ['\u03F5', end]] };
            start.edges.push(['\u03F5', tempStart]);
            start.edges.push(['\u03F5', end]);
            count = generateGraph(node.sub, tempStart, tempEnd, count);
            break;
        }
        if (!end.hasOwnProperty('id')) {
          end.id = count;
          count += 1;
        }
        return count;
      }
      var ast = parseRegex(text),
        start = { 'type': 'start', 'edges': [] },
        accept = { 'type': 'accept', 'edges': [] };
      if (typeof ast === 'string') {
        return ast;
      }
      generateGraph(ast, start, accept, 0);
      return start;
    }

    // ─── Engine: nfaToDfa (from CyberZHG/toolbox lexical.js) ───
    function nfaToDfa(nfa) {
      function getClosure(nodes) {
        var i, closure = [], stack = [], symbols = [], type = '', top;
        for (i = 0; i < nodes.length; i += 1) {
          stack.push(nodes[i]);
          closure.push(nodes[i]);
          if (nodes[i].type === 'accept') { type = 'accept'; }
        }
        while (stack.length > 0) {
          top = stack.pop();
          for (i = 0; i < top.edges.length; i += 1) {
            if (top.edges[i][0] === '\u03F5') {
              if (closure.indexOf(top.edges[i][1]) < 0) {
                stack.push(top.edges[i][1]);
                closure.push(top.edges[i][1]);
                if (top.edges[i][1].type === 'accept') { type = 'accept'; }
              }
            } else {
              if (symbols.indexOf(top.edges[i][0]) < 0) {
                symbols.push(top.edges[i][0]);
              }
            }
          }
        }
        closure.sort(function (a, b) { return a.id - b.id; });
        symbols.sort();
        return {
          'key': closure.map(function (x) { return x.id; }).join(','),
          'items': closure,
          'symbols': symbols,
          'type': type,
          'edges': [],
          'trans': {}
        };
      }
      function getClosedMove(closure, symbol) {
        var i, j, node, nexts = [];
        for (i = 0; i < closure.items.length; i += 1) {
          node = closure.items[i];
          for (j = 0; j < node.edges.length; j += 1) {
            if (symbol === node.edges[j][0]) {
              if (nexts.indexOf(node.edges[j][1]) < 0) {
                nexts.push(node.edges[j][1]);
              }
            }
          }
        }
        return getClosure(nexts);
      }
      function toAlphaCount(n) {
        var a = 'A'.charCodeAt(0), z = 'Z'.charCodeAt(0),
          len = z - a + 1, s = '';
        while (n >= 0) {
          s = String.fromCharCode(n % len + a) + s;
          n = Math.floor(n / len) - 1;
        }
        return s;
      }
      var i, first = getClosure([nfa]),
        states = {}, front = 0, top, closure, queue = [first], count = 0;
      first.id = toAlphaCount(count);
      states[first.key] = first;
      while (front < queue.length) {
        top = queue[front];
        front += 1;
        for (i = 0; i < top.symbols.length; i += 1) {
          closure = getClosedMove(top, top.symbols[i]);
          if (!states.hasOwnProperty(closure.key)) {
            count += 1;
            closure.id = toAlphaCount(count);
            states[closure.key] = closure;
            queue.push(closure);
          }
          top.trans[top.symbols[i]] = states[closure.key];
          top.edges.push([top.symbols[i], states[closure.key]]);
        }
      }
      return first;
    }

    // ─── Step 2: Convert regex → NFA → DFA → HTML table ───
    // genDfaTable from nfa2dfa.js
    function toNature(col) {
      var i, j, base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', result = 0;
      for (i = 0, j = col.length - 1; i < col.length; i += 1, j -= 1) {
        result += Math.pow(base.length, j) * (base.indexOf(col[i]) + 1);
      }
      return result;
    }

    function genDfaTable(start) {
      var i, j, states = {}, nodes = [], stack = [start], symbols = [], top, html = '';
      while (stack.length > 0) {
        top = stack.pop();
        if (!states.hasOwnProperty(top.id)) {
          states[top.id] = top;
          top.nature = toNature(top.id);
          nodes.push(top);
          for (i = 0; i < top.edges.length; i += 1) {
            if (top.edges[i][0] !== '\u03F5' && symbols.indexOf(top.edges[i][0]) < 0) {
              symbols.push(top.edges[i][0]);
            }
            stack.push(top.edges[i][1]);
          }
        }
      }
      nodes.sort(function (a, b) { return a.nature - b.nature; });
      symbols.sort();
      html += '<table class="table">';
      html += '<thead><tr>';
      html += '<th>NFA STATE</th><th>DFA STATE</th><th>TYPE</th>';
      for (i = 0; i < symbols.length; i += 1) {
        html += '<th>' + symbols[i] + '</th>';
      }
      html += '</tr></thead><tbody>';
      for (i = 0; i < nodes.length; i += 1) {
        html += '<tr>';
        html += '<td>{' + nodes[i].key + '}</td>';
        html += '<td>' + nodes[i].id + '</td>';
        html += '<td>' + nodes[i].type + '</td>';
        for (j = 0; j < symbols.length; j += 1) {
          html += '<td>';
          if (nodes[i].trans.hasOwnProperty(symbols[j])) {
            html += nodes[i].trans[symbols[j]].id;
          }
          html += '</td>';
        }
        html += '</tr>';
      }
      html += '</tbody></table>';
      return html;
    }

    const nfa = regexToNfa(regexInput);
    if (typeof nfa === 'string') {
      throw new Error("Regex feldolgozási hiba: " + nfa);
    }
    const dfa = nfaToDfa(nfa);
    const tableHtml = genDfaTable(dfa);

    // ─── Step 2b: Convert HTML table to Moodle JSON (from nfa_table_to_moodle.js) ───
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

      const nodeGeometry = nodes.map(() => [203.23333740234375, 189.5500030517578]);

      const edgeGeometryTemplates = [
        { lineAngleAdjust: 0, parallelPart: 0.5, perpendicularPart: 0 },
        { deltaX: -86, deltaY: 0 },
        { lineAngleAdjust: 3.141592653589793, parallelPart: 0.5625, perpendicularPart: -66.5 },
      ];

      const edgeGeometry = edges.map((_, i) => {
        return { ...edgeGeometryTemplates[i % edgeGeometryTemplates.length] };
      });

      return { edgeGeometry, nodeGeometry, nodes, edges };
    }

    const answer = JSON.stringify(convertTableToJSON(tableHtml));

    // ─── Step 3: Inject answer into Moodle form (from moodle_request_inject.js) ───
    const form = document.querySelector("form");
    if (!form) {
      throw new Error("Nem található <form> elem ezen az oldalon. Biztosan Moodle tesztoldalon vagy?");
    }

    const replaceAnswer = (e) => {
      const formData = e.formData;
      const answerKey = Array.from(formData.keys()).find((v) => v.includes("answer"));

      if (answerKey === undefined) {
        form.removeEventListener("formdata", replaceAnswer);
        throw new Error("Nem található 'answer' mező az űrlapadatokban.");
      }

      formData.set(answerKey, answer);
      form.removeEventListener("formdata", replaceAnswer);
    };

    form.addEventListener("formdata", replaceAnswer);
    console.log("%c\u2713 Sikeres csere! A helyes válasz submit-kor lesz injektálva.", "color: green; font-weight: bold;");

  } catch (err) {
    console.error("[Megoldó hiba]", err.message);
    console.error(err.stack);
  }
})();
