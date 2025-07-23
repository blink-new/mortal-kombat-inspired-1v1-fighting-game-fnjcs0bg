import { useState, useEffect, useCallback, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog'
import { Button } from './components/ui/button'
import { Card, CardContent } from './components/ui/card'

// Fighter definitions with unique stats and abilities
const FIGHTERS = {
  scorpion: {
    id: 'scorpion',
    name: 'SCORPION',
    emoji: '🥷',
    color: 'bg-yellow-600',
    glowColor: 'shadow-yellow-500/50',
    speed: 8,
    power: 18,
    health: 100,
    specialMove: 'HELLFIRE',
    specialDamage: 35,
    comboThreshold: 3
  },
  subzero: {
    id: 'subzero',
    name: 'SUB-ZERO',
    emoji: '🥶',
    color: 'bg-blue-600',
    glowColor: 'shadow-blue-500/50',
    speed: 7,
    power: 20,
    health: 110,
    specialMove: 'ICE BLAST',
    specialDamage: 40,
    comboThreshold: 3
  },
  raiden: {
    id: 'raiden',
    name: 'RAIDEN',
    emoji: '⚡',
    color: 'bg-purple-600',
    glowColor: 'shadow-purple-500/50',
    speed: 9,
    power: 16,
    health: 95,
    specialMove: 'LIGHTNING',
    specialDamage: 30,
    comboThreshold: 4
  },
  liukang: {
    id: 'liukang',
    name: 'LIU KANG',
    emoji: '🔥',
    color: 'bg-red-600',
    glowColor: 'shadow-red-500/50',
    speed: 8,
    power: 17,
    health: 105,
    specialMove: 'DRAGON FIRE',
    specialDamage: 32,
    comboThreshold: 3
  }
}

interface Character {
  id: string
  name: string
  emoji: string
  color: string
  glowColor: string
  x: number
  y: number
  health: number
  maxHealth: number
  speed: number
  power: number
  isJumping: boolean
  isAttacking: boolean
  facingRight: boolean
  width: number
  height: number
  combo: number
  lastHitTime: number
  momentumBoost: boolean
  momentumBoostTime: number
  specialMove: string
  specialDamage: number
  comboThreshold: number
}

interface GameState {
  gamePhase: 'selection' | 'fighting' | 'roundResult' | 'gameOver'
  player1: Character | null
  player2: Character | null
  player1Selection: string | null
  player2Selection: string | null
  roundTime: number
  currentRound: number
  player1Wins: number
  player2Wins: number
  winner: string | null
  roundWinner: string | null
  intensity: 'low' | 'medium' | 'high'
}

const STAGE_WIDTH = window.innerWidth
const STAGE_HEIGHT = window.innerHeight
const GROUND_Y = STAGE_HEIGHT - 150
const ROUND_TIME = 60
const JUMP_HEIGHT = 120
const COMBO_RESET_TIME = 2000 // 2 seconds
const MOMENTUM_BOOST_DURATION = 8000 // 8 seconds
const MOMENTUM_HEALTH_THRESHOLD = 30 // When health drops below 30%

function App() {
  const [gameState, setGameState] = useState<GameState>({
    gamePhase: 'selection',
    player1: null,
    player2: null,
    player1Selection: null,
    player2Selection: null,
    roundTime: ROUND_TIME,
    currentRound: 1,
    player1Wins: 0,
    player2Wins: 0,
    winner: null,
    roundWinner: null,
    intensity: 'low'
  })

  const [keys, setKeys] = useState<Set<string>>(new Set())
  const [showControls, setShowControls] = useState(false)
  
  // Audio refs for dynamic music and sound effects
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null)
  const hitSoundRef = useRef<HTMLAudioElement | null>(null)
  const specialSoundRef = useRef<HTMLAudioElement | null>(null)
  const comboSoundRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio context
  useEffect(() => {
    // Create audio context for sound effects (using Web Audio API simulation)
    const createAudioContext = () => {
      // Simulated audio - in a real game you'd load actual audio files
      backgroundMusicRef.current = new Audio()
      hitSoundRef.current = new Audio()
      specialSoundRef.current = new Audio()
      comboSoundRef.current = new Audio()
    }
    createAudioContext()
  }, [])

  // Play sound effect
  const playSound = useCallback((type: 'hit' | 'special' | 'combo') => {
    // In a real implementation, you'd play actual audio files
    console.log(`🔊 Playing ${type} sound effect`)
  }, [])

  // Update background music based on intensity
  useEffect(() => {
    console.log(`🎵 Background music intensity: ${gameState.intensity}`)
  }, [gameState.intensity])

  const createCharacter = (fighterKey: string, isPlayer1: boolean): Character => {
    const fighter = FIGHTERS[fighterKey as keyof typeof FIGHTERS]
    return {
      ...fighter,
      x: isPlayer1 ? STAGE_WIDTH * 0.25 : STAGE_WIDTH * 0.75,
      y: GROUND_Y,
      maxHealth: fighter.health,
      isJumping: false,
      isAttacking: false,
      facingRight: isPlayer1,
      width: 80,
      height: 120,
      combo: 0,
      lastHitTime: 0,
      momentumBoost: false,
      momentumBoostTime: 0
    }
  }

  const selectCharacter = (player: 'player1' | 'player2', fighterKey: string) => {
    setGameState(prev => ({
      ...prev,
      [`${player}Selection`]: fighterKey
    }))
  }

  const startFight = () => {
    if (!gameState.player1Selection || !gameState.player2Selection) return

    const player1 = createCharacter(gameState.player1Selection, true)
    const player2 = createCharacter(gameState.player2Selection, false)

    setGameState(prev => ({
      ...prev,
      gamePhase: 'fighting',
      player1,
      player2,
      roundTime: ROUND_TIME,
      intensity: 'low'
    }))
    setShowControls(true)
  }

  // Collision detection
  const checkCollision = useCallback((attacker: Character, defender: Character): boolean => {
    const attackRange = 100
    const distance = Math.abs(attacker.x - defender.x)
    return distance < attackRange && Math.abs(attacker.y - defender.y) < 50
  }, [])

  // Calculate game intensity based on health and time
  const calculateIntensity = useCallback((p1Health: number, p2Health: number, timeLeft: number): 'low' | 'medium' | 'high' => {
    const avgHealth = (p1Health + p2Health) / 2
    const healthFactor = avgHealth < 30 ? 2 : avgHealth < 60 ? 1 : 0
    const timeFactor = timeLeft < 20 ? 2 : timeLeft < 40 ? 1 : 0
    const totalIntensity = healthFactor + timeFactor

    if (totalIntensity >= 3) return 'high'
    if (totalIntensity >= 1) return 'medium'
    return 'low'
  }, [])

  // Keyboard handlers
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

  // Main game loop
  useEffect(() => {
    if (gameState.gamePhase !== 'fighting') return

    const gameLoop = setInterval(() => {
      setGameState(prevState => {
        if (!prevState.player1 || !prevState.player2 || prevState.gamePhase !== 'fighting') return prevState
        
        const newState = { ...prevState }
        const currentTime = Date.now()
        
        // Update round timer
        newState.roundTime = Math.max(0, newState.roundTime - 0.1)
        
        // Reset combos if too much time has passed
        if (currentTime - newState.player1.lastHitTime > COMBO_RESET_TIME) {
          newState.player1.combo = 0
        }
        if (currentTime - newState.player2.lastHitTime > COMBO_RESET_TIME) {
          newState.player2.combo = 0
        }

        // Update momentum boost timers
        if (newState.player1.momentumBoost && currentTime - newState.player1.momentumBoostTime > MOMENTUM_BOOST_DURATION) {
          newState.player1.momentumBoost = false
        }
        if (newState.player2.momentumBoost && currentTime - newState.player2.momentumBoostTime > MOMENTUM_BOOST_DURATION) {
          newState.player2.momentumBoost = false
        }

        // Check for momentum boost activation
        const p1HealthPercent = (newState.player1.health / newState.player1.maxHealth) * 100
        const p2HealthPercent = (newState.player2.health / newState.player2.maxHealth) * 100
        
        if (p1HealthPercent < MOMENTUM_HEALTH_THRESHOLD && p2HealthPercent > 60 && !newState.player1.momentumBoost) {
          newState.player1.momentumBoost = true
          newState.player1.momentumBoostTime = currentTime
        }
        if (p2HealthPercent < MOMENTUM_HEALTH_THRESHOLD && p1HealthPercent > 60 && !newState.player2.momentumBoost) {
          newState.player2.momentumBoost = true
          newState.player2.momentumBoostTime = currentTime
        }

        // Player 1 movement (WASD)
        const p1Speed = newState.player1.speed * (newState.player1.momentumBoost ? 1.5 : 1)
        if (keys.has('a') && newState.player1.x > 0) {
          newState.player1.x -= p1Speed
          newState.player1.facingRight = false
        }
        if (keys.has('d') && newState.player1.x < STAGE_WIDTH - newState.player1.width) {
          newState.player1.x += p1Speed
          newState.player1.facingRight = true
        }
        if (keys.has('w') && !newState.player1.isJumping) {
          newState.player1.isJumping = true
          setTimeout(() => {
            setGameState(state => state.player1 ? ({
              ...state,
              player1: { ...state.player1, isJumping: false }
            }) : state)
          }, 600)
        }

        // Player 2 movement (Arrow keys)
        const p2Speed = newState.player2.speed * (newState.player2.momentumBoost ? 1.5 : 1)
        if (keys.has('arrowleft') && newState.player2.x > 0) {
          newState.player2.x -= p2Speed
          newState.player2.facingRight = false
        }
        if (keys.has('arrowright') && newState.player2.x < STAGE_WIDTH - newState.player2.width) {
          newState.player2.x += p2Speed
          newState.player2.facingRight = true
        }
        if (keys.has('arrowup') && !newState.player2.isJumping) {
          newState.player2.isJumping = true
          setTimeout(() => {
            setGameState(state => state.player2 ? ({
              ...state,
              player2: { ...state.player2, isJumping: false }
            }) : state)
          }, 600)
        }

        // Player 1 attacks (J/K/L for normal, Q for special)
        if ((keys.has('j') || keys.has('k') || keys.has('l')) && !newState.player1.isAttacking) {
          newState.player1.isAttacking = true
          if (checkCollision(newState.player1, newState.player2)) {
            const damage = newState.player1.power * (newState.player1.momentumBoost ? 1.3 : 1)
            newState.player2.health = Math.max(0, newState.player2.health - damage)
            newState.player1.combo++
            newState.player1.lastHitTime = currentTime
            playSound('hit')
            
            if (newState.player1.combo >= 3) {
              playSound('combo')
            }
          }
          setTimeout(() => {
            setGameState(state => state.player1 ? ({
              ...state,
              player1: { ...state.player1, isAttacking: false }
            }) : state)
          }, 300)
        }

        // Player 1 special move (Q)
        if (keys.has('q') && newState.player1.combo >= newState.player1.comboThreshold && !newState.player1.isAttacking) {
          newState.player1.isAttacking = true
          if (checkCollision(newState.player1, newState.player2)) {
            const damage = newState.player1.specialDamage * (newState.player1.momentumBoost ? 1.5 : 1)
            newState.player2.health = Math.max(0, newState.player2.health - damage)
            newState.player1.combo = 0 // Reset combo after special
            playSound('special')
          }
          setTimeout(() => {
            setGameState(state => state.player1 ? ({
              ...state,
              player1: { ...state.player1, isAttacking: false }
            }) : state)
          }, 500)
        }

        // Player 2 attacks (Space for normal, Enter for special)
        if (keys.has(' ') && !newState.player2.isAttacking) {
          newState.player2.isAttacking = true
          if (checkCollision(newState.player2, newState.player1)) {
            const damage = newState.player2.power * (newState.player2.momentumBoost ? 1.3 : 1)
            newState.player1.health = Math.max(0, newState.player1.health - damage)
            newState.player2.combo++
            newState.player2.lastHitTime = currentTime
            playSound('hit')
            
            if (newState.player2.combo >= 3) {
              playSound('combo')
            }
          }
          setTimeout(() => {
            setGameState(state => state.player2 ? ({
              ...state,
              player2: { ...state.player2, isAttacking: false }
            }) : state)
          }, 300)
        }

        // Player 2 special move (Enter)
        if (keys.has('enter') && newState.player2.combo >= newState.player2.comboThreshold && !newState.player2.isAttacking) {
          newState.player2.isAttacking = true
          if (checkCollision(newState.player2, newState.player1)) {
            const damage = newState.player2.specialDamage * (newState.player2.momentumBoost ? 1.5 : 1)
            newState.player1.health = Math.max(0, newState.player1.health - damage)
            newState.player2.combo = 0 // Reset combo after special
            playSound('special')
          }
          setTimeout(() => {
            setGameState(state => state.player2 ? ({
              ...state,
              player2: { ...state.player2, isAttacking: false }
            }) : state)
          }, 500)
        }

        // Update game intensity
        newState.intensity = calculateIntensity(newState.player1.health, newState.player2.health, newState.roundTime)

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
            roundWinner = newState.player1.health > newState.player2.health ? 'player1' : 'player2'
            if (roundWinner === 'player1') newState.player1Wins++
            else newState.player2Wins++
          }
          
          newState.roundWinner = roundWinner
          newState.gamePhase = 'roundResult'
          
          if (newState.player1Wins >= 2 || newState.player2Wins >= 2) {
            newState.gamePhase = 'gameOver'
            newState.winner = newState.player1Wins >= 2 ? newState.player1.name : newState.player2.name
          }
        }

        return newState
      })
    }, 100)

    return () => clearInterval(gameLoop)
  }, [keys, gameState.gamePhase, playSound, checkCollision, calculateIntensity])

  const startNextRound = () => {
    if (!gameState.player1 || !gameState.player2) return
    
    setGameState(prevState => ({
      ...prevState,
      gamePhase: 'fighting',
      player1: prevState.player1 ? {
        ...prevState.player1,
        x: STAGE_WIDTH * 0.25,
        y: GROUND_Y,
        health: prevState.player1.maxHealth,
        isJumping: false,
        isAttacking: false,
        facingRight: true,
        combo: 0,
        momentumBoost: false
      } : null,
      player2: prevState.player2 ? {
        ...prevState.player2,
        x: STAGE_WIDTH * 0.75,
        y: GROUND_Y,
        health: prevState.player2.maxHealth,
        isJumping: false,
        isAttacking: false,
        facingRight: false,
        combo: 0,
        momentumBoost: false
      } : null,
      roundTime: ROUND_TIME,
      currentRound: prevState.currentRound + 1,
      roundWinner: null,
      intensity: 'low'
    }))
  }

  const resetGame = () => {
    setGameState({
      gamePhase: 'selection',
      player1: null,
      player2: null,
      player1Selection: null,
      player2Selection: null,
      roundTime: ROUND_TIME,
      currentRound: 1,
      player1Wins: 0,
      player2Wins: 0,
      winner: null,
      roundWinner: null,
      intensity: 'low'
    })
  }

  // Character Selection Screen
  if (gameState.gamePhase === 'selection') {
    return (
      <div className="w-screen h-screen bg-gradient-to-b from-gray-900 via-red-950 to-black flex items-center justify-center">
        <div className="max-w-6xl mx-auto p-8">
          <h1 className="text-6xl font-bold text-accent text-center mb-12">SELECT YOUR FIGHTER</h1>
          
          <div className="grid grid-cols-2 gap-16">
            {/* Player 1 Selection */}
            <div>
              <h2 className="text-3xl font-bold text-yellow-500 text-center mb-8">PLAYER 1</h2>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(FIGHTERS).map(([key, fighter]) => (
                  <Card 
                    key={key}
                    className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                      gameState.player1Selection === key 
                        ? 'border-yellow-500 border-4 bg-yellow-500/20' 
                        : 'border-accent bg-black/50'
                    }`}
                    onClick={() => selectCharacter('player1', key)}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="text-6xl mb-4">{fighter.emoji}</div>
                      <h3 className="text-xl font-bold text-accent mb-2">{fighter.name}</h3>
                      <div className="text-sm text-gray-300 space-y-1">
                        <div>Speed: {fighter.speed}/10</div>
                        <div>Power: {fighter.power}/25</div>
                        <div>Health: {fighter.health}</div>
                        <div className="text-accent font-bold">{fighter.specialMove}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Player 2 Selection */}
            <div>
              <h2 className="text-3xl font-bold text-blue-400 text-center mb-8">PLAYER 2</h2>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(FIGHTERS).map(([key, fighter]) => (
                  <Card 
                    key={key}
                    className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                      gameState.player2Selection === key 
                        ? 'border-blue-400 border-4 bg-blue-400/20' 
                        : 'border-accent bg-black/50'
                    }`}
                    onClick={() => selectCharacter('player2', key)}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="text-6xl mb-4">{fighter.emoji}</div>
                      <h3 className="text-xl font-bold text-accent mb-2">{fighter.name}</h3>
                      <div className="text-sm text-gray-300 space-y-1">
                        <div>Speed: {fighter.speed}/10</div>
                        <div>Power: {fighter.power}/25</div>
                        <div>Health: {fighter.health}</div>
                        <div className="text-accent font-bold">{fighter.specialMove}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Button 
              onClick={startFight}
              disabled={!gameState.player1Selection || !gameState.player2Selection}
              className="bg-primary hover:bg-primary/80 text-2xl px-12 py-4"
            >
              START BATTLE!
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Fighting Screen
  if (gameState.gamePhase === 'fighting' && gameState.player1 && gameState.player2) {
    return (
      <div className={`w-screen h-screen bg-gradient-to-b from-gray-900 via-red-950 to-black overflow-hidden relative
        ${gameState.intensity === 'high' ? 'animate-pulse' : ''}`}>
        
        {/* Dynamic background based on intensity */}
        <div className={`absolute inset-0 transition-all duration-1000 ${
          gameState.intensity === 'high' ? 'bg-gradient-to-b from-red-800/40 to-black/90' :
          gameState.intensity === 'medium' ? 'bg-gradient-to-b from-red-900/30 to-black/85' :
          'bg-gradient-to-b from-red-950/20 to-black/80'
        }`} />
        
        {/* HUD */}
        <div className="absolute top-0 left-0 right-0 z-10 p-6">
          <div className="flex justify-between items-start">
            {/* Player 1 HUD */}
            <div className="flex flex-col items-start">
              <h3 className="text-accent font-bold text-xl mb-2">{gameState.player1.name}</h3>
              
              {/* Health Bar */}
              <div className="w-80 h-6 bg-gray-800 border-2 border-accent rounded mb-2">
                <div 
                  className={`h-full bg-gradient-to-r from-green-500 to-yellow-500 rounded transition-all duration-300
                    ${gameState.player1.momentumBoost ? 'animate-pulse shadow-lg shadow-yellow-500/50' : ''}`}
                  style={{ width: `${(gameState.player1.health / gameState.player1.maxHealth) * 100}%` }}
                />
              </div>
              
              {/* Combo Meter */}
              <div className="w-80 h-3 bg-gray-800 border border-accent rounded mb-2">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded transition-all duration-300"
                  style={{ width: `${(gameState.player1.combo / gameState.player1.comboThreshold) * 100}%` }}
                />
              </div>
              <div className="text-accent text-sm mb-2">
                COMBO: {gameState.player1.combo} 
                {gameState.player1.combo >= gameState.player1.comboThreshold && 
                  <span className="text-purple-400 font-bold animate-pulse"> - SPECIAL READY!</span>
                }
              </div>
              
              {/* Momentum Boost Indicator */}
              {gameState.player1.momentumBoost && (
                <div className="text-yellow-400 font-bold animate-pulse">⚡ MOMENTUM BOOST!</div>
              )}
              
              {/* Win Counter */}
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
              <div className={`text-accent font-bold transition-all duration-300 ${
                gameState.roundTime < 10 ? 'text-8xl text-red-500 animate-pulse' : 'text-6xl'
              }`}>
                {Math.ceil(gameState.roundTime)}
              </div>
              <div className="text-accent text-lg">
                ROUND {gameState.currentRound}
              </div>
              <div className={`text-sm mt-2 ${
                gameState.intensity === 'high' ? 'text-red-400' :
                gameState.intensity === 'medium' ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                INTENSITY: {gameState.intensity.toUpperCase()}
              </div>
            </div>

            {/* Player 2 HUD */}
            <div className="flex flex-col items-end">
              <h3 className="text-accent font-bold text-xl mb-2">{gameState.player2.name}</h3>
              
              {/* Health Bar */}
              <div className="w-80 h-6 bg-gray-800 border-2 border-accent rounded mb-2">
                <div 
                  className={`h-full bg-gradient-to-r from-green-500 to-yellow-500 rounded transition-all duration-300 ml-auto
                    ${gameState.player2.momentumBoost ? 'animate-pulse shadow-lg shadow-yellow-500/50' : ''}`}
                  style={{ width: `${(gameState.player2.health / gameState.player2.maxHealth) * 100}%` }}
                />
              </div>
              
              {/* Combo Meter */}
              <div className="w-80 h-3 bg-gray-800 border border-accent rounded mb-2">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded transition-all duration-300 ml-auto"
                  style={{ width: `${(gameState.player2.combo / gameState.player2.comboThreshold) * 100}%` }}
                />
              </div>
              <div className="text-accent text-sm mb-2">
                COMBO: {gameState.player2.combo}
                {gameState.player2.combo >= gameState.player2.comboThreshold && 
                  <span className="text-purple-400 font-bold animate-pulse"> - SPECIAL READY!</span>
                }
              </div>
              
              {/* Momentum Boost Indicator */}
              {gameState.player2.momentumBoost && (
                <div className="text-yellow-400 font-bold animate-pulse">⚡ MOMENTUM BOOST!</div>
              )}
              
              {/* Win Counter */}
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
          className={`absolute transition-all duration-200 ${
            gameState.player1.isAttacking ? 'scale-110' : ''
          } ${gameState.player1.momentumBoost ? 'drop-shadow-2xl' : ''}`}
          style={{
            left: `${gameState.player1.x}px`,
            bottom: `${STAGE_HEIGHT - gameState.player1.y - gameState.player1.height + (gameState.player1.isJumping ? JUMP_HEIGHT : 0)}px`,
            width: `${gameState.player1.width}px`,
            height: `${gameState.player1.height}px`,
            transform: `scaleX(${gameState.player1.facingRight ? 1 : -1})`
          }}
        >
          <div className={`w-full h-full rounded-lg flex items-center justify-center text-white font-bold text-lg
            ${gameState.player1.isAttacking ? 'bg-red-600 shadow-lg shadow-red-500/50' : gameState.player1.color}
            ${gameState.player1.momentumBoost ? `shadow-2xl ${gameState.player1.glowColor} animate-pulse` : ''}
            border-4 border-accent transition-all duration-200`}>
            {gameState.player1.emoji}
          </div>
        </div>

        <div
          className={`absolute transition-all duration-200 ${
            gameState.player2.isAttacking ? 'scale-110' : ''
          } ${gameState.player2.momentumBoost ? 'drop-shadow-2xl' : ''}`}
          style={{
            left: `${gameState.player2.x}px`,
            bottom: `${STAGE_HEIGHT - gameState.player2.y - gameState.player2.height + (gameState.player2.isJumping ? JUMP_HEIGHT : 0)}px`,
            width: `${gameState.player2.width}px`,
            height: `${gameState.player2.height}px`,
            transform: `scaleX(${gameState.player2.facingRight ? 1 : -1})`
          }}
        >
          <div className={`w-full h-full rounded-lg flex items-center justify-center text-white font-bold text-lg
            ${gameState.player2.isAttacking ? 'bg-red-600 shadow-lg shadow-red-500/50' : gameState.player2.color}
            ${gameState.player2.momentumBoost ? `shadow-2xl ${gameState.player2.glowColor} animate-pulse` : ''}
            border-4 border-accent transition-all duration-200`}>
            {gameState.player2.emoji}
          </div>
        </div>

        {/* Controls Overlay */}
        <Dialog open={showControls} onOpenChange={setShowControls}>
          <DialogContent className="bg-black/90 border-accent text-accent max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-3xl text-center">ENHANCED COMBAT CONTROLS</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-8 p-4">
              <div>
                <h3 className="text-xl font-bold mb-4 text-yellow-500">PLAYER 1</h3>
                <div className="space-y-2">
                  <div><span className="font-bold">WASD:</span> Move</div>
                  <div><span className="font-bold">W:</span> Jump</div>
                  <div><span className="font-bold">J/K/L:</span> Attack</div>
                  <div><span className="font-bold text-purple-400">Q:</span> Special Move (when combo ready)</div>
                  <div className="text-sm text-gray-400 mt-4">
                    Build combo meter with consecutive hits to unlock special moves!
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-4 text-blue-400">PLAYER 2</h3>
                <div className="space-y-2">
                  <div><span className="font-bold">Arrow Keys:</span> Move</div>
                  <div><span className="font-bold">↑:</span> Jump</div>
                  <div><span className="font-bold">Space:</span> Attack</div>
                  <div><span className="font-bold text-purple-400">Enter:</span> Special Move (when combo ready)</div>
                  <div className="text-sm text-gray-400 mt-4">
                    When health is low, you'll get a momentum boost with enhanced speed and power!
                  </div>
                </div>
              </div>
            </div>
            <Button onClick={() => setShowControls(false)} className="bg-primary hover:bg-primary/80">
              FIGHT!
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Round Result Screen
  if (gameState.gamePhase === 'roundResult') {
    return (
      <div className="w-screen h-screen bg-gradient-to-b from-gray-900 via-red-950 to-black flex items-center justify-center">
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="bg-black/90 border-accent text-accent">
            <DialogHeader>
              <DialogTitle className="text-4xl text-center">
                {gameState.roundWinner === 'player1' ? `${gameState.player1?.name} WINS!` : `${gameState.player2?.name} WINS!`}
              </DialogTitle>
            </DialogHeader>
            <div className="text-center p-4">
              <div className="text-2xl mb-4">Round {gameState.currentRound} Complete</div>
              <div className="text-lg mb-6">
                Score: {gameState.player1Wins} - {gameState.player2Wins}
              </div>
              <Button onClick={startNextRound} className="bg-primary hover:bg-primary/80 text-xl px-8 py-3">
                NEXT ROUND
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Game Over Screen
  if (gameState.gamePhase === 'gameOver') {
    return (
      <div className="w-screen h-screen bg-gradient-to-b from-gray-900 via-red-950 to-black flex items-center justify-center">
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="bg-black/90 border-accent text-accent">
            <DialogHeader>
              <DialogTitle className="text-5xl text-center text-accent animate-pulse">
                {gameState.winner} WINS!
              </DialogTitle>
            </DialogHeader>
            <div className="text-center p-4">
              <div className="text-3xl mb-4 text-red-500">FATALITY!</div>
              <div className="text-lg mb-6">
                Final Score: {gameState.player1Wins} - {gameState.player2Wins}
              </div>
              <div className="space-y-4">
                <Button onClick={resetGame} className="bg-primary hover:bg-primary/80 text-xl px-8 py-3 mr-4">
                  NEW GAME
                </Button>
                <Button onClick={startNextRound} className="bg-gray-700 hover:bg-gray-600 text-xl px-8 py-3">
                  REMATCH
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return null
}

export default App