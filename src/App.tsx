import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import './App.css'
import { CATEGORY_LABELS, LANGUAGE_OPTIONS, UI_TEXT, type Language } from './data/i18n'
import { QUESTIONS } from './data/questions'

type Mode = 'practice' | 'time'

const DURATION_OPTIONS = [30, 60, 90]

const ACCURACY_BONUS_START = 0.9
const ACCURACY_BONUS_STEP = 2
const ACCURACY_BONUS_MAX = 1.2
const CONFETTI_COUNT = 14

const HIGH_SCORE_KEY = 'lazyvim-key-dojo:high-score'
const LANGUAGE_KEY = 'lazyvim-key-dojo:language'

const getRandomIndex = (length: number, exclude?: number) => {
  if (length <= 1) return 0
  let index = Math.floor(Math.random() * length)
  while (index === exclude) {
    index = Math.floor(Math.random() * length)
  }
  return index
}

const normalizeKey = (eventKey: string) => {
  if (eventKey === ' ') return '<leader>'
  return eventKey
}

const tokensMatch = (inputToken: string, expectedToken: string) => {
  if (inputToken === expectedToken) return true
  if (inputToken.length === 1 && expectedToken.length === 1) {
    return inputToken.toLowerCase() === expectedToken.toLowerCase()
  }
  return false
}

const getAccuracyMultiplier = (accuracy: number) => {
  if (accuracy < ACCURACY_BONUS_START) return 1
  const bonus = (accuracy - ACCURACY_BONUS_START) * ACCURACY_BONUS_STEP
  return Math.min(ACCURACY_BONUS_MAX, 1 + bonus)
}

function App() {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem(LANGUAGE_KEY)
    if (stored === 'ja' || stored === 'en') return stored
    return 'ja'
  })
  const [mode, setMode] = useState<Mode>('practice')
  const [category, setCategory] = useState('all')
  const [duration, setDuration] = useState(60)
  const [running, setRunning] = useState(true)
  const [timeLeft, setTimeLeft] = useState(duration)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [correctInputs, setCorrectInputs] = useState(0)
  const [wrongInputs, setWrongInputs] = useState(0)
  const [tokenIndex, setTokenIndex] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [lastResult, setLastResult] = useState<'correct' | 'wrong' | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [soundOn, setSoundOn] = useState(false)
  const [flash, setFlash] = useState<'correct' | 'wrong' | 'streak' | null>(null)
  const [showKeys, setShowKeys] = useState(false)
  const [showDescription, setShowDescription] = useState(true)
  const [revealAnswer, setRevealAnswer] = useState(false)
  const [shake, setShake] = useState(false)
  const [scorePulse, setScorePulse] = useState(false)
  const [confettiKey, setConfettiKey] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    const stored = localStorage.getItem(HIGH_SCORE_KEY)
    if (!stored) return 0
    const value = Number(stored)
    return Number.isNaN(value) ? 0 : value
  })
  const [typedTokens, setTypedTokens] = useState<string[]>([])
  const [finalScore, setFinalScore] = useState(0)

  const filteredQuestions = useMemo(() => {
    if (category === 'all') return QUESTIONS
    return QUESTIONS.filter((question) => question.category === category)
  }, [category])

  const currentQuestion =
    filteredQuestions[Math.min(questionIndex, filteredQuestions.length - 1)]

  const accuracy =
    correctInputs + wrongInputs === 0
      ? 1
      : correctInputs / (correctInputs + wrongInputs)

  const accuracyMultiplier = getAccuracyMultiplier(accuracy)

  const t = UI_TEXT[language]
  const categoryLabels = CATEGORY_LABELS[language]

  const questionTitle = currentQuestion
    ? language === 'ja'
      ? currentQuestion.title
      : currentQuestion.titleEn
    : ''
  const questionSubtitle = currentQuestion
    ? language === 'ja'
      ? currentQuestion.titleEn
      : currentQuestion.title
    : ''
  const questionDescription = currentQuestion
    ? language === 'ja'
      ? currentQuestion.description ?? `${currentQuestion.title}を実行します。`
      : currentQuestion.descriptionEn ?? `Run: ${currentQuestion.titleEn}.`
    : ''

  const revealKeys = showKeys || revealAnswer

  const confettiPieces = useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }, (_, index) => ({
        id: index,
        x: (index * 7) % 100,
        r: (index * 35) % 360,
        d: `${(index * 0.05).toFixed(2)}s`,
      })),
    [],
  )

  const audioRef = useRef<AudioContext | null>(null)
  const endTimeRef = useRef<number | null>(null)
  const revealTimerRef = useRef<number | null>(null)
  const scoreRef = useRef(score)
  const accuracyRef = useRef(accuracyMultiplier)
  const highScoreRef = useRef(highScore)

  const isActive = mode === 'practice' || running

  const resetRound = useCallback(
    (nextIndex?: number) => {
      if (revealTimerRef.current) {
        window.clearTimeout(revealTimerRef.current)
        revealTimerRef.current = null
      }
      setRevealAnswer(false)
      const targetIndex =
        typeof nextIndex === 'number'
          ? nextIndex
          : getRandomIndex(filteredQuestions.length, questionIndex)
      setQuestionIndex(targetIndex)
      setTokenIndex(0)
      setTypedTokens([])
      setLastResult(null)
    },
    [filteredQuestions.length, questionIndex],
  )

  const resetSession = useCallback(
    (nextMode: Mode) => {
      setScore(0)
      setStreak(0)
      setCorrectInputs(0)
      setWrongInputs(0)
      setShowResult(false)
      setFinalScore(0)
      setRunning(nextMode === 'practice')
      setTimeLeft(duration)
      endTimeRef.current = null
      resetRound(0)
    },
    [duration, resetRound],
  )

  const handleSound = useCallback((success: boolean) => {
    if (!soundOn) return
    const context = audioRef.current ?? new AudioContext()
    audioRef.current = context
    const osc = context.createOscillator()
    const gain = context.createGain()
    osc.type = 'triangle'
    osc.frequency.value = success ? 520 : 220
    gain.gain.value = 0.1
    osc.connect(gain)
    gain.connect(context.destination)
    osc.start()
    osc.stop(context.currentTime + 0.08)
  }, [soundOn])

  const handleCorrectToken = useCallback(() => {
    setCorrectInputs((value) => value + 1)
    setLastResult('correct')
    setFlash('correct')
    handleSound(true)
  }, [handleSound])

  const startReveal = useCallback(
    (onComplete?: () => void) => {
      setRevealAnswer(true)
      if (revealTimerRef.current) {
        window.clearTimeout(revealTimerRef.current)
      }
      if (onComplete) {
        revealTimerRef.current = window.setTimeout(() => {
          setRevealAnswer(false)
          revealTimerRef.current = null
          onComplete()
        }, 420)
      } else {
        revealTimerRef.current = window.setTimeout(() => {
          setRevealAnswer(false)
          revealTimerRef.current = null
        }, 420)
      }
    },
    [],
  )

  const handleWrongToken = useCallback(() => {
    setWrongInputs((value) => value + 1)
    setLastResult('wrong')
    setStreak(0)
    setFlash('wrong')
    startReveal()
    handleSound(false)
  }, [handleSound, startReveal])

  const completeQuestion = useCallback(() => {
    setStreak((value) => {
      const nextStreak = value + 1
      const bonus = nextStreak % 5 === 0 ? 10 : 0
      setScore((scoreValue) => scoreValue + 10 + bonus)
      if (nextStreak % 5 === 0) {
        setFlash('streak')
        setConfettiKey((value) => value + 1)
      }
      return nextStreak
    })
    startReveal(() => resetRound())
  }, [resetRound, startReveal])

  const handleTokenInput = useCallback((inputToken: string) => {
    if (!currentQuestion) return
    const expectedToken = currentQuestion.keys[tokenIndex]
    if (!expectedToken) return

    if (tokensMatch(inputToken, expectedToken)) {
      setTypedTokens((tokens) => {
        const next = [...tokens]
        next[tokenIndex] = inputToken
        return next
      })
      setTokenIndex((index) => index + 1)
      handleCorrectToken()
      if (tokenIndex + 1 >= currentQuestion.keys.length) {
        completeQuestion()
      }
      return
    }

    handleWrongToken()
    if (mode === 'time') {
      resetRound()
    }
  }, [
    currentQuestion,
    tokenIndex,
    handleCorrectToken,
    handleWrongToken,
    completeQuestion,
    mode,
    resetRound,
  ])

  const handleModeChange = useCallback(
    (nextMode: Mode) => {
      setMode(nextMode)
      setShowResult(false)
      resetSession(nextMode)
    },
    [resetSession],
  )

  const handleCategoryChange = useCallback(
    (nextCategory: string) => {
      setCategory(nextCategory)
      setQuestionIndex(0)
      setTokenIndex(0)
      setTypedTokens([])
      setLastResult(null)
    },
    [],
  )

  const handleDurationChange = useCallback(
    (nextDuration: number) => {
      setDuration(nextDuration)
      if (mode === 'time') {
        setTimeLeft(nextDuration)
        setRunning(false)
        setShowResult(false)
        endTimeRef.current = null
      }
    },
    [mode],
  )

  useEffect(() => {
    if (!running || mode !== 'time') return
    if (!endTimeRef.current) {
      endTimeRef.current = Date.now() + duration * 1000
    }
    const timer = window.setInterval(() => {
      const next = Math.max(
        0,
        Math.ceil((endTimeRef.current! - Date.now()) / 1000),
      )
      setTimeLeft(next)
      if (next <= 0) {
        window.clearInterval(timer)
        setRunning(false)
        setShowResult(true)
        const computedScore = Math.round(
          scoreRef.current * accuracyRef.current,
        )
        setFinalScore(computedScore)
        if (computedScore > highScoreRef.current) {
          setHighScore(computedScore)
          localStorage.setItem(HIGH_SCORE_KEY, String(computedScore))
        }
      }
    }, 200)
    return () => window.clearInterval(timer)
  }, [running, mode, duration])

  useEffect(() => {
    if (!flash) return
    if (flash === 'wrong') {
      setShake(true)
    }
    const timer = window.setTimeout(() => setFlash(null), 160)
    const shakeTimer = window.setTimeout(() => setShake(false), 220)
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(shakeTimer)
    }
  }, [flash])

  useEffect(() => {
    if (score === 0) return
    setScorePulse(true)
    const timer = window.setTimeout(() => setScorePulse(false), 220)
    return () => window.clearTimeout(timer)
  }, [score])

  useEffect(() => {
    scoreRef.current = score
    accuracyRef.current = accuracyMultiplier
    highScoreRef.current = highScore
  }, [score, accuracyMultiplier, highScore])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (!isActive) return

      if (event.key === 'Escape') {
        event.preventDefault()
        setTokenIndex(0)
        setTypedTokens([])
        setLastResult(null)
        return
      }

      if (event.key === ' ') {
        event.preventDefault()
        const expectedToken = currentQuestion?.keys[tokenIndex]
        if (expectedToken && expectedToken !== '<leader>') {
          return
        }
      }

      if (event.key.length !== 1 && event.key !== ' ') return

      const token = normalizeKey(event.key)
      handleTokenInput(token)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleTokenInput, isActive])

  const startTimeAttack = () => {
    setScore(0)
    setStreak(0)
    setCorrectInputs(0)
    setWrongInputs(0)
    setTimeLeft(duration)
    setShowResult(false)
    setRunning(true)
    setFinalScore(0)
    endTimeRef.current = Date.now() + duration * 1000
    resetRound(0)
  }

  const accuracyLabel = `${Math.round(accuracy * 100)}%`

  const handleLanguageChange = (nextLanguage: Language) => {
    setLanguage(nextLanguage)
    localStorage.setItem(LANGUAGE_KEY, nextLanguage)
  }

  return (
    <div className={`app ${shake ? 'app-shake' : ''}`}>
      <header className="hero">
        <div className="hero-text">
          <span className="eyebrow">{t.eyebrow}</span>
          <h1>{t.heroTitle}</h1>
          <p className="subtitle">
            {t.heroSubtitlePrefix}{' '}
            <span>{t.heroSubtitleSpace}</span>{' '}
            {t.heroSubtitleBetween}{' '}
            <span>{t.heroSubtitleLeader}</span>
            {t.heroSubtitleSuffix}
          </p>
          <p className="notice">{t.heroNotice}</p>
        </div>
        <div className="hero-panel">
          <div className="panel-item">
            <span>{t.highScore}</span>
            <strong>{highScore}</strong>
          </div>
          <div className="panel-item">
            <span>{t.accuracy}</span>
            <strong>{accuracyLabel}</strong>
          </div>
          <div className="panel-item">
            <span>{t.streak}</span>
            <strong>{streak}</strong>
          </div>
        </div>
      </header>

      <main className="game">
        <section className={`prompt-card ${flash ? `flash-${flash}` : ''}`}>
          <div className="prompt-header">
            <span>{t.promptLabel}</span>
            <span className="mode-tag" data-testid="mode-tag">
              {mode === 'practice' ? t.modeTagPractice : t.modeTagTime}
            </span>
          </div>
          <h2 data-testid="question-title">
            {questionTitle} <span>{questionSubtitle}</span>
          </h2>
          {revealKeys && (
            <div className="keys-row">
              {currentQuestion?.keys.map((key, index) => (
                <span
                  className="key-chip"
                  key={`${currentQuestion.id}-${key}-${index}`}
                >
                  {key}
                </span>
              ))}
            </div>
          )}
          {showDescription && questionDescription && (
            <p className="action-desc">{questionDescription}</p>
          )}
          <div
            className={`confetti ${flash === 'streak' ? 'active' : ''}`}
            key={confettiKey}
            aria-hidden="true"
          >
            {confettiPieces.map((piece) => (
              <span
                className="confetti-piece"
                key={piece.id}
                style={{
                  '--x': `${piece.x}%`,
                  '--r': `${piece.r}deg`,
                  '--d': piece.d,
                } as CSSProperties}
              />
            ))}
          </div>
          <div className="input-row">
            {currentQuestion?.keys.map((_, index) => {
              const status =
                index < tokenIndex
                  ? 'correct'
                  : index === tokenIndex
                    ? lastResult === 'wrong'
                      ? 'wrong'
                      : 'active'
                    : 'pending'
              return (
                <span
                  className={`input-token ${status}`}
                  data-testid={`input-token-${index}`}
                  key={`input-${index}`}
                >
                  {typedTokens[index] ?? ''}
                </span>
              )
            })}
          </div>
          <p className="hint">
            {t.hint}
          </p>
        </section>

        <aside className="stats">
          <div className="stat-card">
            <span>{t.score}</span>
            <strong
              className={scorePulse ? 'score-pop' : ''}
              data-testid="score-value"
            >
              {score}
            </strong>
          </div>
          <div className="stat-card">
            <span>{t.correct}</span>
            <strong data-testid="correct-value">{correctInputs}</strong>
          </div>
          <div className="stat-card">
            <span>{t.wrong}</span>
            <strong data-testid="wrong-value">{wrongInputs}</strong>
          </div>
          <div className="stat-card">
            <span>{t.timeLeft}</span>
            <strong data-testid="time-left">
              {mode === 'practice' ? t.infinity : `${timeLeft}s`}
            </strong>
          </div>
          {mode === 'time' && !running && (
            <button
              className="primary"
              data-testid="start-button"
              onClick={startTimeAttack}
            >
              {t.start}
            </button>
          )}
        </aside>
      </main>

      <section className="controls">
        <div className="control-group">
          <span className="label">{t.modeLabel}</span>
          <div className="segmented">
            <button
              className={mode === 'practice' ? 'active' : ''}
              onClick={() => handleModeChange('practice')}
            >
              {t.modePractice}
            </button>
            <button
              className={mode === 'time' ? 'active' : ''}
              onClick={() => handleModeChange('time')}
            >
              {t.modeTime}
            </button>
          </div>
        </div>
        <div className="control-group">
          <span className="label">{t.categoryLabel}</span>
          <div className="pill-group">
            {Object.keys(categoryLabels).map((key) => (
              <button
                key={key}
                className={`pill ${category === key ? 'active' : ''}`}
                onClick={() => handleCategoryChange(key)}
              >
                {categoryLabels[key]}
              </button>
            ))}
          </div>
        </div>
        <div className="control-group">
          <span className="label">{t.settingsLabel}</span>
          <div className="pill-group">
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option}
                className={`pill ${duration === option ? 'active' : ''}`}
                onClick={() => handleDurationChange(option)}
                disabled={mode !== 'time'}
              >
                {option}s
              </button>
            ))}
            <button
              className={`pill ${soundOn ? 'active' : ''}`}
              onClick={() => setSoundOn((value) => !value)}
            >
              {soundOn ? t.soundOn : t.soundOff}
            </button>
            <button
              className={`pill ${showKeys ? 'active' : ''}`}
              onClick={() => setShowKeys((value) => !value)}
            >
              {showKeys ? t.showKeysOn : t.showKeysOff}
            </button>
            <button
              className={`pill ${showDescription ? 'active' : ''}`}
              onClick={() => setShowDescription((value) => !value)}
            >
              {showDescription ? t.showDescOn : t.showDescOff}
            </button>
          </div>
        </div>
        <div className="control-group">
          <span className="label">{t.languageLabel}</span>
          <div className="pill-group">
            {LANGUAGE_OPTIONS.map((option) => (
              <button
                key={option.code}
                className={`pill ${language === option.code ? 'active' : ''}`}
                onClick={() => handleLanguageChange(option.code)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {showResult && mode === 'time' && (
        <div className="overlay">
          <div className="result-card">
            <h3>{t.result}</h3>
            <div className="result-grid">
              <div>
                <span>{t.baseScore}</span>
                <strong>{score}</strong>
              </div>
              <div>
                <span>{t.accuracyMultiplier}</span>
                <strong>x{accuracyMultiplier.toFixed(2)}</strong>
              </div>
              <div>
                <span>{t.finalScore}</span>
                <strong>{finalScore}</strong>
              </div>
              <div>
                <span>{t.highScore}</span>
                <strong>{highScore}</strong>
              </div>
            </div>
            <button className="primary" onClick={startTimeAttack}>
              {t.retry}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
