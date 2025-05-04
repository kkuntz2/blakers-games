// --- Get references to HTML elements ---
const characterSelectionArea = document.getElementById('characterSelection');
const characterChoices = document.querySelectorAll('.character-choice');
const gameArea = document.getElementById('gameArea');
const statusDisplay = document.getElementById('statusArea');
const gameBoard = document.getElementById('gameBoard');
const cells = document.querySelectorAll('.cell');
const restartButton = document.getElementById('restartButton');
const winOverlay = document.getElementById('winOverlay');
const winAnimationImg = document.getElementById('winAnimation');

// --- Game variables ---
let gameActive = false; // Game starts inactive until character is chosen
let characterSelected = false;
let player1Character = ''; // Will be 'donald' or 'billy'
let player2Character = '';
let currentPlayer = ''; // Will be 'donald' or 'billy'
let gameState = ["", "", "", "", "", "", "", "", ""]; // Represents the 3x3 board

// Store image paths (relative to index.html)
const characterImages = {
    donald: 'img/donald.png',
    billy: 'img/billy.png'
};

const winAnimations = {
    donald: 'img/donald-win.webp',
    billy: 'img/billy-win.gif' // Corrected path assumption
};

// --- Messages ---
const winningMessage = () => `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} Wins! 🎉`; // Capitalize name
const drawMessage = () => `It's a Tie! 🤝`;
const currentPlayerTurn = () => `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}'s Turn`;

// Winning combinations (indices remain the same)
const winningConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]  // Diagonals
];

// --- Functions ---

// Function to start the game after character selection
function startGame(chosenCharacter) {
    characterSelected = true;
    player1Character = chosenCharacter;
    player2Character = (chosenCharacter === 'donald') ? 'billy' : 'donald';
    currentPlayer = player1Character; // Player 1 starts

    // Hide selection, show game
    characterSelectionArea.classList.add('hidden');
    gameArea.classList.remove('hidden');
    statusDisplay.textContent = currentPlayerTurn();
    gameActive = true;
}

// Function to handle a cell being played
function handleCellPlayed(clickedCell, clickedCellIndex) {
    // Update internal game state
    gameState[clickedCellIndex] = currentPlayer;

    // Update the UI: Add the player's image
    clickedCell.innerHTML = ''; // Clear the cell first
    const playerImage = document.createElement('img');
    playerImage.src = characterImages[currentPlayer];
    playerImage.alt = currentPlayer;
    playerImage.classList.add('player-img'); // Add class for styling and animation
    clickedCell.appendChild(playerImage);
}

// Function to change the current player
function handlePlayerChange() {
    currentPlayer = (currentPlayer === player1Character) ? player2Character : player1Character;
    statusDisplay.textContent = currentPlayerTurn();
}

// Function to show the winning animation
function showWinAnimation(winner) {
    winAnimationImg.src = winAnimations[winner];
    winOverlay.classList.remove('hidden');

    // Hide overlay after 10 seconds
    setTimeout(() => {
        winOverlay.classList.add('hidden');
        winAnimationImg.src = ""; // Clear src to stop animation/loading
    }, 10000); // 10000 milliseconds = 10 seconds
}

// Function to check if the game has been won or is a draw
function handleResultValidation() {
    let roundWon = false;
    let winningLine = [];

    for (let i = 0; i < winningConditions.length; i++) {
        const winCondition = winningConditions[i];
        const a = gameState[winCondition[0]];
        const b = gameState[winCondition[1]];
        const c = gameState[winCondition[2]];

        if (a === '' || b === '' || c === '') {
            continue;
        }
        if (a === b && b === c) {
            roundWon = true;
            winningLine = winCondition;
            break;
        }
    }

    if (roundWon) {
        statusDisplay.textContent = winningMessage();
        gameActive = false;
        // Optional: Highlight winning cells
        winningLine.forEach(index => {
            cells[index].classList.add('winning');
        });
        // Show the winner's animation!
        showWinAnimation(currentPlayer);
        return;
    }

    // Check for Draw
    let roundDraw = !gameState.includes("");
    if (roundDraw) {
        statusDisplay.textContent = drawMessage();
        gameActive = false;
        return;
    }

    // If game continues, change player
    handlePlayerChange();
}

// Function to handle a click on a cell
function handleCellClick(event) {
    // Ensure character has been selected and game is active
    if (!characterSelected || !gameActive) return;

    const clickedCell = event.target.closest('.cell'); // Handle clicks on image inside cell
    if (!clickedCell) return; // Click wasn't in a cell

    const clickedCellIndex = parseInt(clickedCell.getAttribute('data-cell-index'));

    // Check if cell is already played or game inactive
    if (gameState[clickedCellIndex] !== "" || !gameActive) {
        return;
    }

    // Process the click
    handleCellPlayed(clickedCell, clickedCellIndex);
    handleResultValidation();
}

// Function to restart the game
function handleRestartGame() {
    // Reset variables
    gameActive = false;
    characterSelected = false;
    player1Character = '';
    player2Character = '';
    currentPlayer = '';
    gameState = ["", "", "", "", "", "", "", "", ""];

    // Reset UI
    statusDisplay.textContent = ""; // Clear status initially
    cells.forEach(cell => {
        cell.innerHTML = ""; // Clear images
        cell.classList.remove('winning'); // Remove winning highlight
    });

    // Hide game area, show character selection
    gameArea.classList.add('hidden');
    characterSelectionArea.classList.remove('hidden');

    // Ensure win overlay is hidden
    if (!winOverlay.classList.contains('hidden')) {
        winOverlay.classList.add('hidden');
        winAnimationImg.src = "";
    }
}

// --- Event Listeners ---

// Add listeners for character selection
characterChoices.forEach(button => {
    button.addEventListener('click', (event) => {
        // Find the button element itself if user clicks image/span
        const choiceButton = event.target.closest('.character-choice');
        const selectedChar = choiceButton.getAttribute('data-character');
        startGame(selectedChar);
    });
});

// Add click listener to each cell (delegated from board is slightly more efficient but direct is fine)
cells.forEach(cell => cell.addEventListener('click', handleCellClick));

// Add click listener to the restart button
restartButton.addEventListener('click', handleRestartGame);

// --- Initial Setup ---
// No initial status message needed as selection screen shows first.
// Everything is handled by the character selection flow.