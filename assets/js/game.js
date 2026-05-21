/**
 * HANLA (All-Ages) - Game Engine
 * 
 * This file handles the core game lifecycle, input management, 
 * and validation logic. It is written in vanilla JavaScript 
 * for maximum compatibility and ease of modification.
 */

class Hanla {
    constructor() {
        // --- State Management ---
        this.wordLength = 5;      // Default length
        this.secretWord = "";      // The word to guess
        this.guesses = [];         // History of guesses
        this.currentGuess = "";    // Current typing buffer
        this.gameOver = false;     // Game status flag
        
        // --- DOM Elements ---
        this.screens = {
            start: document.getElementById('start-screen'),
            game: document.getElementById('game-screen')
        };
        this.board = document.getElementById('board');
        this.keyboard = document.getElementById('keyboard');
        this.modal = document.getElementById('message-modal');
        this.toast = document.getElementById('toast');
        this.activeInput = document.getElementById('active-input');
        
        this.init();
    }

    /**
     * Helper to focus the hidden input only on non-touch devices (Desktop).
     */
    focusInput() {
        if (this.gameOver) return;
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (!isTouchDevice) {
            this.activeInput.focus();
        }
    }

    /**
     * Set up event listeners and global keyboard support.
     */
    init() {
        // Difficulty Selection Buttons
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.wordLength = parseInt(btn.dataset.length);
                this.startGame();
            });
        });

        // Focus management: Use helper to prevent native keyboard on mobile
        document.getElementById('game-screen').addEventListener('click', () => {
            this.focusInput();
        });

        // Native Mobile Input Sync
        this.activeInput.addEventListener('input', (e) => {
            if (this.gameOver) return;
            const val = e.target.value.toUpperCase();
            // Sanitize: Only A-Z allowed
            const filtered = val.replace(/[^A-Z]/g, '').slice(0, this.wordLength);
            this.currentGuess = filtered;
            this.activeInput.value = filtered;
            this.updateTiles();
        });

        // Enter key for Native Keyboard (kept for Desktop users who focus the input)
        this.activeInput.addEventListener('keydown', (e) => {
            if (this.gameOver) return;
            if (e.key === 'Enter') {
                this.submitGuess();
            }
        });

        // Navigation and Modals
        document.getElementById('back-btn').addEventListener('click', () => {
            this.showScreen('start');
        });

        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.hideModal();
            this.startGame();
        });

        // Physical Keyboard Support (for Desktop users)
        window.addEventListener('keydown', (e) => this.handlePhysicalInput(e));
        
        this.createVirtualKeyboard();
    }

    /**
     * Resets state and initializes a new game session.
     */
    startGame() {
        this.gameOver = false;
        this.guesses = [];
        this.currentGuess = "";
        this.activeInput.value = "";
        this.secretWord = this.getRandomWord();
        
        this.renderBoard();
        this.resetKeyboardColors();
        this.showScreen('game');
        
        // Slight delay to ensure the screen transition is smooth
        setTimeout(() => this.focusInput(), 500);
    }

    /**
     * Picks a random word based on the current wordLength.
     */
    getRandomWord() {
        const list = WORDS[this.wordLength];
        return list[Math.floor(Math.random() * list.length)].toUpperCase();
    }

    /**
     * Switches between start and game screens.
     */
    showScreen(screenName) {
        Object.values(this.screens).forEach(s => s.classList.remove('active'));
        this.screens[screenName].classList.add('active');
    }

    /**
     * Dynamically generates the grid based on word length.
     */
    renderBoard() {
        this.board.innerHTML = "";
        this.board.style.gridTemplateColumns = `repeat(${this.wordLength}, 1fr)`;
        
        // Always create 6 rows
        for (let i = 0; i < 6 * this.wordLength; i++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            this.board.appendChild(tile);
        }
    }

    /**
     * Creates the on-screen virtual keyboard for TV/Desktop.
     */
    createVirtualKeyboard() {
        const rows = [
            "QWERTYUIOP",
            "ASDFGHJKL",
            "ENTER,Z,X,C,V,B,N,M,BACK"
        ];

        rows.forEach((row, index) => {
            const rowEl = document.getElementById(`row-${index + 1}`);
            if (!rowEl) return;
            const keys = row.split(row.includes(',') ? ',' : '');
            
            keys.forEach(key => {
                const btn = document.createElement('button');
                btn.classList.add('key');
                btn.textContent = key === "BACK" ? "⌫" : key;
                if (key === "ENTER" || key === "BACK") btn.classList.add('large');
                btn.dataset.key = key;
                
                btn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent re-focusing activeInput
                    this.handleInput(key);
                });
                rowEl.appendChild(btn);
            });
        });
    }

    /**
     * Clears all color coding from the keyboard.
     */
    resetKeyboardColors() {
        document.querySelectorAll('.key').forEach(key => {
            key.classList.remove('correct', 'present', 'absent');
        });
    }

    /**
     * Bridge for hardware keyboard input.
     */
    handlePhysicalInput(e) {
        // Ignore if the native input already has focus to avoid double-processing
        if (this.gameOver || document.activeElement === this.activeInput) return;
        const key = e.key.toUpperCase();
        
        if (key === "ENTER") this.handleInput("ENTER");
        else if (key === "BACKSPACE") this.handleInput("BACK");
        else if (/^[A-Z]$/.test(key)) this.handleInput(key);
    }

    /**
     * Processes input from ANY source (virtual, physical, or native).
     */
    handleInput(key) {
        if (this.gameOver || !this.screens.game.classList.contains('active')) return;

        if (key === "ENTER") {
            this.submitGuess();
        } else if (key === "BACK") {
            if (this.currentGuess.length > 0) {
                this.currentGuess = this.currentGuess.slice(0, -1);
                this.activeInput.value = this.currentGuess;
                this.updateTiles();
            }
        } else if (this.currentGuess.length < this.wordLength) {
            this.currentGuess += key;
            this.activeInput.value = this.currentGuess;
            this.updateTiles();
        }
    }

    /**
     * Updates the current row of tiles on the board.
     */
    updateTiles() {
        const rowStart = this.guesses.length * this.wordLength;
        const tiles = this.board.querySelectorAll('.tile');
        
        for (let i = 0; i < this.wordLength; i++) {
            const tile = tiles[rowStart + i];
            tile.textContent = this.currentGuess[i] || "";
            if (this.currentGuess[i]) {
                tile.dataset.state = "toggled"; // Triggers CSS "pop" animation
            } else {
                delete tile.dataset.state;
            }
        }
    }

    /**
     * Finalizes the current guess.
     */
    submitGuess() {
        if (this.currentGuess.length < this.wordLength) {
            this.showToast("Too short!");
            this.shakeRow();
            return;
        }
        this.processGuess();
    }

    /**
     * Validates word, animates tiles, and checks for win/loss.
     */
    async processGuess() {
        const guess = this.currentGuess;
        const result = this.calculateResult(guess, this.secretWord);
        const rowStart = this.guesses.length * this.wordLength;
        const tiles = Array.from(this.board.querySelectorAll('.tile')).slice(rowStart, rowStart + this.wordLength);

        this.gameOver = true;   // Disable input during animation
        this.activeInput.blur(); // Hide keyboard during animation

        // Sequential animation for each tile
        for (let i = 0; i < tiles.length; i++) {
            const tile = tiles[i];
            tile.classList.add('flip');
            await new Promise(r => setTimeout(r, 200));
            tile.classList.remove('flip');
            tile.classList.add(result[i]);
            this.updateKeyboardKey(guess[i], result[i]);
        }

        this.guesses.push(guess);
        this.currentGuess = "";
        this.activeInput.value = "";
        this.gameOver = false;

        if (guess === this.secretWord) {
            this.endGame(true);
        } else if (this.guesses.length === 6) {
            this.endGame(false);
        } else {
            this.focusInput(); // Ready for next guess
        }
    }

    /**
     * Core Hanla Logic: Computes the color state for each letter.
     * Handles duplicate letters correctly.
     */
    calculateResult(guess, secret) {
        const result = new Array(this.wordLength).fill('absent');
        const secretArr = secret.split('');
        const guessArr = guess.split('');

        // First pass: Find exact matches (Green)
        for (let i = 0; i < this.wordLength; i++) {
            if (guessArr[i] === secretArr[i]) {
                result[i] = 'correct';
                secretArr[i] = null; // Mark used
                guessArr[i] = null;
            }
        }

        // Second pass: Find misplaced matches (Yellow)
        for (let i = 0; i < this.wordLength; i++) {
            if (guessArr[i] && secretArr.includes(guessArr[i])) {
                result[i] = 'present';
                secretArr[secretArr.indexOf(guessArr[i])] = null; // Mark used
            }
        }

        return result;
    }

    /**
     * Updates virtual keyboard colors based on the highest-priority feedback.
     */
    updateKeyboardKey(letter, state) {
        const key = document.querySelector(`.key[data-key="${letter}"]`);
        if (!key) return;

        if (state === 'correct') {
            key.classList.remove('present', 'absent');
            key.classList.add('correct');
        } else if (state === 'present' && !key.classList.contains('correct')) {
            key.classList.remove('absent');
            key.classList.add('present');
        } else if (state === 'absent' && !key.classList.contains('correct') && !key.classList.contains('present')) {
            key.classList.add('absent');
        }
    }

    /**
     * Visual feedback for invalid/too-short words.
     */
    shakeRow() {
        const rowStart = this.guesses.length * this.wordLength;
        const tiles = Array.from(this.board.querySelectorAll('.tile')).slice(rowStart, rowStart + this.wordLength);
        tiles.forEach(t => t.classList.add('shake'));
        setTimeout(() => {
            tiles.forEach(t => t.classList.remove('shake'));
        }, 500);
    }

    /**
     * Helper for temporary text overlays.
     */
    showToast(msg) {
        this.toast.textContent = msg;
        this.toast.classList.add('show');
        setTimeout(() => this.toast.classList.remove('show'), 2000);
    }

    /**
     * Handles Game Over screen.
     */
    endGame(win) {
        this.gameOver = true;
        const title = win ? "Great Job! 🎉" : "Nice Try!";
        const message = win ? `You found the word in ${this.guesses.length} tries!` : `The word was ${this.secretWord}.`;
        
        setTimeout(() => {
            document.getElementById('modal-title').textContent = title;
            document.getElementById('modal-message').textContent = message;
            this.modal.classList.add('active');
        }, 1000);
    }

    hideModal() {
        this.modal.classList.remove('active');
    }
}

// Global initialization
new Hanla();
