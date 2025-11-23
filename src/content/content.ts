import { getConfig, onMessage, type ExtensionConfig, type MessageType } from '../shared/storage.ts';

let config: ExtensionConfig;
let intervalId: number | null = null;
let isActive = false;

async function init() {
  console.log('[XRayFeed] Content script injected on:', window.location.pathname);
  config = await getConfig();
  isActive = config.isActive;
  
  if (isActive && window.location.pathname === '/home') {
    console.log('[XRayFeed] Starting highlighting (init)');
    startHighlighting();
  }
  
  setupMessageListener();
}

function setupMessageListener() {
  onMessage((message: MessageType, sender, sendResponse) => {
    switch (message.type) {
      case 'START':
        console.log('[XRayFeed] Received START message on:', window.location.pathname);
        if (window.location.pathname === '/home') {
          isActive = true;
          startHighlighting();
        }
        sendResponse({ success: true });
        break;
      case 'STOP':
        console.log('[XRayFeed] Received STOP message on:', window.location.pathname);
        isActive = false;
        stopHighlighting();
        sendResponse({ success: true });
        break;
      case 'UPDATE_CONFIG':
        config = { ...config, ...message.config };
        if (isActive) {
          restartHighlighting();
        }
        sendResponse({ success: true });
        break;
      case 'GET_STATUS':
        sendResponse({ isActive });
        break;
    }
    return true;
  });
}

function startHighlighting() {
  if (intervalId !== null) {
    clearInterval(intervalId);
  }
  
  markFilteredPosts();
  intervalId = window.setInterval(() => {
    markFilteredPosts();
  }, config.frequency);
}

function stopHighlighting() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  clearAllHighlights();
}

function restartHighlighting() {
  stopHighlighting();
  if (isActive) {
    startHighlighting();
  }
}

function clearAllHighlights() {
  const tweets = document.querySelectorAll('article[data-testid="tweet"]');
  tweets.forEach((tweet) => {
    if (tweet instanceof HTMLElement) {
      tweet.style.backgroundColor = '';
    }
  });
}

interface TweetData {
  tweet: HTMLElement;
  diffHours: number;
  diffMinutes: number;
  id: string | null;
  originalId: string | null;
  likes: number;
}

type EvaluatedTweetData = TweetData & { meetsCriteria: boolean };

function markFilteredPosts() {
  const now = new Date();
  const tweets = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
  
  const tweetData: TweetData[] = tweets.map((tweet) => {
    if (!(tweet instanceof HTMLElement)) {
      return null;
    }
    
    const timeEl = tweet.querySelector('time');
    const postTime = timeEl ? new Date(timeEl.getAttribute('datetime') || '') : null;
    const diffMs = postTime ? now.getTime() - postTime.getTime() : 0;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffMinutes = diffMs / (1000 * 60);
    const id = tweet.getAttribute('aria-labelledby');
    const replyLink = tweet.querySelector('a[href*="/status/"]');
    const originalId = replyLink ? replyLink.getAttribute('href')?.split('/status/')[1] || null : null;
    const likeButton = tweet.querySelector('button[data-testid="like"]');
    const likesText = likeButton ? likeButton.getAttribute('aria-label') || '0 Likes' : '0 Likes';
    const likes = parseInt(likesText.replace(' Like', '').replace(' Likes', '')) || 0;
    
    return { tweet, diffHours, diffMinutes, id, originalId, likes };
  }).filter((data): data is TweetData => data !== null);
  
  const evaluatedTweets: EvaluatedTweetData[] = tweetData.map((data) => ({
    ...data,
    meetsCriteria: meetsHighlightCriteria(data),
  }));
  
  evaluatedTweets.forEach((data) => {
    const hasQualifyingReply = evaluatedTweets.some(
      (other) => other.originalId === data.id && other.meetsCriteria
    );
    const shouldHighlight = data.meetsCriteria || hasQualifyingReply;
    
    data.tweet.style.backgroundColor = shouldHighlight ? config.highlightColor : '';
  });
}

function meetsHighlightCriteria(data: TweetData): boolean {
  if (data.diffHours > config.maxHours) {
    return false;
  }
  
  if (data.diffMinutes <= 5 && data.likes <= 5) {
    return false;
  }
  
  const minutesAlive = Math.max(data.diffMinutes, 1 / 60);
  const likesPerMinute = data.likes / minutesAlive;
  const likesPerMinuteThreshold = config.likesPerHourThreshold / 60;
  
  if (likesPerMinute < likesPerMinuteThreshold) {
    return false;
  }
  
  return true;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
