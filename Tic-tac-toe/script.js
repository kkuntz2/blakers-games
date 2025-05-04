// Get references to HTML elements
const statusDisplay = document.getElementById('statusArea');
const gameBoard = document.getElementById('gameBoard');
const cells = document.querySelectorAll('.cell');
const restartButton = document.getElementById('restartButton');

// Game variables
let gameActive = true;
let currentPlayer = 'X'; // X always starts
let gameState = ["", "", "", "", "", "", "", "", ""]; // Represents the 3x3 board

// Messages
const winningMessage = () => `${currentPlayer} Wins! 🎉`;
const drawMessage = () => `It's a Tie! 🤝`;
const currentPlayerTurn = () => `${currentPlayer}'s Turn`;

// Winning combinations (indices of the gameState array)
const winningConditions = [
    [0, 1, 2], // Top row
    [3, 4, 5], // Middle row
    [6, 7, 8], // Bottom row
    [0, 3, 6], // Left column
    [1, 4, 7], // Middle column
    [2, 5, 8], // Right column
    [0, 4, 8], // Diagonal \
    [2, 4, 6]  // Diagonal /
];

// --- Functions ---

// Function to handle a cell being played
function handleCellPlayed(clickedCell, clickedCellIndex) {
    // Update internal game state
    gameState[clickedCellIndex] = currentPlayer;
    // Update the UI
    clickedCell.textContent = currentPlayer;
    clickedCell.classList.add(currentPlayer); // Add X or O class for styling
}

// Function to change the current player
function handlePlayerChange() {
    currentPlayer = currentPlayer === "X" ? "O" : "X";
    statusDisplay.textContent = currentPlayerTurn();
}

// Function to check if the game has been won or is a draw
function handleResultValidation() {
    let roundWon = false;
    let winningLine = []; // To store the indices of the winning cells

    for (let i = 0; i < winningConditions.length; i++) {
        const winCondition = winningConditions[i];
        let a = gameState[winCondition[0]];
        let b = gameState[winCondition[1]];
        let c = gameState[winCondition[2]];

        if (a === '' || b === '' || c === '') {
            continue; // Skip if any cell in the condition is empty
        }
        if (a === b && b === c) {
            roundWon = true;
            winningLine = winCondition; // Store the winning line
            break; // Exit loop once a win is found
        }
    }

    if (roundWon) {
        statusDisplay.textContent = winningMessage();
        gameActive = false;
        // Optional: Highlight winning cells
        winningLine.forEach(index => {
            cells[index].classList.add('winning');
        });
        return; // End the function, game is over
    }

    // Check for Draw (if no cells are empty and no one won)
    let roundDraw = !gameState.includes("");
    if (roundDraw) {
        statusDisplay.textContent = drawMessage();
        gameActive = false;
        return; // End the function, game is over
    }

    // If we get here, the game continues - change player
    handlePlayerChange();
}

// Function to handle a click on a cell
function handleCellClick(event) {
    const clickedCell = event.target;
    // Get the 'data-cell-index' attribute value (convert to number)
    const clickedCellIndex = parseInt(clickedCell.getAttribute('data-cell-index'));

    // --- Validations ---
    // 1. Is the cell already played?
    // 2. Is the game still active?
    if (gameState[clickedCellIndex] !== "" || !gameActive) {
        return; // Do nothing if cell is taken or game is over
    }

    // --- Process the click ---
    // 1. Update board state and UI
    handleCellPlayed(clickedCell, clickedCellIndex);
    // 2. Check for win or draw
    handleResultValidation();
}

// Function to restart the game
function handleRestartGame() {
    gameActive = true;
    currentPlayer = 'X';
    gameState = ["", "", "", "", "", "", "", "", ""];
    statusDisplay.textContent = currentPlayerTurn();

    // Clear the board UI
    cells.forEach(cell => {
        cell.textContent = "";
        cell.classList.remove('X', 'O', 'winning'); // Remove player and winning classes
    });
}

// --- Event Listeners ---

// Add click listener to each cell
cells.forEach(cell => cell.addEventListener('click', handleCellClick));

// Add click listener to the restart button
restartButton.addEventListener('click', handleRestartGame);

// --- Initial Setup ---
statusDisplay.textContent = currentPlayerTurn(); // Set initial turn message