/**
 * 21 点纸牌街机玩法（Task 6.4）。
 *
 * 拥有扑克/21 点的状态与动作（发牌、要牌、停牌、结算），从 `main.js` 抽取。
 * 保留现有 UI 行为，通过 `app`（兼容上下文）访问 gameData / 经济 / 提示服务。
 * 共享牌局状态（pokerBet / pokerDeck / playerHand / dealerHand）仍挂在 app 上。
 */
export class PokerGame {
  constructor(app) {
    this.app = app;
  }

  /** 绑定扑克开始与控制按钮。 */
  init() {
    const container = document.getElementById('modal-arcade');
    if (!container) return;

    const dealBtn = document.getElementById('btn-poker-deal');
    const hitBtn = document.getElementById('btn-poker-hit');
    const standBtn = document.getElementById('btn-poker-stand');
    const restartBtn = document.getElementById('btn-poker-restart');

    if (dealBtn) dealBtn.addEventListener('click', () => this.action('deal'));
    if (hitBtn) hitBtn.addEventListener('click', () => this.action('hit'));
    if (standBtn) standBtn.addEventListener('click', () => this.action('stand'));
    if (restartBtn) restartBtn.addEventListener('click', () => this.action('restart'));
  }

  action(action) {
    const app = this.app;
    const playPanel = document.getElementById('poker-play-panel');
    const startPanel = document.getElementById('poker-start-panel');
    const infoText = document.getElementById('poker-info-text');

    if (action === 'deal') {
      const bet = parseInt(document.getElementById('poker-bet-input')?.value || 10) || 10;
      if (app.gameData.coins < bet) {
        alert('您的金币不足，无法开始下注！🪙');
        return;
      }
      app.updateCoins(-bet);
      app.pokerBet = bet;

      if (startPanel) startPanel.style.display = 'none';
      if (playPanel) playPanel.style.display = 'flex';

      app.pokerDeck = this.createDeck();
      app.playerHand = [this.drawCard(), this.drawCard()];
      app.dealerHand = [this.drawCard(), this.drawCard()];

      this.updateCardsUI();

      const pScore = this.getScore(app.playerHand);
      if (pScore === 21) {
        this.action('stand');
      }
    } else if (action === 'hit') {
      app.playerHand.push(this.drawCard());
      this.updateCardsUI();

      if (this.getScore(app.playerHand) > 21) {
        this.endGame('dealer_win', '爆牌！您输掉了这局对局 😢');
      }
    } else if (action === 'stand') {
      let dScore = this.getScore(app.dealerHand);
      while (dScore < 17) {
        app.dealerHand.push(this.drawCard());
        dScore = this.getScore(app.dealerHand);
      }
      this.updateCardsUI(true);

      const pScore = this.getScore(app.playerHand);
      if (dScore > 21) {
        this.endGame('player_win', '庄家爆牌！恭喜您获得胜利 🎉');
      } else if (pScore > dScore) {
        this.endGame('player_win', '您的点数比庄家更大，恭喜胜出 🎉');
      } else if (pScore < dScore) {
        this.endGame('dealer_win', '庄家点数更大，您输了 😢');
      } else {
        this.endGame('push', '双方点数平手 ⚖️');
      }
    } else if (action === 'restart') {
      if (startPanel) startPanel.style.display = 'flex';
      if (playPanel) playPanel.style.display = 'none';
      if (infoText) infoText.textContent = '';
    }
  }

  createDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];
    for (const s of suits) {
      for (const v of values) {
        deck.push({ suit: s, value: v });
      }
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  drawCard() {
    return this.app.pokerDeck.pop();
  }

  getScore(hand) {
    let score = 0;
    let aces = 0;
    for (const card of hand) {
      if (card.value === 'A') {
        aces++;
        score += 11;
      } else if (['J', 'Q', 'K'].includes(card.value)) {
        score += 10;
      } else {
        score += parseInt(card.value);
      }
    }
    while (score > 21 && aces > 0) {
      score -= 10;
      aces--;
    }
    return score;
  }

  updateCardsUI(revealDealer = false) {
    const app = this.app;
    const pContainer = document.getElementById('poker-player-cards');
    const dContainer = document.getElementById('poker-dealer-cards');
    const pScoreEl = document.getElementById('poker-player-score');
    const dScoreEl = document.getElementById('poker-dealer-score');

    if (pContainer) {
      pContainer.innerHTML = app.playerHand.map((c) => `<div class="poker-card ${['♥', '♦'].includes(c.suit) ? 'red' : ''}">${c.value}<br>${c.suit}</div>`).join('');
    }

    if (dContainer) {
      if (revealDealer) {
        dContainer.innerHTML = app.dealerHand.map((c) => `<div class="poker-card ${['♥', '♦'].includes(c.suit) ? 'red' : ''}">${c.value}<br>${c.suit}</div>`).join('');
      } else {
        dContainer.innerHTML = `<div class="poker-card ${['♥', '♦'].includes(app.dealerHand[0].suit) ? 'red' : ''}">${app.dealerHand[0].value}<br>${app.dealerHand[0].suit}</div><div class="poker-card back">?</div>`;
      }
    }

    if (pScoreEl) pScoreEl.textContent = `点数: ${this.getScore(app.playerHand)}`;
    if (dScoreEl) {
      dScoreEl.textContent = revealDealer ? `点数: ${this.getScore(app.dealerHand)}` : '点数: ?';
    }
  }

  endGame(result, message) {
    const app = this.app;
    const infoText = document.getElementById('poker-info-text');
    if (infoText) infoText.textContent = message;

    const hitBtn = document.getElementById('btn-poker-hit');
    const standBtn = document.getElementById('btn-poker-stand');
    const restartBtn = document.getElementById('btn-poker-restart');

    if (hitBtn) hitBtn.style.display = 'none';
    if (standBtn) standBtn.style.display = 'none';
    if (restartBtn) restartBtn.style.display = 'inline-block';

    if (result === 'player_win') {
      app.updateCoins(app.pokerBet * 2);
      app.gainExp(15);
      app.triggerTaskProgress('game_poker');
      app.playCustomSound(520, 0.35, 'sine', 0.08);
    } else if (result === 'push') {
      app.updateCoins(app.pokerBet);
      app.playCustomSound(330, 0.2, 'sine', 0.05);
    } else {
      app.playCustomSound(120, 0.4, 'sawtooth', 0.1);
    }
  }
}
