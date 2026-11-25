import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, { Request, Response } from 'express';
import { join } from 'node:path';
import {
  PASSTHROUGH_RESPONSE_HEADERS,
  SSR_PROXY_TIMEOUT_MS,
  buildSafeProxyTargetUrl,
  createProxyAbortSignal,
  extractSafeRequestHeadersToForward,
  extractSetCookieHeadersFromUpstream,
  resolveAllowedHosts,
  resolveConfiguredBackendOrigin,
  resolveTrustProxyHeaders,
} from './app/core/security/ssr-proxy-security';

const browserDistFolder = join(import.meta.dirname, '../browser');
const configuredBackendUrl = resolveConfiguredBackendOrigin(process.env['BACKEND_URL']);

const app = express();

// Trust first reverse proxy hop (Render edge proxy) for accurate IP and protocol detection
app.set('trust proxy', 1);

const angularApp = new AngularNodeAppEngine({
  allowedHosts: resolveAllowedHosts(process.env['ALLOWED_HOSTS']),
  trustProxyHeaders: resolveTrustProxyHeaders(
    process.env['NG_TRUST_PROXY_HEADERS'] || process.env['TRUST_PROXY_HEADERS'],
  ),
});

/**
 * Same-origin reverse proxy for /backend-api/* to preserve first-party HttpOnly SameSite=Lax cookies.
 * Strictly pinned to the environment-configured BACKEND_URL.
 */
app.use('/backend-api', express.raw({ type: '*/*', limit: '2mb' }), async (req: Request, res: Response) => {
  const targetUrl = buildSafeProxyTargetUrl(req.url || '/', configuredBackendUrl);
  if (!targetUrl) {
    res.status(400).json({ error: 'Invalid proxy target path.' });
    return;
  }

  const clientIpRaw = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const clientIp = typeof clientIpRaw === 'string' ? clientIpRaw : undefined;
  const forwardedHeaders = extractSafeRequestHeadersToForward(req.headers, clientIp);

  const method = (req.method || 'GET').toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD' && Buffer.isBuffer(req.body) && req.body.length > 0;

  try {
    const upstreamResponse = await fetch(targetUrl.toString(), {
      method,
      headers: forwardedHeaders,
      body: hasBody ? new Uint8Array(req.body as Buffer) : undefined,
      redirect: 'manual',
      signal: createProxyAbortSignal(SSR_PROXY_TIMEOUT_MS),
    });

    res.status(upstreamResponse.status);

    const setCookies = extractSetCookieHeadersFromUpstream(upstreamResponse.headers);
    if (setCookies.length > 0) {
      res.setHeader('Set-Cookie', setCookies);
    }

    for (const hName of PASSTHROUGH_RESPONSE_HEADERS) {
      const hVal = upstreamResponse.headers.get(hName);
      if (hVal) {
        res.setHeader(hName, hVal);
      }
    }

    const responseBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
    res.send(responseBuffer);
  } catch (proxyError: unknown) {
    const errorMessage = proxyError instanceof Error ? proxyError.message : String(proxyError);
    const isAbort =
      proxyError instanceof Error &&
      (proxyError.name === 'AbortError' || proxyError.name === 'TimeoutError');
    const safeErrorType = isAbort ? 'TIMEOUT' : 'NETWORK_ERROR';

    console.error(
      `[SSR Proxy Error] Type: ${safeErrorType} | Method: ${method} | Path: ${req.baseUrl}${req.path} | TargetOrigin: ${configuredBackendUrl.origin} | Detail: ${errorMessage}`
    );

    res.status(502).json({ error: 'Error de comunicación con el servidor backend.' });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
