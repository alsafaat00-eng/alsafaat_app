import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../common/decorators/auth.decorators';

const APP_SCHEME = (process.env.APP_DEEP_LINK_SCHEME ?? 'safat').replace(
  /:\/\/$/,
  '',
);
const ANDROID_PACKAGE = process.env.APP_ANDROID_PACKAGE ?? 'com.safat.app';

function buildDeepLink(path: string, query: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return `${APP_SCHEME}://${path}${qs ? `?${qs}` : ''}`;
}

function bridgeHtml(opts: {
  title: string;
  message: string;
  deepLink: string;
  intentLink: string;
}) {
  const { title, message, deepLink, intentLink } = opts;
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} · سرح</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0; min-height: 100vh; display: grid; place-items: center;
      font-family: system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif;
      background: linear-gradient(160deg, #0B2B21 0%, #163526 55%, #0A1F18 100%);
      color: #fff; padding: 24px;
    }
    .card {
      width: min(420px, 100%); background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12); border-radius: 20px;
      padding: 28px 22px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,.35);
    }
    .mark {
      width: 64px; height: 64px; margin: 0 auto 16px; border-radius: 16px;
      background: #284E39; display: grid; place-items: center; font-size: 28px;
    }
    h1 { font-size: 1.35rem; margin: 0 0 8px; }
    p { margin: 0 0 22px; color: rgba(255,255,255,.75); line-height: 1.6; font-size: .95rem; }
    a.btn {
      display: inline-block; text-decoration: none; background: #3CB371; color: #052015;
      font-weight: 800; padding: 14px 22px; border-radius: 999px; min-width: 200px;
    }
    .hint { margin-top: 18px; font-size: .8rem; color: rgba(255,255,255,.45); }
  </style>
</head>
<body>
  <div class="card">
    <div class="mark">س</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a class="btn" id="open" href="${deepLink}">فتح تطبيق سرح</a>
    <p class="hint">إذا لم يفتح التطبيق تلقائياً، اضغط الزر أعلاه.</p>
  </div>
  <script>
    (function () {
      var deep = ${JSON.stringify(deepLink)};
      var intent = ${JSON.stringify(intentLink)};
      var ua = navigator.userAgent || '';
      var isAndroid = /Android/i.test(ua);
      try {
        window.location.href = isAndroid ? intent : deep;
      } catch (e) {}
      setTimeout(function () {
        try { window.location.href = deep; } catch (e) {}
      }, 700);
    })();
  </script>
</body>
</html>`;
}

/**
 * NI hosted checkout redirects to HTTPS APP_URL (the API host).
 * These pages bridge the browser back into the mobile app via deep link.
 */
@Controller('payment')
export class PaymentRedirectController {
  @Public()
  @Get('result')
  @Header('Cache-Control', 'no-store')
  result(
    @Query('paymentId') paymentId: string | undefined,
    @Query('ref') ref: string | undefined,
    @Query('type') type: string | undefined,
    @Res() res: Response,
  ) {
    const deepLink = buildDeepLink('payment/result', {
      paymentId,
      ref,
      type,
    });
    const intentLink = `intent://payment/result?${new URLSearchParams({
      ...(paymentId ? { paymentId } : {}),
      ...(ref ? { ref } : {}),
      ...(type ? { type } : {}),
    }).toString()}#Intent;scheme=${APP_SCHEME};package=${ANDROID_PACKAGE};end`;

    res
      .status(200)
      .type('html')
      .send(
        bridgeHtml({
          title: 'اكتمل الدفع',
          message:
            'تمت معالجة الدفع. جارٍ إعادتك إلى تطبيق سرح لتأكيد الحالة.',
          deepLink,
          intentLink,
        }),
      );
  }

  @Public()
  @Get('cancel')
  @Header('Cache-Control', 'no-store')
  cancel(@Res() res: Response) {
    const deepLink = buildDeepLink('payment/cancel', {});
    const intentLink = `intent://payment/cancel#Intent;scheme=${APP_SCHEME};package=${ANDROID_PACKAGE};end`;

    res
      .status(200)
      .type('html')
      .send(
        bridgeHtml({
          title: 'تم إلغاء الدفع',
          message: 'لم تُخصم أي مبالغ. اضغط لفتح التطبيق والعودة.',
          deepLink,
          intentLink,
        }),
      );
  }
}
