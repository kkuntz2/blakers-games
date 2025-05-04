document.addEventListener('DOMContentLoaded', () => {
    const mazeContainer = document.getElementById('mazeContainer');
    const statusArea = document.getElementById('statusArea');
    const resetButton = document.getElementById('resetButton');
    const winMessage = document.getElementById('winMessage');

    // --- Maze Configuration ---
    // Dimensions MUST BE ODD numbers for the generator algorithm
    const rows = 15; // e.g., 11, 15, 21 - Larger means more complex
    const cols = 15;

    // --- Maze Definition Constants ---
    const PATH = 0;
    const WALL = 1;
    const START = 2;
    const END = 3;
    const VISITED_DURING_GENERATION = 4; // Temp state for generator

    // --- Game State ---
    let mazeLayout = []; // Will be generated
    let isDrawing = false;
    let currentPathCells = []; // Store the actual HTML cell elements
    let gameWon = false;
    let startCell = null; // Reference to the specific HTML start cell element
    let endCell = null;   // Reference to the specific HTML end cell element

    // --- Maze Generation (Recursive Backtracker / DFS) ---
    function generateMaze(r, c) {
        // Ensure dimensions are odd, adjust if necessary
        const effRows = r % 2 === 0 ? r + 1 : r;
        const effCols = c % 2 === 0 ? c + 1 : c;

        let layout = Array(effRows).fill(null).map(() => Array(effCols).fill(WALL)); // Start with all walls
        let stack = [];

        // Helper to get valid neighbors for generator (moves 2 steps)
        function getNeighbors(row, col) {
            const neighbors = [];
            // Directions: [deltaRow, deltaCol, wallDeltaRow, wallDeltaCol]
            const directions = [
                [-2, 0, -1, 0], // Up
                [2, 0, 1, 0],   // Down
                [0, -2, 0, -1], // Left
                [0, 2, 0, 1]    // Right
            ];
            for (const [dr, dc, wr, wc] of directions) {
                const nr = row + dr; // Neighbor row
                const nc = col + dc; // Neighbor col
                // Check bounds and if the target cell is still a wall (not visited)
                if (nr > 0 && nr < effRows - 1 && nc > 0 && nc < effCols - 1 && layout[nr][nc] === WALL) {
                    neighbors.push({ r: nr, c: nc, wallR: row + wr, wallC: col + wc });
                }
            }
            // Shuffle neighbors for randomness
            for (let i = neighbors.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]]; // Swap
            }
            return neighbors;
        }

        // Start generation from a fixed path cell (e.g., 1, 1)
        const startRow = 1;
        const startCol = 1;
        layout[startRow][startCol] = VISITED_DURING_GENERATION; // Mark as visited
        stack.push([startRow, startCol]);

        while (stack.length > 0) {
            const [currentRow, currentCol] = stack[stack.length - 1]; // Peek at the top
            const neighbors = getNeighbors(currentRow, currentCol);

            if (neighbors.length > 0) {
                // Choose a random valid neighbor
                const next = neighbors[0]; // We shuffled, so just take the first

                // Carve path: mark the wall between and the neighbor cell as visited
                layout[next.wallR][next.wallC] = VISITED_DURING_GENERATION;
                layout[next.r][next.c] = VISITED_DURING_GENERATION;

                // Push the neighbor onto the stack to visit next
                stack.push([next.r, next.c]);
            } else {
                // No unvisited neighbors from this cell, backtrack
                stack.pop();
            }
        }

        // Convert VISITED_DURING_GENERATION back to PATH
        // And place START and END points
        for (let rr = 0; rr < effRows; rr++) {
            for (let cc = 0; cc < effCols; cc++) {
                if (layout[rr][cc] === VISITED_DURING_GENERATION) {
                    layout[rr][cc] = PATH;
                }
            }
        }

        // Place Start and End (ensure they are path cells)
        // (1,1) and (effRows-2, effCols-2) are guaranteed to be paths by the algorithm starting at (1,1)
        layout[1][1] = START;
        layout[effRows - 2][effCols - 2] = END; // Bottom-right corner area

        return layout;
    }


    // --- Create Maze HTML from Layout ---
    function createMaze() {
        // Generate the new maze layout first!
        mazeLayout = generateMaze(rows, cols);
        const actualRows = mazeLayout.length;
        const actualCols = mazeLayout[0].length;

        mazeContainer.innerHTML = ''; // Clear previous maze
        mazeContainer.style.gridTemplateColumns = `repeat(${actualCols}, 1fr)`;
        mazeContainer.style.gridTemplateRows = `repeat(${actualRows}, 1fr)`;
        winMessage.classList.add('hidden'); // Hide win message
        gameWon = false;
        statusArea.textContent = 'Trace the path with your finger!';
        currentPathCells = []; // Clear path array
        startCell = null; // Reset references
        endCell = null;   // Reset references

        for (let r = 0; r < actualRows; r++) {
            for (let c = 0; c < actualCols; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;

                switch (mazeLayout[r][c]) {
                    case WALL: cell.classList.add('wall'); break;
                    case START:
                        cell.classList.add('start', 'path'); // Start is also a path cell
                        startCell = cell; // Store reference to this specific HTML element
                        break;
                    case END:
                        cell.classList.add('end', 'path'); // End is also a path cell
                        endCell = cell; // Store reference to this specific HTML element
                        break;
                    case PATH:
                    default: cell.classList.add('path'); break;
                }
                mazeContainer.appendChild(cell);
            }
        }
        // Debug: Log the generated layout dimensions and references
        // console.log(`Maze generated: ${actualRows}x${actualCols}`);
        // console.log("Start Cell Element:", startCell);
        // console.log("End Cell Element:", endCell);
    }

    // --- Drawing Logic ---

    // Get cell element from touch/mouse coordinates
    function getCellFromPoint(x, y) {
        // elementFromPoint is generally reliable for this setup
        return document.elementFromPoint(x, y);
    }

    // Check if two cells are adjacent (not diagonal)
    function areAdjacent(cell1, cell2) {
        if (!cell1 || !cell2 || !cell1.dataset.row || !cell2.dataset.row) return false; // Basic checks
        const r1 = parseInt(cell1.dataset.row);
        const c1 = parseInt(cell1.dataset.col);
        const r2 = parseInt(cell2.dataset.row);
        const c2 = parseInt(cell2.dataset.col);
        // Strict adjacency (only horizontal/vertical moves)
        return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
    }

    function startDrawing(event) {
        if (gameWon) return;

        const coords = getEventCoordinates(event);
        const cell = getCellFromPoint(coords.x, coords.y);

        // Must start exactly on the designated startCell element
        if (cell && cell === startCell) {
            resetPath(); // Clear any previous partial path visually
            isDrawing = true;
            cell.classList.add('visited');
            currentPathCells.push(cell); // Add the start cell element to our path tracker
            statusArea.textContent = 'Keep going...';
        } else {
            isDrawing = false; // Didn't start on the princess
        }
    }

    function drawPath(event) {
        if (!isDrawing || gameWon) return;
        event.preventDefault(); // Prevent scrolling/zooming while finger is down

        const coords = getEventCoordinates(event);
        const cell = getCellFromPoint(coords.x, coords.y);
        const lastCell = currentPathCells.length > 0 ? currentPathCells[currentPathCells.length - 1] : null;

        // Check if we are over a valid cell, it's not a wall, and we have a path started
        if (cell && cell.classList.contains('cell') && !cell.classList.contains('wall') && lastCell) {

            // Only add if it's different from last cell, not already visited, and adjacent
            if (cell !== lastCell && !cell.classList.contains('visited') && areAdjacent(lastCell, cell)) {
                 cell.classList.add('visited');
                 currentPathCells.push(cell); // Add the actual element

                // Check for win condition by comparing with the stored endCell element
                if (cell === endCell) {
                    winGame();
                }
            }
            // --- Optional Backtracking (can be added here if needed) ---
            // If you move back onto the second-to-last cell, remove the last one
            // else if (currentPathCells.length > 1 && cell === currentPathCells[currentPathCells.length - 2]) {
            //    lastCell.classList.remove('visited');
            //    currentPathCells.pop();
            //}
        }
    }

    function stopDrawing(event) {
        if (!isDrawing) return; // Only act if we were actually drawing
        isDrawing = false;
        const lastCell = currentPathCells.length > 0 ? currentPathCells[currentPathCells.length - 1] : null;

        // If game not already won, check if we stopped not on the end cell
        if (!gameWon) {
            if (lastCell && lastCell === endCell) {
                // Ended on the end cell, winGame should have already handled it
            } else {
                 // Didn't end on the castle
                 statusArea.textContent = 'Oops, try again from the start!';
                 // Optionally reset the path visually immediately:
                 // resetPath();
            }
        }
    }

    function winGame() {
        isDrawing = false; // Ensure drawing stops
        gameWon = true;
        statusArea.textContent = 'You reached the castle!';
        winMessage.classList.remove('hidden'); // Show win message
        // Optional: Vibrate on win
        if (navigator.vibrate) {
            navigator.vibrate(200); // Vibrate for 200ms
        }
    }

    // Resets the visual path, but not the maze structure
    function resetPath() {
        currentPathCells.forEach(c => c.classList.remove('visited')); // Remove styling
        currentPathCells = []; // Clear the array of tracked cells
        // Don't necessarily change status here, startDrawing or stopDrawing will.
        gameWon = false; // Reset win state if path is reset
        if (!winMessage.classList.contains('hidden')) {
             winMessage.classList.add('hidden'); // Hide win message if visible
        }
    }


    // --- Event Listeners ---

    // Helper to get coordinates consistently for mouse and touch events
    function getEventCoordinates(event) {
        let x, y;
        if (event.touches && event.touches.length > 0) {
            // Touch event - use the first touch point
            x = event.touches[0].clientX;
            y = event.touches[0].clientY;
        } else {
            // Mouse event
            x = event.clientX;
            y = event.clientY;
        }
        return { x, y };
    }

    // Add Mouse event listeners
    mazeContainer.addEventListener('mousedown', startDrawing);
    mazeContainer.addEventListener('mousemove', drawPath);
    mazeContainer.addEventListener('mouseup', stopDrawing);
    mazeContainer.addEventListener('mouseleave', stopDrawing); // Stop drawing if mouse leaves maze area

    // Add Touch event listeners
    // Use { passive: false } because we call preventDefault() in drawPath
    mazeContainer.addEventListener('touchstart', startDrawing, { passive: false });
    mazeContainer.addEventListener('touchmove', drawPath, { passive: false });
    mazeContainer.addEventListener('touchend', stopDrawing);
    // touchend outside the element might not always trigger mouseleave equivalent cleanly,
    // but stopDrawing logic should handle the end of the touch interaction.

    // Reset button listener - calls createMaze to generate and draw a new one
    resetButton.addEventListener('click', createMaze);

    // --- Initial Setup ---
    createMaze(); // Generate and draw the first maze when the page loads

}); // End DOMContentLoaded