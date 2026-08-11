import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  useColorScheme,
  TouchableOpacity,
  Image,
} from 'react-native';
import { NEWS_API_KEY, GROQ_API_KEY } from './config';

export default function App() {
  const colorScheme = useColorScheme();
  const [isManualDark, setIsManualDark] = useState(null);
  const isDark = isManualDark !== null ? isManualDark : colorScheme === 'dark';

  const theme = {
    bg: isDark ? '#121212' : '#f5f5f5',
    cardBg: isDark ? '#1e1e1e' : '#ffffff',
    headerBg: isDark ? '#1e1e1e' : '#ffffff',
    headerBorder: isDark ? '#333333' : '#e0e0e0',
    textPrimary: isDark ? '#ffffff' : '#212121',
    textSecondary: isDark ? '#aaaaaa' : '#757575',
    verificationBg: isDark ? '#2c2c2c' : '#f9f9f9',
    borderColor: isDark ? '#444444' : '#e0e0e0',
  };

  const styles = getStyles(theme);

  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchVerification = async (headline, snippet) => {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: 'You are a news authenticity checker. Return ONLY valid JSON with no markdown formatting: {"score": <0-100 integer>, "verdict": "verified" | "uncertain" | "suspicious", "reason": "<one short sentence>"}'
            },
            {
              role: 'user',
              content: `Headline: ${headline}\nSnippet: ${snippet || 'No snippet available'}`
            }
          ],
          temperature: 0,
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch from Groq: ${response.status}`);
      }

      const data = await response.json();
      let content = data.choices[0].message.content.trim();
      
      // Sometimes LLMs wrap JSON in markdown blocks even when told not to.
      if (content.startsWith('```json')) {
        content = content.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (content.startsWith('```')) {
        content = content.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      return JSON.parse(content);
    } catch (err) {
      console.warn('Verification error:', err);
      return { score: 0, verdict: 'uncertain', reason: 'Failed to verify due to API error.' };
    }
  };

  const loadNews = async () => {
    try {
      setErrorMsg(null);
      // Fetch news
      const newsResponse = await fetch(`https://newsapi.org/v2/everything?q=india&sortBy=publishedAt&pageSize=10`, {
        headers: {
          'X-Api-Key': NEWS_API_KEY
        }
      });
      
      if (!newsResponse.ok) {
        throw new Error('Failed to fetch news from NewsAPI');
      }

      const newsData = await newsResponse.json();
      const articles = newsData.articles || [];

      // Fetch verification sequentially to avoid Groq free-tier rate limits
      const verifiedArticles = [];
      for (let index = 0; index < articles.length; index++) {
        const article = articles[index];
        const verification = await fetchVerification(article.title, article.description);
        verifiedArticles.push({
          id: index.toString(),
          headline: article.title,
          source: article.source.name,
          description: article.description,
          thumbnail: article.urlToImage,
          ...verification,
        });
        
        // 500ms delay between requests to prevent HTTP 429 Too Many Requests
        if (index < articles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setNewsItems(verifiedArticles);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load news. Please try again later.');
    }
  };

  const fetchNews = async () => {
    setLoading(true);
    await loadNews();
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNews();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchNews();
  }, []);

  const getScoreColor = (score) => {
    if (score >= 70) return isDark ? '#81c784' : '#4caf50'; // Green
    if (score >= 40) return isDark ? '#ffb74d' : '#ff9800'; // Yellow
    return isDark ? '#e57373' : '#f44336'; // Red
  };

  const getVerdictBadgeStyle = (verdict) => {
    const safeVerdict = verdict ? verdict.toLowerCase() : 'uncertain';
    switch (safeVerdict) {
      case 'verified':
        return { backgroundColor: isDark ? '#1b5e20' : '#e8f5e9', color: isDark ? '#c8e6c9' : '#2e7d32', borderColor: isDark ? '#2e7d32' : '#a5d6a7' };
      case 'suspicious':
        return { backgroundColor: isDark ? '#b71c1c' : '#ffebee', color: isDark ? '#ffcdd2' : '#c62828', borderColor: isDark ? '#c62828' : '#ef9a9a' };
      default:
        return { backgroundColor: isDark ? '#f57f17' : '#fff8e1', color: isDark ? '#fff9c4' : '#f57f17', borderColor: isDark ? '#fbc02d' : '#ffe082' };
    }
  };

  const renderItem = ({ item }) => {
    const scoreColor = getScoreColor(item.score);
    const badgeStyle = getVerdictBadgeStyle(item.verdict);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.sourceText}>{item.source}</Text>
          <View style={[styles.verdictBadge, { backgroundColor: badgeStyle.backgroundColor, borderColor: badgeStyle.borderColor }]}>
            <Text style={[styles.verdictText, { color: badgeStyle.color }]}>{(item.verdict || 'UNCERTAIN').toUpperCase()}</Text>
          </View>
        </View>
        
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
        ) : null}

        <Text style={styles.headlineText}>{item.headline}</Text>
        
        <View style={styles.verificationSection}>
          <View style={styles.scoreContainer}>
            <Text style={[styles.scoreText, { color: scoreColor }]}>{item.score}</Text>
            <Text style={styles.scoreLabel}>Score</Text>
          </View>
          <View style={styles.reasonContainer}>
            <Text style={styles.reasonText}>{item.reason}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI News Verifier</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={fetchNews}
          >
            <Text style={styles.actionButtonText}>🔄</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => setIsManualDark(!isDark)}
          >
            <Text style={styles.actionButtonText}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2196f3" />
          <Text style={styles.loadingText}>Fetching & Verifying News...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : (
        <FlatList
          data={newsItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2196f3']} tintColor={isDark ? '#2196f3' : undefined} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  header: {
    padding: 16,
    backgroundColor: theme.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: theme.headerBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50, 
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: theme.verificationBg,
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 18,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: theme.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  thumbnail: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 12,
    resizeMode: 'cover',
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
    textTransform: 'uppercase',
  },
  verdictBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  verdictText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  headlineText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 16,
    lineHeight: 24,
  },
  verificationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.verificationBg,
    borderRadius: 8,
    padding: 12,
  },
  scoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: theme.borderColor,
  },
  scoreText: {
    fontSize: 28,
    fontWeight: '900',
  },
  scoreLabel: {
    fontSize: 10,
    color: theme.textSecondary,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  reasonContainer: {
    flex: 1,
    paddingLeft: 16,
  },
  reasonText: {
    fontSize: 14,
    color: theme.textPrimary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
