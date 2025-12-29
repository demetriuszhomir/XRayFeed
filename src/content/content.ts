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
  engagement: EngagementMetrics;
}

interface EngagementMetrics {
  replies: number;
  reposts: number;
  likes: number;
  bookmarks: number;
  views: number;
}

type EvaluatedTweetData = TweetData & { meetsCriteria: boolean };

function extractEngagementMetrics(tweet: HTMLElement): EngagementMetrics {
  const defaultMetrics: EngagementMetrics = { replies: 0, reposts: 0, likes: 0, bookmarks: 0, views: 0 };
  
  // Find the engagement group div with aria-label containing all metrics
  // Format: "9 replies, 7 reposts, 117 likes, 17 bookmarks, 2825 views"
  const engagementGroup = tweet.querySelector('[role="group"][aria-label*="likes"]');
  if (!engagementGroup) return defaultMetrics;
  
  const ariaLabel = engagementGroup.getAttribute('aria-label') || '';
  
  const repliesMatch = ariaLabel.match(/(\d+)\s*repl(?:y|ies)/i);
  const repostsMatch = ariaLabel.match(/(\d+)\s*repost/i);
  const likesMatch = ariaLabel.match(/(\d+)\s*like/i);
  const bookmarksMatch = ariaLabel.match(/(\d+)\s*bookmark/i);
  const viewsMatch = ariaLabel.match(/(\d+)\s*view/i);
  
  return {
    replies: repliesMatch?.[1] ? parseInt(repliesMatch[1]) : 0,
    reposts: repostsMatch?.[1] ? parseInt(repostsMatch[1]) : 0,
    likes: likesMatch?.[1] ? parseInt(likesMatch[1]) : 0,
    bookmarks: bookmarksMatch?.[1] ? parseInt(bookmarksMatch[1]) : 0,
    views: viewsMatch?.[1] ? parseInt(viewsMatch[1]) : 0
  };
}

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
    const engagement = extractEngagementMetrics(tweet);
    
    return { tweet, diffHours, diffMinutes, id, originalId, engagement };
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
  
  const engagementType = config.engagementType;
  const engagementValue = data.engagement[engagementType];
  const threshold = config.engagementThresholds[engagementType];
  
  // Skip very new posts with minimal engagement
  if (data.diffMinutes <= 5 && engagementValue <= 5) {
    return false;
  }
  
  const minutesAlive = Math.max(data.diffMinutes, 1 / 60);
  const engagementPerMinute = engagementValue / minutesAlive;
  const thresholdPerMinute = threshold / 60;
  
  if (engagementPerMinute < thresholdPerMinute) {
    return false;
  }
  
  return true;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
