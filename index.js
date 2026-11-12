const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('Missing ?url= parameter');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(
      targetUrl.startsWith('http://') || targetUrl.startsWith('https://')
        ? targetUrl
        : `https://${targetUrl}`
    );
  } catch {
    return res.status(400).send('Invalid URL provided');
  }

  try {
    const response = await axios.get(parsedUrl.href, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
      },
      validateStatus: () => true,
    });

    const contentType = response.headers['content-type'] || 'text/html';

    if (contentType.includes('text/html')) {
      const html = response.data.toString('utf-8');
      const $ = cheerio.load(html);

      const rewriteAttr = (selector, attr) => {
        $(selector).each((_, el) => {
          const val = $(el).attr(attr);
          if (!val || val.startsWith('data:') || val.startsWith('javascript:') || val.startsWith('#')) {
            return;
          }
          try {
            const resolved = new URL(val, parsedUrl.href).href;
            $(el).attr(attr, `/proxy?url=${encodeURIComponent(resolved)}`);
          } catch {}
        });
      };

      rewriteAttr('a[href]', 'href');
      rewriteAttr('link[href]', 'href');
      rewriteAttr('script[src]', 'src');
      rewriteAttr('img[src]', 'src');
      rewriteAttr('form[action]', 'action');

      res.set('Content-Type', 'text/html; charset=utf-8');
      return res.send($.html());
    }

    res.set('Content-Type', contentType);
    return res.send(response.data);
  } catch (err) {
    return res.status(502).send(`Proxy error: ${err.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
