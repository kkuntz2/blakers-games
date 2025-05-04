document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const levelElement = document.getElementById('level');
    const messageArea = document.getElementById('messageArea');
    const messageText = document.getElementById('messageText');
    const startButton = document.getElementById('startButton');
    const gameContainer = document.getElementById('gameContainer');

    // --- Game Configuration ---
    canvas.width = 600;
    canvas.height = 400;

    let score = 0;
    let level = 1;
    let gameRunning = false;
    let gameOver = false;
    let animationFrameId = null;

    let baseCentipedeSpeed = 1;
    let basePointsPerSegment = 10;
    let centipedeSpeed = baseCentipedeSpeed;
    let pointsPerSegment = basePointsPerSegment;

    // --- Player ---
    const player = {
        x: canvas.width / 2 - 15,
        y: canvas.height - 40,
        width: 30,
        height: 20,
        speed: 5,
        dx: 0,
        color: '#0f0',
        draw() {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        },
        update() {
            this.x += this.dx;
            if (this.x < 0) this.x = 0;
            if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
        },
        move(direction) {
            this.dx = direction * this.speed;
        }
    };

    // --- Bullets ---
    const bullets = [];
    const bulletSpeed = 7;
    const bulletCooldown = 200;
    let canShoot = true;

    function shoot() {
        if (canShoot && gameRunning && !gameOver) {
            const bullet = {
                x: player.x + player.width / 2 - 2.5,
                y: player.y,
                width: 5,
                height: 10,
                speed: bulletSpeed,
                color: '#ff0',
                draw() {
                    ctx.fillStyle = this.color;
                    ctx.fillRect(this.x, this.y, this.width, this.height);
                },
                update() {
                    this.y -= this.speed;
                }
            };
            bullets.push(bullet);
            canShoot = false;
            setTimeout(() => { canShoot = true; }, bulletCooldown);
        }
    }

    function updateBullets() {
        for (let i = bullets.length - 1; i >= 0; i--) {
            // Bullets might be removed during collision checks
             if (!bullets[i]) continue;

            bullets[i].update();
            bullets[i].draw();
            if (bullets[i].y + bullets[i].height < 0) {
                bullets.splice(i, 1);
            }
        }
    }

    // --- Obstacles (Mushrooms) ---
    const mushrooms = [];
    const mushroomSize = 20;
    const mushroomColor = '#e8a49c';
    const numMushrooms = 25;

    function spawnMushrooms() {
        mushrooms.length = 0;
        const gridCols = canvas.width / mushroomSize;
        const gridRows = canvas.height / mushroomSize;
        const startRow = 3;
        const endRow = gridRows - 3;

        for (let i = 0; i < numMushrooms; i++) {
             let placed = false;
             while (!placed) {
                const gridX = Math.floor(Math.random() * gridCols);
                const gridY = Math.floor(Math.random() * (endRow - startRow + 1)) + startRow;
                const newMushroom = {
                    x: gridX * mushroomSize,
                    y: gridY * mushroomSize,
                    width: mushroomSize,
                    height: mushroomSize,
                    color: mushroomColor
                };
                let overlap = false;
                for (const mush of mushrooms) {
                    if (newMushroom.x === mush.x && newMushroom.y === mush.y) {
                        overlap = true; break;
                    }
                }
                if (!overlap) { mushrooms.push(newMushroom); placed = true; }
             }
        }
    }

    function drawMushrooms() {
        mushrooms.forEach(mush => {
            ctx.fillStyle = mush.color;
            const radius = mush.width / 4;
            ctx.beginPath();
            ctx.moveTo(mush.x + radius, mush.y);
            ctx.lineTo(mush.x + mush.width - radius, mush.y);
            ctx.quadraticCurveTo(mush.x + mush.width, mush.y, mush.x + mush.width, mush.y + radius);
            ctx.lineTo(mush.x + mush.width, mush.y + mush.height - radius);
            ctx.quadraticCurveTo(mush.x + mush.width, mush.y + mush.height, mush.x + mush.width - radius, mush.y + mush.height);
            ctx.lineTo(mush.x + radius, mush.y + mush.height);
            ctx.quadraticCurveTo(mush.x, mush.y + mush.height, mush.x, mush.y + mush.height - radius);
            ctx.lineTo(mush.x, mush.y + radius);
            ctx.quadraticCurveTo(mush.x, mush.y, mush.x + radius, mush.y);
            ctx.closePath();
            ctx.fill();
        });
    }


    // --- Centipede ---
    const centipedeSegments = [];
    const segmentSize = 20; // Should match mushroomSize
    const segmentStartY = 30;
    const verticalStep = segmentSize;

    function spawnCentipede(length) {
        centipedeSegments.length = 0;
        for (let i = 0; i < length; i++) {
            const segment = {
                x: canvas.width / 2 - (length / 2 * segmentSize) + (i * segmentSize),
                y: segmentStartY,
                width: segmentSize,
                height: segmentSize,
                speedX: centipedeSpeed,
                color: (i % 2 === 0) ? '#f0f' : '#0ff',
                directionX: 1,
                points: pointsPerSegment,
                // movingDown removed - logic simplified
                draw() {
                    ctx.fillStyle = this.color;
                    ctx.fillRect(this.x, this.y, this.width, this.height);
                    ctx.fillStyle = '#000';
                    ctx.fillRect(this.x + this.width * (this.directionX > 0 ? 0.7 : 0.1), this.y + this.height * 0.2, 4, 4);
                },
                update() {
                    let hitObstacle = false;
                    let hitWall = false;
                    let hitMushroom = false;

                    // Calculate potential next horizontal position
                    const nextX = this.x + this.speedX * this.directionX;

                    // Check for wall collision at nextX
                    if (nextX <= 0 || nextX + this.width >= canvas.width) {
                        hitWall = true;
                        hitObstacle = true;
                    }

                    // If not hitting a wall, check for mushroom collision at nextX
                    if (!hitWall) {
                        const collisionRect = { x: nextX, y: this.y, width: this.width, height: this.height };
                        for (const mush of mushrooms) {
                            if (checkCollision(collisionRect, mush)) {
                                hitMushroom = true;
                                hitObstacle = true;
                                break; // Found a mushroom collision
                            }
                        }
                    }

                    // --- Action Based on Collision ---
                    if (hitObstacle) {
                        // 1. Move Down
                        this.y += verticalStep;
                        // 2. Reverse Horizontal Direction
                        this.directionX *= -1;
                        // 3. Do *not* move horizontally this frame. The downward step + reversal is the action.
                    } else {
                        // No obstacle hit - move horizontally normally
                        this.x = nextX;
                    }

                    // --- Check Game Over Condition ---
                    // Check if centipede reaches player area (use current y after potential downward move)
                    if (this.y + this.height > player.y) {
                         triggerGameOver("Centipede reached the bottom!");
                    }
                }
            };
            centipedeSegments.push(segment);
        }
    }

     function updateCentipede() {
        for (let i = centipedeSegments.length - 1; i >= 0; i--) {
            if (centipedeSegments[i]) { // Check if segment still exists
                 centipedeSegments[i].update();
                 centipedeSegments[i].draw();
            }
        }
    }

    // --- Collision Detection ---
    function checkCollision(rect1, rect2) {
        // Standard AABB collision check
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    function handleCollisions() {

        // --- Bullet Collisions ---
        for (let i = bullets.length - 1; i >= 0; i--) {
            // If bullet was removed by mushroom check, skip
            if (!bullets[i]) continue;

            let bulletRemoved = false;

            // 1. Bullet vs Mushroom (NEW CHECK)
            for (let j = mushrooms.length - 1; j >= 0; j--) {
                 if (checkCollision(bullets[i], mushrooms[j])) {
                     // Remove the bullet
                     bullets.splice(i, 1);
                     bulletRemoved = true;
                     // Break mushroom loop (j) - bullet is gone
                     break;
                 }
            }

            // If bullet hit a mushroom, continue to next bullet
            if (bulletRemoved) continue;

            // 2. Bullet vs Centipede (Only if bullet didn't hit a mushroom)
            for (let j = centipedeSegments.length - 1; j >= 0; j--) {
                // If segment was removed, skip
                if (!centipedeSegments[j]) continue;

                if (checkCollision(bullets[i], centipedeSegments[j])) {
                    score += centipedeSegments[j].points;
                    updateScoreDisplay();

                    // Remove bullet and segment
                    bullets.splice(i, 1);
                    centipedeSegments.splice(j, 1);

                    // Break segment loop (j) since bullet is gone
                    break;
                }
            }
        } // End bullet loop

        // --- Centipede vs Player ---
        for (let i = centipedeSegments.length - 1; i >= 0; i--) {
             if (centipedeSegments[i] && checkCollision(centipedeSegments[i], player)) {
                 triggerGameOver("You were hit by the centipede!");
                 return; // Stop checking immediately on game over
             }
        }

        // --- Check for Level Completion ---
        // Ensure checks only happen if game is active
        if (gameRunning && !gameOver && centipedeSegments.length === 0) {
            nextLevel();
        }
    } // End handleCollisions

    // --- Game Flow ---
    function updateScoreDisplay() {
        scoreElement.textContent = score;
    }

    function updateLevelDisplay() {
        levelElement.textContent = level;
        const levelClass = `level-${level > 5 ? 'default' : level}`;
        document.body.className = levelClass;
    }

    function nextLevel() {
        level++;
        centipedeSpeed = baseCentipedeSpeed + (level - 1) * 0.3;
        pointsPerSegment = basePointsPerSegment + (level - 1) * 5;
        updateLevelDisplay();
        const centipedeLength = 8 + level;
        spawnCentipede(centipedeLength > 20 ? 20 : centipedeLength);
        console.log(`Starting Level ${level}`);
        // Decide if mushrooms should respawn/change between levels
        // spawnMushrooms(); // Uncomment for full reset
    }

     function triggerGameOver(reason) {
        if (gameOver) return;
        gameOver = true;
        gameRunning = false;
        player.dx = 0;
        messageText.textContent = `Game Over! ${reason}\nFinal Score: ${score}`;
        startButton.textContent = 'Play Again?';
        startButton.classList.remove('hidden');
        messageArea.classList.remove('hidden');
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }

    function resetGame() {
        score = 0;
        level = 1;
        gameOver = false;
        player.x = canvas.width / 2 - player.width / 2;
        player.y = canvas.height - 40;
        player.dx = 0;
        bullets.length = 0;
        centipedeSegments.length = 0;
        centipedeSpeed = baseCentipedeSpeed;
        pointsPerSegment = basePointsPerSegment;
        spawnMushrooms(); // Spawn mushrooms on reset
        updateScoreDisplay();
        updateLevelDisplay();
        messageArea.classList.add('hidden');
        startButton.classList.add('hidden');
    }

    function startGame() {
        if (gameRunning) return;
        resetGame();
        gameRunning = true;
        spawnCentipede(8 + level);
        messageArea.classList.add('hidden');
        if (animationFrameId) { cancelAnimationFrame(animationFrameId); }
        gameLoop();
    }

    // --- Game Loop ---
    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function gameLoop() {
        if (gameOver || !gameRunning) {
             animationFrameId = null;
             return;
        }

        clearCanvas();

        // Draw Order: Background elements first
        drawMushrooms();

        // Update and Draw Game Objects
        player.update();
        player.draw();
        updateBullets();
        updateCentipede();

        // Collision Detection
        handleCollisions();

        // Request next frame
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    // --- Input Handling (Keyboard - No Changes) ---
    const keysPressed = {};
    document.addEventListener('keydown', (e) => { /* ... as before ... */ });
    document.addEventListener('keyup', (e) => { /* ... as before ... */ });

     // --- Input Handling (Touch / Mouse - Need full definitions here) ---
    let touchStartX = null;
    let playerStartX = null;
    let isDragging = false;

    function handleInteractionStart(clientX) {
        if (gameOver || !gameRunning) return;
        isDragging = true;
        touchStartX = clientX;
        playerStartX = player.x;
    }

    function handleInteractionMove(clientX) {
        if (!isDragging || gameOver || !gameRunning) return;
        const touchCurrentX = clientX;
        const touchDeltaX = touchCurrentX - touchStartX;
        player.x = playerStartX + touchDeltaX;
        // Keep player within bounds immediately
        if (player.x < 0) player.x = 0;
        if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    }

     function handleInteractionEnd(clientX) {
         // Determine if it was a tap (shoot) or the end of a drag
         const wasTap = isDragging && Math.abs(clientX - touchStartX) < 10; // Small movement tolerance for tap

         if (wasTap && gameRunning && !gameOver) {
              shoot();
         }

         isDragging = false;
         touchStartX = null;
         playerStartX = null;
         // Optional: Stop player movement on release
         // player.move(0);
     }

    // Get relative X coordinate within the canvas
    function getRelativeX(clientX) {
        const rect = canvas.getBoundingClientRect();
        return clientX - rect.left;
    }

    // Add Mouse event listeners
    canvas.addEventListener('mousedown', (e) => handleInteractionStart(getRelativeX(e.clientX)));
    canvas.addEventListener('mousemove', (e) => handleInteractionMove(getRelativeX(e.clientX)));
    canvas.addEventListener('mouseup', (e) => handleInteractionEnd(getRelativeX(e.clientX)));
    canvas.addEventListener('mouseleave', () => { if (isDragging) handleInteractionEnd(touchStartX); }); // Use touchStartX as reference if mouse leaves

    // Add Touch event listeners (Ensure passive: false where needed)
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleInteractionStart(getRelativeX(e.touches[0].clientX)); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleInteractionMove(getRelativeX(e.touches[0].clientX)); }, { passive: false });
    canvas.addEventListener('touchend', (e) => { e.preventDefault(); const touchEndX = e.changedTouches[0] ? getRelativeX(e.changedTouches[0].clientX) : (touchStartX || 0); handleInteractionEnd(touchEndX); }, { passive: false });


    // --- Initial Setup ---
    updateLevelDisplay();
    messageArea.addEventListener('click', (e) => {
        if (!gameRunning) { startGame(); }
    });

     // Need to re-include keydown/keyup handlers as they were abbreviated before
     document.addEventListener('keydown', (e) => {
        if (gameOver || !gameRunning) return;
        keysPressed[e.key] = true;
        if (keysPressed['ArrowLeft'] || keysPressed['a']) {
            player.move(-1);
        } else if (keysPressed['ArrowRight'] || keysPressed['d']) {
            player.move(1);
        }
        if (keysPressed[' '] || keysPressed['ArrowUp'] || keysPressed['w']) { // Space or Up for shoot
            e.preventDefault(); // Prevent spacebar scrolling page
            shoot();
        }
    });

    document.addEventListener('keyup', (e) => {
        delete keysPressed[e.key];
        // Stop moving if the specific key is released and the opposite direction isn't also pressed
        if ((e.key === 'ArrowLeft' || e.key === 'a') && player.dx < 0) {
             if (!keysPressed['ArrowRight'] && !keysPressed['d']) player.move(0);
        } else if ((e.key === 'ArrowRight' || e.key === 'd') && player.dx > 0) {
             if (!keysPressed['ArrowLeft'] && !keysPressed['a']) player.move(0);
        }
    });


}); // End DOMContentLoaded