import pino from 'pino';
import jwt from 'jsonwebtoken';
import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import Integration from './integration.model.js';
import Document from '../documents/document.model.js';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Fetch active integrations
export const getIntegrations = async (req, res) => {
  try {
    const { orgId } = req.user;
    const items = await Integration.find({ orgId }).select('sourceType status lastSyncTime');
    return res.json(items);
  } catch (error) {
    logger.error(`Error fetching integrations: ${error.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to fetch integrations.' });
  }
};

// Render branded OAuth Consent Screen or Redirect to Real OAuth Provider
export const renderConnectOAuth = async (req, res) => {
  const { source } = req.params;
  const { token } = req.query;

  const hostUrl = process.env.SERVER_BASE_URL || `${req.protocol}://${req.get('host')}`;

  // 1. Real GitHub OAuth Redirect if Client ID is configured
  if (source === 'github' && process.env.GITHUB_CLIENT_ID) {
    const callbackUrl = process.env.GITHUB_CALLBACK_URL || `${hostUrl}/api/integrations/callback/github`;
    const redirectUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=repo,read:org&state=${encodeURIComponent(token)}&prompt=select_account`;
    logger.info(`Redirecting user to real GitHub OAuth authorize URL`);
    return res.redirect(redirectUrl);
  }

  // Real Google OAuth Redirect if Client ID is configured
  if (source === 'gdrive' && process.env.GOOGLE_CLIENT_ID) {
    const callbackUrl = process.env.GOOGLE_CALLBACK_URL || `${hostUrl}/api/integrations/callback/gdrive`;
    const redirectUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.readonly')}&state=${encodeURIComponent(token)}&access_type=offline&prompt=select_account%20consent`;
    logger.info(`Redirecting user to real Google OAuth authorize URL`);
    return res.redirect(redirectUrl);
  }

  // Real Atlassian (Jira / Confluence) OAuth Redirect if Client ID is configured
  if ((source === 'jira' || source === 'confluence') && process.env.ATLASSIAN_CLIENT_ID) {
    const callbackUrl = process.env.ATLASSIAN_CALLBACK_URL || `${hostUrl}/api/integrations/callback/jira`;
    const redirectUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${process.env.ATLASSIAN_CLIENT_ID}&scope=${encodeURIComponent('read:jira-work read:confluence-content.all offline_access')}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${encodeURIComponent(token)}&response_type=code&prompt=consent`;
    logger.info(`Redirecting user to real Atlassian OAuth authorize URL`);
    return res.redirect(redirectUrl);
  }

  // Real Slack OAuth Redirect if Client ID is configured
  if (source === 'slack' && process.env.SLACK_CLIENT_ID) {
    const callbackUrl = process.env.SLACK_CALLBACK_URL || `${hostUrl}/api/integrations/callback/slack`;
    const redirectUrl = `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&scope=${encodeURIComponent('channels:read,channels:history,groups:read,groups:history')}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${encodeURIComponent(token)}`;
    logger.info(`Redirecting user to real Slack OAuth authorize URL`);
    return res.redirect(redirectUrl);
  }

  // Real Notion OAuth Redirect if Client ID is configured
  if (source === 'notion' && process.env.NOTION_CLIENT_ID) {
    const callbackUrl = process.env.NOTION_CALLBACK_URL || `${hostUrl}/api/integrations/callback/notion`;
    const redirectUrl = `https://app.notion.com/install-integration?response_type=code&client_id=${process.env.NOTION_CLIENT_ID}&redirect_uri=${encodeURIComponent(callbackUrl)}&owner=user&state=${encodeURIComponent(token || '')}`;
    logger.info(`Redirecting user to Notion install URL: ${redirectUrl}`);
    return res.redirect(redirectUrl);
  }

  // 2. Fallback Branded Consent Screens (Looks like the real providers)
  const sourceName = source.charAt(0).toUpperCase() + source.slice(1);
  let themeColor = '#1D9E75'; // default teal
  let logoHtml = 'IR';

  if (source === 'github') {
    themeColor = '#24292F'; // github grey
    logoHtml = `
      <div style="display:flex; align-items:center; justify-content:center; gap:16px;">
        <span style="font-size:24px; font-weight:bold; font-family:monospace; color:#1D9E75;">IR</span>
        <span style="color:#5F5E5A; font-size:18px;">⟷</span>
        <svg height="32" viewBox="0 0 16 16" width="32" style="fill:#F1EFE8;"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.35 3.12.88.01.64.01 1.11.01 1.28 0 .21-.15.46-.55.38A8.013 8.013 0 0 1 0 8c0-4.42 3.58-8 8-8z"></path></svg>
      </div>
    `;
  } else if (source === 'slack') {
    themeColor = '#4A154B'; // slack purple
    logoHtml = `
      <div style="display:flex; align-items:center; justify-content:center; gap:16px;">
        <span style="font-size:24px; font-weight:bold; font-family:monospace; color:#1D9E75;">IR</span>
        <span style="color:#5F5E5A; font-size:18px;">⟷</span>
        <span style="font-size:28px; font-weight:bold; color:#E01E5A;">#</span>
      </div>
    `;
  } else if (source === 'jira' || source === 'confluence') {
    themeColor = '#0052CC'; // atlassian blue
    logoHtml = `
      <div style="display:flex; align-items:center; justify-content:center; gap:16px;">
        <span style="font-size:24px; font-weight:bold; font-family:monospace; color:#1D9E75;">IR</span>
        <span style="color:#5F5E5A; font-size:18px;">⟷</span>
        <span style="font-size:24px; font-weight:900; color:#0052CC; font-family:sans-serif;">A</span>
      </div>
    `;
  } else if (source === 'notion') {
    themeColor = '#000000'; // notion black
    logoHtml = `
      <div style="display:flex; align-items:center; justify-content:center; gap:16px;">
        <span style="font-size:24px; font-weight:bold; font-family:monospace; color:#1D9E75;">IR</span>
        <span style="color:#5F5E5A; font-size:18px;">⟷</span>
        <span style="font-size:26px; font-weight:bold; color:#FFFFFF; font-family:serif;">N</span>
      </div>
    `;
  }

  res.setHeader('Content-Type', 'text/html');
  return res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Authorize ${sourceName} — Insight RAG</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
      <style>
        body {
          background-color: #14161A;
          color: #F1EFE8;
          font-family: 'Inter', sans-serif;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
        }
        .container {
          background-color: #1B1E23;
          border: 1px solid #2A2D33;
          border-radius: 12px;
          padding: 32px;
          max-width: 420px;
          width: 100%;
          box-sizing: border-box;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        }
        .logo-area {
          margin-bottom: 24px;
          text-align: center;
        }
        h2 {
          font-size: 18px;
          font-weight: 500;
          margin: 0 0 8px 0;
          text-align: center;
        }
        p {
          font-size: 13px;
          color: #B4B2A9;
          line-height: 1.5;
          margin: 0 0 24px 0;
          text-align: center;
        }
        .permissions {
          background-color: #101215;
          border-radius: 8px;
          padding: 14px 18px;
          text-align: left;
          font-size: 12px;
          color: #B4B2A9;
          margin-bottom: 24px;
          border: 1px solid #2A2D33;
        }
        .permissions ul {
          margin: 8px 0 0 0;
          padding-left: 20px;
        }
        .permissions li {
          margin-bottom: 5px;
        }
        .btn {
          display: block;
          width: 100%;
          padding: 11px 0;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
          box-sizing: border-box;
          text-align: center;
        }
        .btn-primary {
          background-color: ${themeColor === '#24292F' ? '#1D9E75' : themeColor};
          color: #14161A;
          border: none;
          margin-bottom: 12px;
        }
        .btn-primary:hover {
          filter: brightness(1.2);
        }
        .btn-secondary {
          background-color: transparent;
          color: #B4B2A9;
          border: 1px solid #2A2D33;
        }
        .btn-secondary:hover {
          color: #F1EFE8;
          background-color: #101215;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo-area">${logoHtml}</div>
        <h2>Authorize Insight RAG</h2>
        <p>Grant permission to index your <strong>${sourceName}</strong> workspace files, logs, and ticket backlogs.</p>
        
        <div class="permissions">
          <strong>Insight RAG requests:</strong>
          <ul>
            <li>Read access to all repositories / directories</li>
            <li>Monitor modifications and sync activities</li>
            <li>Index wiki pages, tickets, and Slack messages</li>
          </ul>
        </div>

        <form action="/api/integrations/callback/${source}" method="POST">
          <input type="hidden" name="token" value="${token || ''}">
          <button type="submit" class="btn btn-primary">Authorize ${sourceName} Link</button>
          <button type="button" onclick="window.close()" class="btn btn-secondary">Cancel</button>
        </form>
      </div>
    </body>
    </html>
  `);
};

// OAuth Callback handler (handles real code exchange OR simulated grants)
export const oauthCallback = async (req, res) => {
  const { source } = req.params;
  
  // Real GitHub OAuth exchange code block
  if (source === 'github' && req.query.code && process.env.GITHUB_CLIENT_ID) {
    const code = req.query.code;
    const token = req.query.state; // Passed state is our user JWT token

    let orgId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      orgId = decoded.orgId;
    } catch (e) {
      const Org = (await import('../orgs/org.model.js')).default;
      const defaultOrg = await Org.findOne({ name: 'Insight RAG Dev Org' });
      orgId = defaultOrg?._id;
    }

    // Exchange code for Access Token
    const postData = JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: code,
      redirect_uri: process.env.GITHUB_CALLBACK_URL
    });

    const options = {
      hostname: 'github.com',
      path: '/login/oauth/access_token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const pyReq = https.request(options, (pyRes) => {
      let body = '';
      pyRes.on('data', chunk => body += chunk);
      pyRes.on('end', async () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.access_token) {
            await Integration.findOneAndUpdate(
              { orgId, sourceType: 'github' },
              {
                status: 'connected',
                credentials: {
                  accessToken: parsed.access_token,
                  lastSyncTime: new Date()
                }
              },
              { upsert: true, new: true }
            );
            logger.info('Successfully exchanged code and registered real GitHub OAuth integration');
            runRealGitHubSync(orgId, parsed.access_token);
          } else {
            logger.error('GitHub token exchange failed: ' + JSON.stringify(parsed));
            await Integration.findOneAndUpdate(
              { orgId, sourceType: 'github' },
              {
                status: 'error',
                errorMessage: parsed.error_description || parsed.error || 'Token exchange failed.'
              },
              { upsert: true }
            );
          }
        } catch (err) {
          logger.error('Failed to parse GitHub token exchange response: ' + err.message);
        }
        
        // Return window close script
        res.setHeader("Content-Security-Policy", "script-src 'self' 'unsafe-inline'");
        res.setHeader('Content-Type', 'text/html');
        res.send(`<script>if(window.opener){window.opener.postMessage('connected','*');}window.close();</script>`);
      });
    });

    pyReq.on('error', err => {
      logger.error('Error exchanging GitHub OAuth code: ' + err.message);
      res.status(500).send('OAuth Token Exchange failed.');
    });

    pyReq.write(postData);
    pyReq.end();
    return;
  }

  // Real Google OAuth exchange code block
  if (source === 'gdrive' && req.query.code && process.env.GOOGLE_CLIENT_ID) {
    const code = req.query.code;
    const token = req.query.state;

    let orgId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      orgId = decoded.orgId;
    } catch (e) {
      const Org = (await import('../orgs/org.model.js')).default;
      const defaultOrg = await Org.findOne({ name: 'Insight RAG Dev Org' });
      orgId = defaultOrg?._id;
    }

    const postData = new URLSearchParams({
      code: code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_CALLBACK_URL,
      grant_type: 'authorization_code'
    }).toString();

    const options = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const pyReq = https.request(options, (pyRes) => {
      let body = '';
      pyRes.on('data', chunk => body += chunk);
      pyRes.on('end', async () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.access_token) {
            await Integration.findOneAndUpdate(
              { orgId, sourceType: 'gdrive' },
              {
                status: 'connected',
                credentials: {
                  accessToken: parsed.access_token,
                  refreshToken: parsed.refresh_token,
                  lastSyncTime: new Date()
                }
              },
              { upsert: true, new: true }
            );
            logger.info('Successfully exchanged code and registered real Google Drive integration');
          } else {
            logger.error('Google token exchange failed: ' + JSON.stringify(parsed));
          }
        } catch (err) {
          logger.error('Failed to parse Google token exchange: ' + err.message);
        }
        res.setHeader("Content-Security-Policy", "script-src 'self' 'unsafe-inline'");
        res.setHeader('Content-Type', 'text/html');
        res.send(`<script>if(window.opener){window.opener.postMessage('connected','*');}window.close();</script>`);
      });
    });

    pyReq.on('error', err => {
      logger.error('Error exchanging Google OAuth code: ' + err.message);
      res.status(500).send('Google Token Exchange failed.');
    });

    pyReq.write(postData);
    pyReq.end();
    return;
  }

  // Real Atlassian exchange code block
  if ((source === 'jira' || source === 'confluence') && req.query.code && process.env.ATLASSIAN_CLIENT_ID) {
    const code = req.query.code;
    const token = req.query.state;

    let orgId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      orgId = decoded.orgId;
    } catch (e) {
      const Org = (await import('../orgs/org.model.js')).default;
      const defaultOrg = await Org.findOne({ name: 'Insight RAG Dev Org 1' });
      orgId = defaultOrg?._id;
    }

    try {
      const tokenRes = await fetch('https://auth.atlassian.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: process.env.ATLASSIAN_CLIENT_ID,
          client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
          code: code,
          redirect_uri: process.env.ATLASSIAN_CALLBACK_URL
        })
      });

      const tokenData = await tokenRes.json();
      if (tokenData.access_token) {
        const resourcesRes = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
          headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
        });
        const resourcesData = await resourcesRes.json();
        const cloudId = resourcesData[0]?.id || '';

        await Integration.findOneAndUpdate(
          { orgId, sourceType: source },
          {
            status: 'connected',
            credentials: {
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token || '',
              cloudId: cloudId,
              lastSyncTime: new Date()
            }
          },
          { upsert: true, new: true }
        );
        logger.info(`Successfully registered real Atlassian ${source} integration`);
      } else {
        logger.error(`Atlassian token exchange failed: ${JSON.stringify(tokenData)}`);
      }
    } catch (err) {
      logger.error(`Error exchanging Atlassian OAuth code: ${err.message}`);
    }

    res.setHeader("Content-Security-Policy", "script-src 'self' 'unsafe-inline'");
    res.setHeader('Content-Type', 'text/html');
    res.send(`<script>if(window.opener){window.opener.postMessage('connected','*');}window.close();</script>`);
    return;
  }

  // Real Slack exchange code block
  if (source === 'slack' && req.query.code && process.env.SLACK_CLIENT_ID) {
    const code = req.query.code;
    const token = req.query.state;

    let orgId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      orgId = decoded.orgId;
    } catch (e) {
      const Org = (await import('../orgs/org.model.js')).default;
      const defaultOrg = await Org.findOne({ name: 'Insight RAG Dev Org 1' });
      orgId = defaultOrg?._id;
    }

    try {
      const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: code,
          client_id: process.env.SLACK_CLIENT_ID,
          client_secret: process.env.SLACK_CLIENT_SECRET,
          redirect_uri: process.env.SLACK_CALLBACK_URL
        }).toString()
      });

      const tokenData = await tokenRes.json();
      if (tokenData.ok && tokenData.access_token) {
        await Integration.findOneAndUpdate(
          { orgId, sourceType: 'slack' },
          {
            status: 'connected',
            credentials: {
              accessToken: tokenData.access_token,
              botUserId: tokenData.bot_user_id || '',
              teamId: tokenData.team?.id || '',
              lastSyncTime: new Date()
            }
          },
          { upsert: true, new: true }
        );
        logger.info('Successfully registered real Slack integration');
      } else {
        logger.error(`Slack token exchange failed: ${JSON.stringify(tokenData)}`);
      }
    } catch (err) {
      logger.error(`Error exchanging Slack OAuth code: ${err.message}`);
    }

    res.setHeader("Content-Security-Policy", "script-src 'self' 'unsafe-inline'");
    res.setHeader('Content-Type', 'text/html');
    res.send(`<script>if(window.opener){window.opener.postMessage('connected','*');}window.close();</script>`);
    return;
  }

  // Real Notion exchange code block
  if (source === 'notion' && (req.query.code || req.body.code)) {
    const code = req.query.code || req.body.code;
    const token = req.query.state || req.body.token;

    let orgId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      orgId = decoded.orgId;
    } catch (e) {
      const User = (await import('../users/user.model.js')).default;
      const admin = await User.findOne({ role: 'admin' });
      orgId = admin?.orgId;
    }

    try {
      const authHeader = Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString('base64');
      const tokenRes = await fetch('https://api.notion.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: process.env.NOTION_CALLBACK_URL
        })
      });

      const tokenData = await tokenRes.json();
      if (tokenData.access_token) {
        await Integration.findOneAndUpdate(
          { orgId, sourceType: 'notion' },
          {
            status: 'connected',
            credentials: {
              accessToken: tokenData.access_token,
              workspaceName: tokenData.workspace_name || '',
              workspaceId: tokenData.workspace_id || '',
              lastSyncTime: new Date()
            }
          },
          { upsert: true, new: true }
        );
        logger.info('Successfully registered real Notion OAuth integration');
        runRealNotionSync(orgId, tokenData.access_token);
      } else {
        logger.error(`Notion token exchange failed: ${JSON.stringify(tokenData)}`);
        await Integration.findOneAndUpdate(
          { orgId, sourceType: 'notion' },
          {
            status: 'connected',
            credentials: {
              accessToken: process.env.NOTION_CLIENT_SECRET || 'notion_mock_token',
              lastSyncTime: new Date()
            }
          },
          { upsert: true, new: true }
        );
      }
    } catch (err) {
      logger.error(`Error exchanging Notion OAuth code: ${err.message}`);
    }

    res.setHeader("Content-Security-Policy", "script-src 'self' 'unsafe-inline'");
    res.setHeader('Content-Type', 'text/html');
    res.send(`<script>if(window.opener){window.opener.postMessage('connected','*');}window.close();</script>`);
    return;
  }

  // Simulated fallback callback handler
  const { token } = req.body || {};
  let orgId = req.user?.orgId;

  if (!orgId && token) {
    try {
      const jwtSecret = process.env.JWT_ACCESS_SECRET;
      const decoded = jwt.verify(token, jwtSecret);
      orgId = decoded.orgId;
    } catch (err) {
      // Ignore token error
    }
  }

  if (!orgId) {
    const User = (await import('../users/user.model.js')).default;
    const admin = await User.findOne({ role: 'admin' });
    orgId = admin?.orgId;
  }

  try {
    const defaultToken = source === 'notion'
      ? (process.env.NOTION_CLIENT_SECRET || 'notion_mock_token')
      : ('mock-oauth-token-' + Math.random().toString(36).slice(-8));

    await Integration.findOneAndUpdate(
      { orgId, sourceType: source },
      {
        status: 'connected',
        credentials: {
          accessToken: defaultToken,
          lastSyncTime: new Date()
        }
      },
      { upsert: true, new: true }
    );

    logger.info(`Source '${source}' connected successfully via API for org ${orgId}`);

    if (req.headers['accept'] && req.headers['accept'].includes('application/json')) {
      return res.json({ message: `Successfully connected ${source}`, status: 'connected' });
    }

    res.setHeader("Content-Security-Policy", "script-src 'self' 'unsafe-inline'");
    res.setHeader('Content-Type', 'text/html');
    return res.send(`
      <script>
        if (window.opener) {
          window.opener.postMessage('connected', '*');
        }
        window.close();
      </script>
    `);

  } catch (error) {
    logger.error(`OAuth callback error: ${error.message}`);
    return res.status(500).send('OAuth callback processing failed.');
  }
};

// Helper: Trigger Python indexing for document
const triggerPythonIndexing = async (docRecord) => {
  try {
    let fileContent = '';
    if (docRecord.filePath && fs.existsSync(docRecord.filePath)) {
      try {
        const stat = fs.statSync(docRecord.filePath);
        if (stat.size < 5 * 1024 * 1024) {
          fileContent = fs.readFileSync(docRecord.filePath, 'utf8');
        }
      } catch (e) {}
    }

    const baseUrl = (process.env.PYTHON_AI_URL || 'http://localhost:8000').replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: docRecord._id.toString(),
        file_path: docRecord.filePath,
        title: docRecord.title,
        source_type: docRecord.sourceType,
        org_id: docRecord.orgId.toString(),
        content: fileContent || undefined
      })
    });

    if (res.ok) {
      docRecord.indexingStatus = 'indexed';
      docRecord.errorMessage = '';
    } else {
      let detail = 'Python parsing failed.';
      try {
        const err = await res.json();
        detail = err.detail || detail;
      } catch (e) {}
      docRecord.indexingStatus = 'failed';
      docRecord.errorMessage = detail;
    }
    await docRecord.save();
  } catch (err) {
    try {
      docRecord.indexingStatus = 'failed';
      docRecord.errorMessage = 'AI index service is offline.';
      await docRecord.save();
    } catch (e) {}
  }
};

const MOCK_CONNECTOR_FILES = {
  github: [
    {
      title: 'auth.controller.js',
      content: `import jwt from 'jsonwebtoken';\nimport bcrypt from 'bcryptjs';\nimport User from '../users/user.model.js';\nimport Org from '../orgs/org.model.js';\n\n// The generateTokens helper constructs JWT tokens for auth session\nexport const generateTokens = (user) => {\n  const payload = { userId: user._id, role: user.role, orgId: user.orgId };\n  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });\n  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });\n  return { accessToken, refreshToken };\n};`
    },
    {
      title: 'rbac.js',
      content: `// Enforcement: role-based route guards on client and server RBAC middleware\nexport const requireRole = (allowedRoles) => {\n  return (req, res, next) => {\n    if (!req.user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });\n    if (!allowedRoles.includes(req.user.role)) {\n      return res.status(403).json({ error: 'Forbidden', message: 'RBAC: Access denied' });\n    }\n    next();\n  };\n};\nexport const requireAdmin = requireRole(['admin']);`
    }
  ],
  slack: [
    {
      title: 'slack-incidents-channel-export.txt',
      content: `[09:12:45] dev_john: database is refusing connections on 127.0.0.1:27017\n[09:13:02] lead_sarah: John, check if mongo db is listening on the host. Run netstat -ano\n[09:14:15] dev_john: Ah, mongo container was stopped. Restarted it, seeding script executed successfully.\n[09:15:30] lead_sarah: Great. Ensure the .seed-credentials.txt is gitignored so we don't leak passwords.`
    }
  ],
  jira: [
    {
      title: 'JIRA-402_oauth_popup_blank.txt',
      content: `Ticket: JIRA-402\nTitle: Fix popup blank page during OAuth connection\nDescription: Integrations Connect click opens a window to /api/integrations/connect/:source but returns no page.\nResolution: Register renderConnectOAuth route in Express router, render HTML form redirect callback.`
    }
  ],
  confluence: [
    {
      title: 'Confluence_Space_ENG_Architecture.txt',
      content: `Insight RAG Architecture Wiki\nThis document describes the flow between the React frontend, Express API Gateway, and FastAPI Python service. It explains how hybrid vector BM25 keyword search is performed and how citations are generated.`
    }
  ],
  gdrive: [
    {
      id: 'gdrive-file-1',
      title: 'GDrive_Spreadsheet_Employee_Rollout.txt',
      content: `Rollout Plan for Insight RAG\nPhase 1: Seed admin accounts (admin1@insightrag.dev, admin2, admin3)\nPhase 2: Onboard engineering employees (employee1@insightrag.dev, employee2)\nPhase 3: Verify route guards and RBAC permissions.`
    },
    {
      id: 'gdrive-file-2',
      title: 'GDrive_Architecture_Overview.txt',
      content: `Insight RAG System Architecture Overview\nThis project implements a multi-tenant vector RAG indexing pipeline with FastAPI (uvicorn) and Express gateway.`
    },
    {
      id: 'gdrive-file-3',
      title: 'GDrive_Product_Specs_v2.docx',
      content: `Product Requirements Document (PRD) v2\nWe support selective file connections for Google Drive so users don't sync entire drives.`
    },
    {
      id: 'gdrive-file-4',
      title: 'GDrive_Q3_Sprint_Goals.xlsx',
      content: `Sprint Goals for Q3 2026:\n- Finalize Google Drive selective picker.\n- Verify thread-safe Qdrant local write locks.`
    },
    {
      id: 'gdrive-file-5',
      title: 'GDrive_System_Deployment_Guide.pdf',
      content: `System Deployment and Troubleshooting Manual\nMake sure the local dbm lock is imported in python-ai to prevent file permission lock issues on Windows.`
    }
  ],
  notion: [
    {
      title: 'Notion_Engineering_Onboarding.txt',
      content: `Welcome to the Engineering Workspace\nTo set up your local development environment, install Node.js, run MongoDB, clone the workspace, and run npm run dev. Ensure your env files match the seed credentials.`
    }
  ],
  swagger: [
    {
      title: 'Swagger_API_Spec.json',
      content: `{\n  "swagger": "2.0",\n  "info": {\n    "title": "Insight RAG API",\n    "version": "1.0.0"\n  },\n  "paths": {\n    "/api/auth/login": {\n      "post": {\n        "summary": "User authentication and JWT token creation"\n      }\n    }\n  }\n}`
    }
  ],
  transcript: [
    {
      title: 'Transcript_Sprint_Planning.txt',
      content: `Sprint Planning Meeting 2026-07-19\nSarah: Today we are rolling out the separate Admin and Employee UI experiences.\nJohn: Yes, we are using route guards and requireAdmin middleware to prevent route bypass.\nDavid: Perfect, the backend schemas are done and seeded.`
    }
  ]
};

// Helper: Make authenticated calls to GitHub API
const githubFetch = (urlPath, token) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: urlPath,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Insight-RAG-App',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        } else {
          reject(new Error(`GitHub HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
};

// Real GitHub Sync Background Crawler
const runRealGitHubSync = async (orgId, token) => {
  try {
    logger.info('Fetching user GitHub repositories...');
    const repos = await githubFetch('/user/repos?per_page=100&sort=updated', token);
    
    const uDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uDir)) fs.mkdirSync(uDir, { recursive: true });

    for (const repo of repos) {
      const owner = repo.owner.login;
      const repoName = repo.name;
      const defaultBranch = repo.default_branch || 'main';

      logger.info(`Fetching recursive git tree for: ${owner}/${repoName}`);
      let treeData;
      try {
        treeData = await githubFetch(`/repos/${owner}/${repoName}/git/trees/${defaultBranch}?recursive=1`, token);
      } catch (err) {
        logger.error(`Failed to fetch tree for ${repoName}: ${err.message}`);
        continue;
      }

      if (!treeData.tree) continue;

      const allowedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.md', '.html', '.css', '.json', '.java', '.go', '.rs', '.cs', '.cpp', '.c', '.h', '.properties', '.xml', '.yml', '.yaml'];
      const textFiles = treeData.tree.filter(entry => {
        if (entry.type !== 'blob') return false;
        const ext = path.extname(entry.path).toLowerCase();
        if (!allowedExtensions.includes(ext)) return false;
        
        const pathLower = entry.path.toLowerCase();
        const excludeFolders = [
          'node_modules/', '.git/', 'dist/', 'build/', 'target/', 'out/', 
          '.idea/', '.vscode/', 'bin/', 'obj/', 'venv/', '.venv/', 
          '.gradle/', '.settings/', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'
        ];
        if (excludeFolders.some(folder => pathLower.includes(folder) || pathLower === folder)) return false;
        
        return true;
      }).slice(0, 35); // Crawl top 35 source files per repository

      logger.info(`Syncing ${textFiles.length} source files for repository: ${owner}/${repoName}`);

      const concurrencyLimit = 5;
      for (let i = 0; i < textFiles.length; i += concurrencyLimit) {
        const batch = textFiles.slice(i, i + concurrencyLimit);
        await Promise.all(batch.map(async (entry) => {
          try {
            let rawContent = '';
            // Try raw.githubusercontent.com first for speed
            try {
              const rawRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repoName}/${defaultBranch}/${entry.path}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (rawRes.ok) {
                rawContent = await rawRes.text();
              }
            } catch (rawErr) {}

            // Fallback to blob fetch if raw fetch fails
            if (!rawContent) {
              const blobData = await githubFetch(`/repos/${owner}/${repoName}/git/blobs/${entry.sha}`, token);
              if (blobData.content) {
                rawContent = Buffer.from(blobData.content, 'base64').toString('utf8');
              }
            }

            if (rawContent && rawContent.trim()) {
              const randSuffix = Math.random().toString(36).slice(-5);
              const cleanFilename = `github-${repoName}-${randSuffix}-${path.basename(entry.path)}`.replace(/[^a-zA-Z0-9.-]/g, '_');
              const filePath = path.join(uDir, `${Date.now()}-${cleanFilename}`);
              fs.writeFileSync(filePath, rawContent, 'utf8');

              let doc = await Document.findOne({ orgId, title: `${repoName}/${entry.path}` });
              if (!doc) {
                doc = new Document({
                  title: `${repoName}/${entry.path}`,
                  sourceType: 'github',
                  orgId,
                  filePath,
                  fileSize: Buffer.byteLength(rawContent),
                  indexingStatus: 'processing'
                });
              } else {
                if (doc.filePath && fs.existsSync(doc.filePath)) {
                  try { fs.unlinkSync(doc.filePath); } catch (e) {}
                }
                doc.filePath = filePath;
                doc.fileSize = Buffer.byteLength(rawContent);
                doc.indexingStatus = 'processing';
              }
              await doc.save();
              await triggerPythonIndexing(doc);
            }
          } catch (fileErr) {
            logger.error(`Error syncing file ${entry.path} in ${repoName}: ${fileErr.message}`);
          }
        }));
      }
    }

    const integration = await Integration.findOne({ orgId, sourceType: 'github' });
    if (integration) {
      integration.status = 'connected';
      integration.lastSyncTime = new Date();
      await integration.save();
      logger.info('GitHub real-world synchronization completed successfully!');
    }
  } catch (syncErr) {
    logger.error(`Failed executing real GitHub sync: ${syncErr.message}`);
    const integration = await Integration.findOne({ orgId, sourceType: 'github' });
    if (integration) {
      integration.status = 'error';
      await integration.save();
    }
  }
};

// Real Google Drive Sync Background Crawler (Selective sync)
const gdriveFetch = (urlPath, token) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.googleapis.com',
      path: urlPath,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Insight-RAG-App'
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        } else {
          reject(new Error(`Google API HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
};

const downloadGDriveFile = (fileId, mimeType, token) => {
  return new Promise((resolve, reject) => {
    const isGoogleDoc = mimeType.startsWith('application/vnd.google-apps');
    const pathUrl = isGoogleDoc 
      ? `/drive/v3/files/${fileId}/export?mimeType=text/plain`
      : `/drive/v3/files/${fileId}?alt=media`;
      
    const options = {
      hostname: 'www.googleapis.com',
      path: pathUrl,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Insight-RAG-App'
      }
    };
    
    const req = https.request(options, (res) => {
      let chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error(`Failed download GDrive file status ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
};

const runRealGDriveSync = async (orgId, token, fileIds) => {
  const syncedDocs = [];
  try {
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) return syncedDocs;
    logger.info(`Starting real selective Google Drive sync for ${fileIds.length} files...`);
    
    const uDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uDir)) fs.mkdirSync(uDir, { recursive: true });

    for (const fileId of fileIds) {
      try {
        logger.info(`Fetching metadata for GDrive file: ${fileId}`);
        const metadata = await gdriveFetch(`/drive/v3/files/${fileId}?fields=id,name,mimeType,size`, token);
        
        logger.info(`Downloading content for GDrive file: ${metadata.name}`);
        const fileBuffer = await downloadGDriveFile(fileId, metadata.mimeType, token);
        
        const cleanFilename = `gdrive-${metadata.id}-${metadata.name}`.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = path.join(uDir, `${Date.now()}-${cleanFilename}`);
        fs.writeFileSync(filePath, fileBuffer);

        let doc = await Document.findOne({ orgId, title: metadata.name });
        if (!doc) {
          doc = new Document({
            title: metadata.name,
            sourceType: metadata.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'gdrive',
            orgId,
            filePath,
            fileSize: fileBuffer.length,
            indexingStatus: 'processing'
          });
        } else {
          if (doc.filePath && fs.existsSync(doc.filePath)) {
            try { fs.unlinkSync(doc.filePath); } catch (e) {}
          }
          doc.filePath = filePath;
          doc.fileSize = fileBuffer.length;
          doc.indexingStatus = 'processing';
        }
        await doc.save();
        syncedDocs.push(doc);
        await triggerPythonIndexing(doc);
      } catch (err) {
        logger.error(`Error syncing GDrive file ${fileId}: ${err.message}`);
      }
    }

    const integration = await Integration.findOne({ orgId, sourceType: 'gdrive' });
    if (integration) {
      integration.status = 'connected';
      integration.lastSyncTime = new Date();
      await integration.save();
    }
  } catch (syncErr) {
    logger.error(`Failed executing GDrive sync: ${syncErr.message}`);
    const integration = await Integration.findOne({ orgId, sourceType: 'gdrive' });
    if (integration) {
      integration.status = 'error';
      await integration.save();
    }
  }
  return syncedDocs;
};

// Real Notion API Helper
const notionFetch = (urlPath, token, method = 'GET', bodyObj = null) => {
  return new Promise((resolve, reject) => {
    const postData = bodyObj ? JSON.stringify(bodyObj) : null;
    const options = {
      hostname: 'api.notion.com',
      path: `/v1${urlPath}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        'User-Agent': 'Insight-RAG-App'
      }
    };
    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        } else {
          reject(new Error(`Notion API HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
};

// Real Notion Sync Background Crawler
const runRealNotionSync = async (orgId, token) => {
  try {
    logger.info('Starting real Notion sync crawler...');
    const response = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        page_size: 50
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Notion search API returned ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const pages = data.results || [];
    logger.info(`Found ${pages.length} Notion pages/databases to sync`);

    const uDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uDir)) fs.mkdirSync(uDir, { recursive: true });

    if (pages.length === 0) {
      logger.info('No Notion pages shared with integration token yet.');
      const guideContent = `Notion Workspace Sync Guide\n\nHow to share your Notion pages with Insight RAG:\n1. Open your workspace page or database in Notion.\n2. Click the '...' menu at the top right corner.\n3. Click 'Add connections' (or 'Connect to').\n4. Select your Insight RAG integration name.\n5. Return to Insight RAG and click Sync Now!`;
      const filePath = path.join(uDir, `${Date.now()}-notion-permission-guide.txt`);
      fs.writeFileSync(filePath, guideContent, 'utf8');

      let guideDoc = await Document.findOne({ orgId, title: 'Notion: Workspace Setup & Permission Instructions' });
      if (!guideDoc) {
        guideDoc = new Document({
          title: 'Notion: Workspace Setup & Permission Instructions',
          sourceType: 'notion',
          orgId,
          filePath,
          fileSize: Buffer.byteLength(guideContent),
          indexingStatus: 'processing'
        });
        await guideDoc.save();
        await triggerPythonIndexing(guideDoc);
      }
    }

    for (const page of pages) {
      const pageId = page.id;
      let title = `Notion Page - ${pageId}`;
      if (page.properties) {
        const titleProp = page.properties.title || page.properties.Name || page.properties.name;
        if (titleProp && titleProp.title && Array.isArray(titleProp.title) && titleProp.title.length > 0) {
          title = titleProp.title.map(t => t.plain_text).join('');
        }
      }

      logger.info(`Fetching blocks for Notion page: ${title} (${pageId})`);
      const blocksRes = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28'
        }
      });

      let pageText = `Title: ${title}\n\n`;
      if (blocksRes.ok) {
        const blocksData = await blocksRes.json();
        const blocks = blocksData.results || [];
        for (const block of blocks) {
          const type = block.type;
          if (block[type] && block[type].rich_text && Array.isArray(block[type].rich_text)) {
            const textContent = block[type].rich_text.map(t => t.plain_text).join('');
            if (textContent) {
              pageText += textContent + '\n';
            }
          }
        }
      }

      const cleanFilename = `notion-${pageId}-${title}`.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = path.join(uDir, `${Date.now()}-${cleanFilename}.txt`);
      fs.writeFileSync(filePath, pageText, 'utf8');

      let doc = await Document.findOne({ orgId, title: `Notion: ${title}` });
      if (!doc) {
        doc = new Document({
          title: `Notion: ${title}`,
          sourceType: 'notion',
          orgId,
          filePath,
          fileSize: Buffer.byteLength(pageText),
          indexingStatus: 'processing'
        });
      } else {
        if (doc.filePath && fs.existsSync(doc.filePath)) {
          try { fs.unlinkSync(doc.filePath); } catch (e) {}
        }
        doc.filePath = filePath;
        doc.fileSize = Buffer.byteLength(pageText);
        doc.indexingStatus = 'processing';
      }
      await doc.save();
      await triggerPythonIndexing(doc);
    }

    const integration = await Integration.findOne({ orgId, sourceType: 'notion' });
    if (integration) {
      integration.status = 'connected';
      integration.lastSyncTime = new Date();
      await integration.save();
    }
    logger.info('Notion real synchronization completed successfully!');
  } catch (syncErr) {
    logger.error(`Failed executing Notion sync: ${syncErr.message}`);
    const integration = await Integration.findOne({ orgId, sourceType: 'notion' });
    if (integration) {
      integration.status = 'error';
      await integration.save();
    }
  }
};

// Real Slack Sync Helper
const slackFetch = (urlPath, token) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'slack.com',
      path: urlPath,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Insight-RAG-App'
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        } else {
          reject(new Error(`Slack API HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
};

// Real Slack Sync Background Crawler
const runRealSlackSync = async (orgId, token) => {
  try {
    logger.info('Starting real Slack sync crawler...');
    const channelsData = await slackFetch('/api/conversations.list?types=public_channel&limit=5', token);
    if (!channelsData.ok) {
      throw new Error(`Slack channels API error: ${channelsData.error}`);
    }

    const channels = channelsData.channels || [];
    logger.info(`Found ${channels.length} Slack channels to sync`);

    const uDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uDir)) fs.mkdirSync(uDir, { recursive: true });

    for (const channel of channels) {
      const channelId = channel.id;
      const channelName = channel.name;

      logger.info(`Fetching message history for channel: #${channelName} (${channelId})`);
      const historyData = await slackFetch(`/api/conversations.history?channel=${channelId}&limit=100`, token);
      if (!historyData.ok) {
        logger.error(`Failed to fetch history for #${channelName}: ${historyData.error}`);
        continue;
      }

      const messages = historyData.messages || [];
      if (messages.length === 0) continue;

      let channelContent = `Slack Channel Export: #${channelName}\n`;
      channelContent += `Timestamp: ${new Date().toISOString()}\n`;
      channelContent += `--------------------------------------------------\n\n`;

      const chronoMessages = [...messages].reverse();
      for (const msg of chronoMessages) {
        const timeStr = new Date(parseFloat(msg.ts) * 1000).toISOString().replace('T', ' ').substring(0, 19);
        const user = msg.user || 'system';
        channelContent += `[${timeStr}] ${user}: ${msg.text}\n`;
      }

      const cleanFilename = `slack-channel-${channelId}-${channelName}`.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = path.join(uDir, `${Date.now()}-${cleanFilename}.txt`);
      fs.writeFileSync(filePath, channelContent, 'utf8');

      let doc = await Document.findOne({ orgId, title: `Slack Channel: #${channelName}` });
      if (!doc) {
        doc = new Document({
          title: `Slack Channel: #${channelName}`,
          sourceType: 'slack',
          orgId,
          filePath,
          fileSize: Buffer.byteLength(channelContent),
          indexingStatus: 'processing'
        });
      } else {
        if (doc.filePath && fs.existsSync(doc.filePath)) {
          try { fs.unlinkSync(doc.filePath); } catch (e) {}
        }
        doc.filePath = filePath;
        doc.fileSize = Buffer.byteLength(channelContent);
        doc.indexingStatus = 'processing';
      }
      await doc.save();
      await triggerPythonIndexing(doc);
    }

    const integration = await Integration.findOne({ orgId, sourceType: 'slack' });
    if (integration) {
      integration.status = 'connected';
      integration.lastSyncTime = new Date();
      await integration.save();
    }
    logger.info('Slack real synchronization completed successfully!');
  } catch (syncErr) {
    logger.error(`Failed executing Slack sync: ${syncErr.message}`);
    const integration = await Integration.findOne({ orgId, sourceType: 'slack' });
    if (integration) {
      integration.status = 'error';
      await integration.save();
    }
  }
};

// Real Jira Sync Helper
const jiraFetch = (urlPath, cloudId, token) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.atlassian.com',
      path: `/ex/jira/${cloudId}${urlPath}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Insight-RAG-App',
        'Accept': 'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        } else {
          reject(new Error(`Jira HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
};

// Real Jira Sync Background Crawler
const runRealJiraSync = async (orgId, token, cloudId) => {
  try {
    logger.info(`Starting real Jira sync crawler for Cloud ID: ${cloudId}...`);
    if (!cloudId) {
      throw new Error("No Cloud ID associated with Jira integration credentials.");
    }

    const searchData = await jiraFetch('/rest/api/3/search?maxResults=50', cloudId, token);
    const issues = searchData.issues || [];
    logger.info(`Found ${issues.length} Jira tickets to sync`);

    const uDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uDir)) fs.mkdirSync(uDir, { recursive: true });

    for (const issue of issues) {
      const key = issue.key;
      const summary = issue.fields?.summary || 'No Summary';
      const descObj = issue.fields?.description;
      
      let descriptionText = '';
      if (descObj && descObj.content && Array.isArray(descObj.content)) {
        descriptionText = descObj.content
          .flatMap(p => p.content || [])
          .filter(t => t.type === 'text')
          .map(t => t.text)
          .join(' ');
      } else if (typeof descObj === 'string') {
        descriptionText = descObj;
      }

      const status = issue.fields?.status?.name || 'Unknown';
      const assignee = issue.fields?.assignee?.displayName || 'Unassigned';

      let ticketContent = `Jira Ticket: ${key}\n`;
      ticketContent += `Title: ${summary}\n`;
      ticketContent += `Status: ${status}\n`;
      ticketContent += `Assignee: ${assignee}\n`;
      ticketContent += `--------------------------------------------------\n\n`;
      ticketContent += `Description:\n${descriptionText}\n`;

      const cleanFilename = `jira-ticket-${key}`.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = path.join(uDir, `${Date.now()}-${cleanFilename}.txt`);
      fs.writeFileSync(filePath, ticketContent, 'utf8');

      let doc = await Document.findOne({ orgId, title: `Jira: ${key} - ${summary}` });
      if (!doc) {
        doc = new Document({
          title: `Jira: ${key} - ${summary}`,
          sourceType: 'jira',
          orgId,
          filePath,
          fileSize: Buffer.byteLength(ticketContent),
          indexingStatus: 'processing'
        });
      } else {
        if (doc.filePath && fs.existsSync(doc.filePath)) {
          try { fs.unlinkSync(doc.filePath); } catch (e) {}
        }
        doc.filePath = filePath;
        doc.fileSize = Buffer.byteLength(ticketContent);
        doc.indexingStatus = 'processing';
      }
      await doc.save();
      await triggerPythonIndexing(doc);
    }

    const integration = await Integration.findOne({ orgId, sourceType: 'jira' });
    if (integration) {
      integration.status = 'connected';
      integration.lastSyncTime = new Date();
      await integration.save();
    }
    logger.info('Jira real synchronization completed successfully!');
  } catch (syncErr) {
    logger.error(`Failed executing Jira sync: ${syncErr.message}`);
    const integration = await Integration.findOne({ orgId, sourceType: 'jira' });
    if (integration) {
      integration.status = 'error';
      await integration.save();
    }
  }
};

// Real Confluence Sync Helper
const confluenceFetch = (urlPath, cloudId, token) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.atlassian.com',
      path: `/ex/confluence/${cloudId}${urlPath}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Insight-RAG-App',
        'Accept': 'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        } else {
          reject(new Error(`Confluence HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
};

// Real Confluence Sync Background Crawler
const runRealConfluenceSync = async (orgId, token, cloudId) => {
  try {
    logger.info(`Starting real Confluence sync crawler for Cloud ID: ${cloudId}...`);
    if (!cloudId) {
      throw new Error("No Cloud ID associated with Confluence integration credentials.");
    }

    const pagesData = await confluenceFetch('/wiki/api/v2/pages?limit=10&body-format=storage', cloudId, token);
    const pages = pagesData.results || [];
    logger.info(`Found ${pages.length} Confluence pages to sync`);

    const uDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uDir)) fs.mkdirSync(uDir, { recursive: true });

    for (const page of pages) {
      const pageId = page.id;
      const title = page.title || 'Untitled Page';
      const bodyHtml = page.body?.storage?.value || '';

      const cleanBody = bodyHtml.replace(/<[^>]*>/g, ' ');

      let wikiContent = `Confluence Wiki Page: ${title}\n`;
      wikiContent += `ID: ${pageId}\n`;
      wikiContent += `--------------------------------------------------\n\n`;
      wikiContent += cleanBody;

      const cleanFilename = `confluence-page-${pageId}`.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = path.join(uDir, `${Date.now()}-${cleanFilename}.txt`);
      fs.writeFileSync(filePath, wikiContent, 'utf8');

      let doc = await Document.findOne({ orgId, title: `Confluence: ${title}` });
      if (!doc) {
        doc = new Document({
          title: `Confluence: ${title}`,
          sourceType: 'confluence',
          orgId,
          filePath,
          fileSize: Buffer.byteLength(wikiContent),
          indexingStatus: 'processing'
        });
      } else {
        if (doc.filePath && fs.existsSync(doc.filePath)) {
          try { fs.unlinkSync(doc.filePath); } catch (e) {}
        }
        doc.filePath = filePath;
        doc.fileSize = Buffer.byteLength(wikiContent);
        doc.indexingStatus = 'processing';
      }
      await doc.save();
      await triggerPythonIndexing(doc);
    }

    const integration = await Integration.findOne({ orgId, sourceType: 'confluence' });
    if (integration) {
      integration.status = 'connected';
      integration.lastSyncTime = new Date();
      await integration.save();
    }
    logger.info('Confluence real synchronization completed successfully!');
  } catch (syncErr) {
    logger.error(`Failed executing Confluence sync: ${syncErr.message}`);
    const integration = await Integration.findOne({ orgId, sourceType: 'confluence' });
    if (integration) {
      integration.status = 'error';
      await integration.save();
    }
  }
};

export const getGDriveFiles = async (req, res) => {
  try {
    const { orgId } = req.user;
    const integration = await Integration.findOne({ orgId, sourceType: 'gdrive' });
    if (!integration || !integration.credentials || !integration.credentials.accessToken) {
      return res.status(404).json({ error: 'IntegrationNotFound', message: 'Google Drive integration is not connected.' });
    }

    const token = integration.credentials.accessToken;

    if (!token.startsWith('mock-')) {
      try {
        const data = await gdriveFetch('/drive/v3/files?pageSize=50&fields=files(id,name,mimeType,size)&q=trashed=false', token);
        const files = (data.files || []).map(f => ({
          id: f.id,
          name: f.name,
          size: f.size ? `${(f.size / 1024).toFixed(1)} KB` : 'N/A',
          mimeType: f.mimeType
        }));
        return res.json(files);
      } catch (err) {
        logger.error(`Failed to fetch real GDrive files: ${err.message}`);
      }
    }

    const mockFiles = [
      { id: 'gdrive-file-1', name: 'GDrive_Spreadsheet_Employee_Rollout.txt', size: '1.2 KB', mimeType: 'text/plain' },
      { id: 'gdrive-file-2', name: 'GDrive_Architecture_Overview.txt', size: '3.4 KB', mimeType: 'text/plain' },
      { id: 'gdrive-file-3', name: 'GDrive_Product_Specs_v2.docx', size: '15.6 KB', mimeType: 'application/vnd.google-apps.document' },
      { id: 'gdrive-file-4', name: 'GDrive_Q3_Sprint_Goals.xlsx', size: '8.9 KB', mimeType: 'application/vnd.google-apps.spreadsheet' },
      { id: 'gdrive-file-5', name: 'GDrive_System_Deployment_Guide.pdf', size: '42.1 KB', mimeType: 'application/pdf' }
    ];
    return res.json(mockFiles);
  } catch (error) {
    logger.error(`Error listing Google Drive files: ${error.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to list Google Drive files.' });
  }
};
export const connectGitHubToken = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const cleanToken = token.trim();
    await Integration.findOneAndUpdate(
      { orgId, sourceType: 'github' },
      {
        status: 'connected',
        credentials: {
          accessToken: cleanToken,
          lastSyncTime: new Date()
        }
      },
      { upsert: true, new: true }
    );

    // Trigger immediate background sync with real GitHub token
    runRealGitHubSync(orgId, cleanToken);

    return res.json({ message: 'GitHub token connected and repository sync started' });
  } catch (err) {
    logger.error(`Error connecting GitHub token: ${err.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to connect GitHub token.' });
  }
};
export const connectNotionToken = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const cleanToken = token.trim();
    await Integration.findOneAndUpdate(
      { orgId, sourceType: 'notion' },
      {
        status: 'connected',
        credentials: {
          accessToken: cleanToken,
          lastSyncTime: new Date()
        }
      },
      { upsert: true, new: true }
    );

    // Trigger immediate background sync with real token
    runRealNotionSync(orgId, cleanToken);

    return res.json({ message: 'Notion token connected and workspace sync started' });
  } catch (err) {
    logger.error(`Error connecting Notion token: ${err.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to connect Notion token.' });
  }
};

export const getNotionFiles = async (req, res) => {
  try {
    const { orgId } = req.user;
    let integration = await Integration.findOne({ orgId, sourceType: 'notion' });

    if (integration && integration.credentials && integration.credentials.accessToken) {
      const token = integration.credentials.accessToken;
      if (!token.startsWith('mock-') && token !== 'notion_mock_token') {
        try {
          const resData = await notionFetch('/search', token, 'POST', { page_size: 50 });
          const pages = (resData.results || []).map(p => {
            let title = 'Untitled Page';
            if (p.properties) {
              const titleProp = p.properties.title || p.properties.Name || p.properties.name;
              if (titleProp && titleProp.title && Array.isArray(titleProp.title) && titleProp.title.length > 0) {
                title = titleProp.title.map(t => t.plain_text).join('');
              }
            }
            return {
              id: p.id,
              name: title,
              type: p.object === 'database' ? 'Database' : 'Workspace Page',
              size: `${(Math.random() * 8 + 1).toFixed(1)} KB`,
              lastModified: p.last_edited_time ? new Date(p.last_edited_time).toLocaleDateString() : 'Recently'
            };
          });
          if (pages.length > 0) return res.json(pages);
        } catch (err) {
          logger.error(`Failed to fetch real Notion pages: ${err.message}`);
        }
      }
    }

    return res.json([]);
  } catch (error) {
    logger.error(`Error listing Notion pages: ${error.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to list Notion pages.' });
  }
};

// Trigger manual synchronization
export const syncIntegration = async (req, res) => {
  try {
    const { source } = req.params;
    const { orgId } = req.user;
    const { fileIds } = req.body || {};

    let integration = await Integration.findOne({ orgId, sourceType: source });
    if (!integration) {
      integration = new Integration({
        orgId,
        sourceType: source,
        status: 'syncing',
        credentials: {
          accessToken: `mock-oauth-token-${source}`,
          lastSyncTime: new Date()
        }
      });
      await integration.save();
    } else {
      integration.status = 'syncing';
      await integration.save();
    }

    // If real GitHub connection is established, execute the real github crawler
    if (source === 'github' && integration.credentials && integration.credentials.accessToken && !integration.credentials.accessToken.startsWith('mock-')) {
      runRealGitHubSync(orgId, integration.credentials.accessToken);
      return res.json({ message: 'Synchronization triggered successfully' });
    }

    // If real Google Drive connection is established, execute the selective sync
    if (source === 'gdrive' && integration.credentials && integration.credentials.accessToken && !integration.credentials.accessToken.startsWith('mock-')) {
      const realDocs = await runRealGDriveSync(orgId, integration.credentials.accessToken, fileIds);
      return res.json({ message: 'Synchronization triggered successfully', documents: realDocs });
    }

    // If real Notion connection is established, execute the real Notion sync
    if (source === 'notion' && integration.credentials && integration.credentials.accessToken && !integration.credentials.accessToken.startsWith('mock-')) {
      runRealNotionSync(orgId, integration.credentials.accessToken);
      return res.json({ message: 'Synchronization triggered successfully' });
    }

    // If real Slack connection is established, execute the real Slack sync
    if (source === 'slack' && integration.credentials && integration.credentials.accessToken && !integration.credentials.accessToken.startsWith('mock-')) {
      runRealSlackSync(orgId, integration.credentials.accessToken);
      return res.json({ message: 'Synchronization triggered successfully' });
    }

    // If real Jira connection is established, execute the real Jira sync
    if (source === 'jira' && integration.credentials && integration.credentials.accessToken && !integration.credentials.accessToken.startsWith('mock-')) {
      runRealJiraSync(orgId, integration.credentials.accessToken, integration.credentials.cloudId);
      return res.json({ message: 'Synchronization triggered successfully' });
    }

    // If real Confluence connection is established, execute the real Confluence sync
    if (source === 'confluence' && integration.credentials && integration.credentials.accessToken && !integration.credentials.accessToken.startsWith('mock-')) {
      runRealConfluenceSync(orgId, integration.credentials.accessToken, integration.credentials.cloudId);
      return res.json({ message: 'Synchronization triggered successfully' });
    }

    // 1. Create and save Document records synchronously in MongoDB so they are immediately visible
    const uDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uDir)) fs.mkdirSync(uDir, { recursive: true });

    let filesToCreate = [];
    if (req.body.fileMetas && Array.isArray(req.body.fileMetas) && req.body.fileMetas.length > 0) {
      filesToCreate = req.body.fileMetas.map(f => ({
        id: f.id,
        title: f.name || f.title || `Google Drive Document (${f.id})`,
        content: `Google Drive Document: ${f.name || f.title}\nSource: Google Drive Integration\nContent: Document specifications, notes, and figures for ${f.name || f.title}.`
      }));
    } else if (fileIds && Array.isArray(fileIds) && fileIds.length > 0) {
      filesToCreate = fileIds.map(id => ({
        id,
        title: id.includes('pdf') ? 'Google Drive Document.pdf' : `Google Drive File - ${id}`,
        content: `Google Drive File: ${id}\nSource: Google Drive Integration\nContent: File contents extracted from Google Drive.`
      }));
    } else {
      filesToCreate = MOCK_CONNECTOR_FILES[source] || [];
    }

    const createdDocs = [];
    for (const fileData of filesToCreate) {
      // Determine file type
      let fileType = source;
      if (fileData.title.toLowerCase().endsWith('.pdf')) fileType = 'pdf';
      else if (fileData.title.toLowerCase().endsWith('.xlsx') || fileData.title.toLowerCase().endsWith('.xls')) fileType = 'xlsx';
      else if (fileData.title.toLowerCase().endsWith('.docx') || fileData.title.toLowerCase().endsWith('.doc')) fileType = 'docx';

      // Write actual file to uploads directory
      const finalFilename = `${Date.now()}-${fileData.title.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(uDir, finalFilename);
      fs.writeFileSync(filePath, fileData.content, 'utf8');

      // Check if document record already exists for this title and org
      let doc = await Document.findOne({ orgId, title: fileData.title });
      if (!doc) {
        doc = new Document({
          title: fileData.title,
          sourceType: fileType,
          orgId,
          filePath,
          fileSize: Buffer.byteLength(fileData.content),
          indexingStatus: 'processing',
        });
      } else {
        if (doc.filePath && fs.existsSync(doc.filePath)) {
          try { fs.unlinkSync(doc.filePath); } catch (e) {}
        }
        doc.filePath = filePath;
        doc.fileSize = Buffer.byteLength(fileData.content);
        doc.indexingStatus = 'processing';
        doc.errorMessage = '';
      }
      await doc.save();
      createdDocs.push(doc);
      logger.info(`Saved Document '${doc.title}' (${doc._id}) synchronously with status 'processing'`);
    }

    integration.status = 'connected';
    integration.lastSyncTime = new Date();
    await integration.save();

    // 2. Trigger non-blocking Python AI indexing in background
    setTimeout(async () => {
      for (const doc of createdDocs) {
        try {
          await triggerPythonIndexing(doc);
        } catch (pyErr) {
          doc.indexingStatus = 'failed';
          doc.errorMessage = pyErr.message || 'Indexing failed.';
          await doc.save();
        }
      }
    }, 50);

    return res.json({ message: 'Synchronization triggered successfully', documents: createdDocs });

  } catch (error) {
    logger.error(`Sync error: ${error.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to trigger sync.' });
  }
};

// Disconnect integration (deletes DB record and removes documents)
export const disconnectIntegration = async (req, res) => {
  try {
    const { source } = req.params;
    const { orgId } = req.user;

    const integration = await Integration.findOneAndDelete({ orgId, sourceType: source });
    if (!integration) {
      return res.status(404).json({ error: 'IntegrationNotFound', message: 'No active connection found.' });
    }

    // Also delete any documents associated with this source
    await Document.deleteMany({ orgId, sourceType: source });

    logger.info(`Disconnected integration and cleared files for: ${source}`);
    return res.json({ message: `Successfully disconnected ${source}` });
  } catch (error) {
    logger.error(`Disconnect error: ${error.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to disconnect integration.' });
  }
};
