import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog'
import { Button } from './components/ui/button'

interface Character {
  id: string
  name: string
  x: number
  y: number
  health: number
  maxHealth: number
  isJumping: boolean
  isAttacking: boolean
  facingRight: boolean
  width: number
  height: number
}

interface GameState {
  player1: Character
  player2: Character
  roundTime: number
  currentRound: number
  player1Wins: number
  player2Wins: number
  gameOver: boolean
  winner: string | null
  roundWinner: string | null
  showRoundResult: boolean
}

const STAGE_WIDTH = window.innerWidth
const STAGE_HEIGHT = window.innerHeight
const GROUND_Y = STAGE_HEIGHT - 150
const ROUND_TIME = 60
const JUMP_HEIGHT = 120
const MOVE_SPEED = 8
const ATTACK_DAMAGE = 15

function App() {
  const [gameState, setGameState] = useState<GameState>({
    player1: {
      id: 'player1',
      name: 'SCORPION',
      x: STAGE_WIDTH * 0.25,
      y: GROUND_Y,
      health: 100,
      maxHealth: 100,
      isJumping: false,
      isAttacking: false,
      facingRight: true,
      width: 80,
      height: 120
    },
    player2: {
      id: 'player2',
      name: 'SUB-ZERO',
      x: STAGE_WIDTH * 0.75,
      y: GROUND_Y,
      health: 100,
      maxHealth: 100,
      isJumping: false,
      isAttacking: false,
      facingRight: false,
      width: 80,
      height: 120
    },
    roundTime: ROUND_TIME,
    currentRound: 1,
    player1Wins: 0,
    player2Wins: 0,
    gameOver: false,
    winner: null,
    roundWinner: null,
    showRoundResult: false
  })

  const [keys, setKeys] = useState<Set<string>>(new Set())
  const [showControls, setShowControls] = useState(true)

  // Collision detection function
  const checkCollision = (attacker: Character, defender: Character): boolean => {
    const attackRange = 100
    const distance = Math.abs(attacker.x - defender.x)
    return distance < attackRange && Math.abs(attacker.y - defender.y) < 50
  }

  // Keyboard event handlers
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    setKeys(prev => new Set(prev).add(e.key.toLowerCase()))
  }, [])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    setKeys(prev => {
      const newKeys = new Set(prev)
      newKeys.delete(e.key.toLowerCase())
      return newKeys
    })
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  // Game loop
  useEffect(() => {
    if (gameState.gameOver || gameState.showRoundResult) return

    const gameLoop = setInterval(() => {
      setGameState(prevState => {
        const newState = { ...prevState }
        
        // Update round timer
        newState.roundTime = Math.max(0, newState.roundTime - 0.1)
        
        // Handle player 1 movement (WASD)
        if (keys.has('a') && newState.player1.x > 0) {
          newState.player1.x -= MOVE_SPEED
          newState.player1.facingRight = false
        }
        if (keys.has('d') && newState.player1.x < STAGE_WIDTH - newState.player1.width) {
          newState.player1.x += MOVE_SPEED
          newState.player1.facingRight = true
        }
        if (keys.has('w') && !newState.player1.isJumping) {
          newState.player1.isJumping = true
          setTimeout(() => {
            setGameState(state => ({
              ...state,
              player1: { ...state.player1, isJumping: false }
            }))
          }, 600)
        }

        // Handle player 2 movement (Arrow keys)
        if (keys.has('arrowleft') && newState.player2.x > 0) {
          newState.player2.x -= MOVE_SPEED
          newState.player2.facingRight = false
        }
        if (keys.has('arrowright') && newState.player2.x < STAGE_WIDTH - newState.player2.width) {
          newState.player2.x += MOVE_SPEED
          newState.player2.facingRight = true
        }
        if (keys.has('arrowup') && !newState.player2.isJumping) {
          newState.player2.isJumping = true
          setTimeout(() => {
            setGameState(state => ({
              ...state,
              player2: { ...state.player2, isJumping: false }
            }))
          }, 600)
        }

        // Handle attacks
        if (keys.has('j') || keys.has('k') || keys.has('l')) {
          if (!newState.player1.isAttacking) {
            newState.player1.isAttacking = true
            // Check collision with player 2
            if (checkCollision(newState.player1, newState.player2)) {
              newState.player2.health = Math.max(0, newState.player2.health - ATTACK_DAMAGE)
            }
            setTimeout(() => {
              setGameState(state => ({
                ...state,
                player1: { ...state.player1, isAttacking: false }
              }))
            }, 300)
          }
        }

        if (keys.has(' ')) {
          if (!newState.player2.isAttacking) {
            newState.player2.isAttacking = true
            // Check collision with player 1
            if (checkCollision(newState.player2, newState.player1)) {
              newState.player1.health = Math.max(0, newState.player1.health - ATTACK_DAMAGE)
            }
            setTimeout(() => {
              setGameState(state => ({
                ...state,
                player2: { ...state.player2, isAttacking: false }
              }))
            }, 300)
          }
        }

        // Check round end conditions
        if (newState.player1.health <= 0 || newState.player2.health <= 0 || newState.roundTime <= 0) {
          let roundWinner = ''
          if (newState.player1.health <= 0) {
            roundWinner = 'player2'
            newState.player2Wins++
          } else if (newState.player2.health <= 0) {
            roundWinner = 'player1'
            newState.player1Wins++
          } else {
            // Time up - winner by health
            roundWinner = newState.player1.health > newState.player2.health ? 'player1' : 'player2'
            if (roundWinner === 'player1') newState.player1Wins++
            else newState.player2Wins++
          }
          
          newState.roundWinner = roundWinner
          newState.showRoundResult = true
          
          // Check if game is over (best of 3)
          if (newState.player1Wins >= 2 || newState.player2Wins >= 2) {
            newState.gameOver = true
            newState.winner = newState.player1Wins >= 2 ? 'SCORPION' : 'SUB-ZERO'
          }
        }

        return newState
      })
    }, 100)

    return () => clearInterval(gameLoop)
  }, [keys, gameState.gameOver, gameState.showRoundResult])

  const startNextRound = () => {
    setGameState(prevState => ({
      ...prevState,
      player1: {
        ...prevState.player1,
        x: STAGE_WIDTH * 0.25,
        y: GROUND_Y,
        health: 100,
        isJumping: false,
        isAttacking: false,
        facingRight: true
      },
      player2: {
        ...prevState.player2,
        x: STAGE_WIDTH * 0.75,
        y: GROUND_Y,
        health: 100,
        isJumping: false,
        isAttacking: false,
        facingRight: false
      },
      roundTime: ROUND_TIME,
      currentRound: prevState.currentRound + 1,
      roundWinner: null,
      showRoundResult: false
    }))
  }

  const resetGame = () => {
    setGameState({
      player1: {
        id: 'player1',
        name: 'SCORPION',
        x: STAGE_WIDTH * 0.25,
        y: GROUND_Y,
        health: 100,
        maxHealth: 100,
        isJumping: false,
        isAttacking: false,
        facingRight: true,
        width: 80,
        height: 120
      },
      player2: {
        id: 'player2',
        name: 'SUB-ZERO',
        x: STAGE_WIDTH * 0.75,
        y: GROUND_Y,
        health: 100,
        maxHealth: 100,
        isJumping: false,
        isAttacking: false,
        facingRight: false,
        width: 80,
        height: 120
      },
      roundTime: ROUND_TIME,
      currentRound: 1,
      player1Wins: 0,
      player2Wins: 0,
      gameOver: false,
      winner: null,
      roundWinner: null,
      showRoundResult: false
    })
  }

  return (
    <div className="w-screen h-screen bg-gradient-to-b from-gray-900 via-red-950 to-black overflow-hidden relative">
      {/* Background Stage */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-900/20 to-black/80" />
      
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-10 p-6">
        <div className="flex justify-between items-center">
          {/* Player 1 Health */}
          <div className="flex flex-col items-start">
            <h3 className="text-accent font-bold text-xl mb-2">{gameState.player1.name}</h3>
            <div className="w-80 h-6 bg-gray-800 border-2 border-accent rounded">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-yellow-500 rounded transition-all duration-300"
                style={{ width: `${(gameState.player1.health / gameState.player1.maxHealth) * 100}%` }}
              />
            </div>
            <div className="flex mt-2 space-x-1">
              {[...Array(3)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-4 h-4 rounded-full ${i < gameState.player1Wins ? 'bg-accent' : 'bg-gray-600'}`} 
                />
              ))}
            </div>
          </div>

          {/* Round Timer */}
          <div className="text-center">
            <div className="text-accent text-6xl font-bold">
              {Math.ceil(gameState.roundTime)}
            </div>
            <div className="text-accent text-lg">
              ROUND {gameState.currentRound}
            </div>
          </div>

          {/* Player 2 Health */}
          <div className="flex flex-col items-end">
            <h3 className="text-accent font-bold text-xl mb-2">{gameState.player2.name}</h3>
            <div className="w-80 h-6 bg-gray-800 border-2 border-accent rounded">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-yellow-500 rounded transition-all duration-300 ml-auto"
                style={{ width: `${(gameState.player2.health / gameState.player2.maxHealth) * 100}%` }}
              />
            </div>
            <div className="flex mt-2 space-x-1">
              {[...Array(3)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-4 h-4 rounded-full ${i < gameState.player2Wins ? 'bg-accent' : 'bg-gray-600'}`} 
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ground */}
      <div 
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-800 to-gray-700 border-t-4 border-accent"
        style={{ height: '150px' }}
      />

      {/* Characters */}
      <div
        className={`absolute transition-all duration-200 ${gameState.player1.isAttacking ? 'scale-110' : ''}`}
        style={{
          left: `${gameState.player1.x}px`,
          bottom: `${STAGE_HEIGHT - gameState.player1.y - gameState.player1.height + (gameState.player1.isJumping ? JUMP_HEIGHT : 0)}px`,
          width: `${gameState.player1.width}px`,
          height: `${gameState.player1.height}px`,
          transform: `scaleX(${gameState.player1.facingRight ? 1 : -1})`
        }}
      >
        <div className={`w-full h-full rounded-lg flex items-center justify-center text-white font-bold text-lg
          ${gameState.player1.isAttacking ? 'bg-red-600 shadow-lg shadow-red-500/50' : 'bg-yellow-600'}
          border-4 border-accent transition-all duration-200`}>
          🥷
        </div>
      </div>

      <div
        className={`absolute transition-all duration-200 ${gameState.player2.isAttacking ? 'scale-110' : ''}`}
        style={{
          left: `${gameState.player2.x}px`,
          bottom: `${STAGE_HEIGHT - gameState.player2.y - gameState.player2.height + (gameState.player2.isJumping ? JUMP_HEIGHT : 0)}px`,
          width: `${gameState.player2.width}px`,
          height: `${gameState.player2.height}px`,
          transform: `scaleX(${gameState.player2.facingRight ? 1 : -1})`
        }}
      >
        <div className={`w-full h-full rounded-lg flex items-center justify-center text-white font-bold text-lg
          ${gameState.player2.isAttacking ? 'bg-red-600 shadow-lg shadow-red-500/50' : 'bg-blue-600'}
          border-4 border-accent transition-all duration-200`}>
          🥶
        </div>
      </div>

      {/* Controls Overlay */}
      <Dialog open={showControls} onOpenChange={setShowControls}>
        <DialogContent className="bg-black/90 border-accent text-accent">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">MORTAL KOMBAT CONTROLS</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-8 p-4">
            <div>
              <h3 className="text-xl font-bold mb-4 text-yellow-500">PLAYER 1 - SCORPION</h3>
              <div className="space-y-2">
                <div><span className="font-bold">WASD:</span> Move</div>
                <div><span className="font-bold">W:</span> Jump</div>
                <div><span className="font-bold">J/K/L:</span> Attack</div>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4 text-blue-400">PLAYER 2 - SUB-ZERO</h3>
              <div className="space-y-2">
                <div><span className="font-bold">Arrow Keys:</span> Move</div>
                <div><span className="font-bold">↑:</span> Jump</div>
                <div><span className="font-bold">Space:</span> Attack</div>
              </div>
            </div>
          </div>
          <Button onClick={() => setShowControls(false)} className="bg-primary hover:bg-primary/80">
            START FIGHTING!
          </Button>
        </DialogContent>
      </Dialog>

      {/* Round Result Dialog */}
      <Dialog open={gameState.showRoundResult && !gameState.gameOver} onOpenChange={() => {}}>
        <DialogContent className="bg-black/90 border-accent text-accent">
          <DialogHeader>
            <DialogTitle className="text-3xl text-center">
              {gameState.roundWinner === 'player1' ? 'SCORPION WINS!' : 'SUB-ZERO WINS!'}
            </DialogTitle>
          </DialogHeader>
          <div className="text-center p-4">
            <div className="text-xl mb-4">Round {gameState.currentRound} Complete</div>
            <div className="text-lg mb-6">
              Score: {gameState.player1Wins} - {gameState.player2Wins}
            </div>
            <Button onClick={startNextRound} className="bg-primary hover:bg-primary/80">
              NEXT ROUND
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Game Over Dialog */}
      <Dialog open={gameState.gameOver} onOpenChange={() => {}}>
        <DialogContent className="bg-black/90 border-accent text-accent">
          <DialogHeader>
            <DialogTitle className="text-4xl text-center text-accent">
              {gameState.winner} WINS!
            </DialogTitle>
          </DialogHeader>
          <div className="text-center p-4">
            <div className="text-2xl mb-4">FATALITY!</div>
            <div className="text-lg mb-6">
              Final Score: {gameState.player1Wins} - {gameState.player2Wins}
            </div>
            <Button onClick={resetGame} className="bg-primary hover:bg-primary/80">
              PLAY AGAIN
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App