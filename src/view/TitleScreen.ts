import type { Beeper } from '../engine/Beeper'

// The title screen: its tune, and the way into the game.
export class TitleScreen {
  private readonly intro = document.getElementById('intro')

  constructor(private readonly beeper: Beeper) {}

  get showing(): boolean {
    return this.intro !== null && this.intro.style.display !== 'none'
  }

  // With a saved game, the hint and the button to go on with it.
  offerContinue(): void {
    const hint = document.getElementById('continue-hint')
    if (hint) hint.style.display = 'block'
    const button = document.getElementById('continue')
    if (button) button.style.display = ''
  }

  // The original's title tune. Browsers hold sound back until the page has
  // had a click or a key, and a key starts the game, so when sound is held
  // back a click on the title screen plays the tune instead. Whichever comes
  // first, the click or the browser's yes, starts it once.
  playTune(): void {
    let started = false
    const start = (): void => {
      if (started || !this.showing) return
      started = true
      hideSoundHint()
      this.beeper.play('title')
    }
    window.addEventListener('pointerdown', start, { once: true })
    void this.beeper.soundAllowed().then((allowed) => {
      if (allowed) start()
      else if (!started && this.showing) showSoundHint()
    })
  }

  // True when it was showing, and the game now begins.
  close(): boolean {
    if (!this.intro || !this.showing) return false
    this.intro.style.display = 'none'
    hideSoundHint()
    this.beeper.stop()
    this.beeper.play('gameStart')
    return true
  }
}

function showSoundHint(): void {
  const hint = document.getElementById('sound-hint')
  if (hint) hint.style.display = 'block'
}

function hideSoundHint(): void {
  const hint = document.getElementById('sound-hint')
  if (hint) hint.style.display = 'none'
}
