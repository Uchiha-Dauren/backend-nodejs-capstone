process.env.DOTENV_CONFIG_QUIET ||= 'true';
require('dotenv').config();
const express = require('express');
const natural = require('natural');
const logger = require('./logger');
const expressPino = require('express-pino-logger')({ logger });

const app = express();
const port = Number(process.env.PORT || 5000);
const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');
const tokenizer = new natural.WordTokenizer();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use(expressPino);
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'sentiment' }));

// A local lexicon-based model: no remote API key or external inference request.
app.post('/sentiment', (req, res) => {
  const { sentence } = req.body || {};
  if (typeof sentence !== 'string' || !sentence.trim()) {
    return res.status(400).json({ error: 'A non-empty sentence is required' });
  }
  if (sentence.length > 10000) {
    return res.status(400).json({ error: 'The sentence must be 10,000 characters or fewer' });
  }
  try {
    const words = tokenizer.tokenize(sentence.toLowerCase());
    const analysisResult = words.length ? analyzer.getSentiment(words) : 0;
    const sentiment = analysisResult > 0 ? 'positive' : analysisResult < 0 ? 'negative' : 'neutral';
    logger.info({ sentimentScore: analysisResult, sentiment }, 'Sentiment analyzed');
    return res.status(200).json({ sentimentScore: analysisResult, sentiment });
  } catch (error) {
    logger.error({ err: error }, 'Error performing sentiment analysis');
    return res.status(500).json({ message: 'Error performing sentiment analysis' });
  }
});
app.use((error, _req, res, _next) => {
  const status = error.status === 413 ? 413 : error.type === 'entity.parse.failed' ? 400 : 500;
  res.status(status).json({ error: status === 413 ? 'Request body is too large' : status === 400 ? 'Invalid JSON' : 'Unable to process request' });
});
if (require.main === module) {
  const server = app.listen(port, () => logger.info({ port }, 'Sentiment service started'));
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}
module.exports = app;
