/**
 * Creates an adjacency matrix from a graph object
 * @param {Object} graph - Graph object with 'nodes' and 'edges'
 * @param {boolean} includeSelfLoops - Whether to include self-loops (diagonal elements)
 * @returns {boolean[][]} - The adjacency matrix
 */
function createAdjacencyMatrix(graph, includeSelfLoops = false) {
  const n = graph.nodes.length;
  // Initialize a n x n matrix with all false values
  const matrix = Array.from({ length: n }, () => Array(n).fill(false));

  // For every edge, set the corresponding matrix cell to true
  graph.edges.forEach((edge) => {
    const [from, to] = edge; // ignore any additional elements
    matrix[from][to] = true;
  });

  // Optionally mark each node as reachable from itself
  if (includeSelfLoops) {
    for (let i = 0; i < n; i++) {
      matrix[i][i] = true;
    }
  }

  return matrix;
}

/**
 * Computes the transitive closure of a graph using Floyd–Warshall.
 * @param {Object} graph - Graph object with 'nodes' and 'edges'
 * @returns {boolean[][]} - The transitive closure matrix
 */
function transitiveClosure(graph) {
  const closure = createAdjacencyMatrix(graph, false);
  const n = graph.nodes.length;

  // Floyd-Warshall algorithm: update closure if an intermediate node k connects i to j
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        closure[i][j] = closure[i][j] || (closure[i][k] && closure[k][j]);
      }
    }
  }

  return closure;
}

/**
 * Computes the reflexive closure of a graph.
 * @param {Object} graph - Graph object with 'nodes' and 'edges'
 * @returns {boolean[][]} - The reflexive closure matrix
 */
function reflexiveClosure(graph) {
  return createAdjacencyMatrix(graph, true);
}

/**
 * Computes the symmetric closure of a graph.
 * @param {Object} graph - Graph object with 'nodes' and 'edges'
 * @returns {boolean[][]} - The symmetric closure matrix
 */
function symmetricClosure(graph) {
  const closure = createAdjacencyMatrix(graph, false);
  const n = graph.nodes.length;

  // For each edge in the matrix, ensure its symmetric counterpart exists
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (closure[i][j]) {
        closure[j][i] = true; // Add the symmetric edge
      }
    }
  }

  return closure;
}

/**
 * Returns the difference between the input matrix and the initial matrix.
 * @param {boolean[][]} input - The transitive closure matrix
 * @param {Object} graph - Graph object with 'nodes' and 'edges'
 * @returns {boolean[][]} - The difference matrix
 */
function findDifference(input, graph) {
  const initial = createAdjacencyMatrix(graph, false);
  const n = graph.nodes.length;

  // Calculate difference matrix
  const difference = Array.from({ length: n }, () => Array(n).fill(false));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      difference[i][j] = input[i][j] && !initial[i][j];
    }
  }

  return difference;
}

function createDiffText(difference, nodes) {
  let text = "";
  for (let i = 0; i < difference.length; i++) {
    for (let j = 0; j < difference.length; j++) {
      if (difference[i][j]) {
        text += `${nodes[i][0]}->${nodes[j][0]}\n`;
      }
    }
  }
  return text;
}

// Extract graph from the document
const graph = JSON.parse(
  document.querySelectorAll(".coderunner-answer, .edit_code")[0].value
);

// Compute the closures
const transitive = transitiveClosure(graph);
const reflexive = reflexiveClosure(graph);
const symmetric = symmetricClosure(graph);

// Compute the difference between the input matrix and the initial matrix
const trans_diff = findDifference(transitive, graph);
const reflex_diff = findDifference(reflexive, graph);
const symmetric_diff = findDifference(symmetric, graph);

// Display the results
console.table([
  {
    TRANZITIV: createDiffText(trans_diff, graph.nodes),
    REFLEXIV: createDiffText(reflex_diff, graph.nodes),
    SZIMMETRIKUS: createDiffText(symmetric_diff, graph.nodes),
  },
]);
console.log(
  "%cHUZD BE A TABLAZATBAN LEVO ELEKET A FELADAT MEGOLDASAHOZ",
  "font-weight: bold; font-size: 16px;"
);
console.log("sorry az ekezetek miatt, a fajlmegoszto beszarik a magyartol :(")