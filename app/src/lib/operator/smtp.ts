import net from 'node:net';
import tls from 'node:tls';

// Minimal, dependency-free SMTP client (STARTTLS on 587/25, implicit TLS on 465)
// + AUTH LOGIN. Ported from the send path in tools/smtp_send.py. nodemailer is
// NOT a dependency of this app and this environment has no outbound network to
// add it, so we speak SMTP directly over node:net/node:tls. This module is
// server-only and requires the Node.js runtime (route sets runtime='nodejs').
//
// Reuses one authenticated connection for a whole capped batch, exactly like the
// Python sender, so a 5–10 message batch is one login + N transactions.

type Reply = { code: number; raw: string };

function makeReader(sock: net.Socket) {
  let buf = '';
  const pending: ((r: Reply) => void)[] = [];
  const ready: Reply[] = [];
  const pump = () => {
    // One complete SMTP reply = zero+ continuation lines (\d{3}-...) then a final
    // line (\d{3}<space>...), each CRLF-terminated.
    for (;;) {
      const m = buf.match(/^(?:\d{3}-[^\r\n]*\r?\n)*\d{3} [^\r\n]*\r?\n/);
      if (!m) break;
      const raw = m[0];
      buf = buf.slice(raw.length);
      const code = parseInt(raw.match(/(\d{3}) [^\r\n]*\r?\n$/)?.[1] ?? '0', 10);
      const reply = { code, raw };
      const next = pending.shift();
      if (next) next(reply);
      else ready.push(reply);
    }
  };
  sock.on('data', (d) => {
    buf += d.toString('utf8');
    pump();
  });
  return {
    read(): Promise<Reply> {
      const r = ready.shift();
      if (r) return Promise.resolve(r);
      return new Promise((resolve) => pending.push(resolve));
    },
  };
}

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
};

export class SmtpClient {
  private sock!: net.Socket;
  private reader!: ReturnType<typeof makeReader>;

  private constructor() {}

  static async connect(cfg: SmtpConfig): Promise<SmtpClient> {
    const c = new SmtpClient();
    const secure = cfg.port === 465;
    const sock: net.Socket = secure
      ? tls.connect({ host: cfg.host, port: cfg.port, servername: cfg.host })
      : net.connect({ host: cfg.host, port: cfg.port });
    sock.setTimeout(30000);
    await new Promise<void>((resolve, reject) => {
      sock.once(secure ? 'secureConnect' : 'connect', () => resolve());
      sock.once('error', reject);
      sock.once('timeout', () => reject(new Error('SMTP connect timeout')));
    });
    c.sock = sock;
    c.reader = makeReader(sock);

    await c.expect([220]); // greeting
    await c.cmd(`EHLO zingaapp.com`, [250]);

    if (!secure) {
      await c.cmd('STARTTLS', [220]);
      const upgraded = tls.connect({ socket: c.sock, servername: cfg.host });
      await new Promise<void>((resolve, reject) => {
        upgraded.once('secureConnect', () => resolve());
        upgraded.once('error', reject);
      });
      c.sock = upgraded;
      c.reader = makeReader(upgraded);
      await c.cmd(`EHLO zingaapp.com`, [250]);
    }

    await c.cmd('AUTH LOGIN', [334]);
    await c.cmd(Buffer.from(cfg.user).toString('base64'), [334]);
    await c.cmd(Buffer.from(cfg.password).toString('base64'), [235]);
    return c;
  }

  private write(line: string) {
    this.sock.write(line + '\r\n');
  }

  private async expect(codes: number[]): Promise<Reply> {
    const r = await this.reader.read();
    if (!codes.includes(r.code)) {
      throw new Error(`SMTP unexpected reply ${r.code}: ${r.raw.trim()}`);
    }
    return r;
  }

  private async cmd(line: string, codes: number[]): Promise<Reply> {
    this.write(line);
    return this.expect(codes);
  }

  // Send one already-built RFC822 message. Returns nothing on success, throws on
  // any SMTP-level rejection (caller records the failure per-recipient).
  async sendMessage(from: string, to: string, message: string): Promise<void> {
    await this.cmd(`MAIL FROM:<${from}>`, [250]);
    await this.cmd(`RCPT TO:<${to}>`, [250, 251]);
    await this.cmd('DATA', [354]);
    // Dot-stuff any line that begins with '.' per RFC 5321, then terminate.
    const body = message.replace(/\r?\n/g, '\r\n').replace(/\r\n\./g, '\r\n..');
    this.sock.write(body + '\r\n.\r\n');
    await this.expect([250]);
  }

  async quit(): Promise<void> {
    try {
      await this.cmd('QUIT', [221]);
    } catch {
      /* ignore */
    }
    this.sock.destroy();
  }
}

// ── Outreach message (voice + copy ported from tools/smtp_send.py) ───────────
const IOS = 'https://apps.apple.com/us/app/zinga-app/id6740720049';
const ANDROID = 'https://play.google.com/store/apps/details?id=com.zinga.app';

function signatures(sender: string): { text: string; html: string } {
  if (sender.includes('bara@')) {
    return {
      text: 'Best,\n\nBara Ahmad\nCo-Founder & CEO, Zinga App\nbara@zingaapp.com · zingaapp.com',
      html: 'Best,<br><br><b>Bara Ahmad</b><br>Co-Founder &amp; CEO, Zinga App<br>bara@zingaapp.com · zingaapp.com',
    };
  }
  return {
    text: 'Best regards,\nThe Zinga Team\nCustomer Support\ninfo@zingaapp.com · zingaapp.com',
    html: 'Best regards,<br>The Zinga Team<br>Customer Support<br>info@zingaapp.com · zingaapp.com',
  };
}

function bodyText(sig: string, footer: string): string {
  return `Hey,

Saw your business online and wanted to reach out.

We built Zinga App, a booking platform for independent service pros to take
bookings off Instagram DMs. The idea is simple: your storefront on
Zinga shows your services, prices, and availability. Clients can book and pay
directly through the app, and funds are deposited straight to your bank account.

We're currently offering new providers a free 60-day trial.

Would you be open to a quick 10-minute conversation to see how it could work for
your business specifically?

You can also download Zinga today on iOS (${IOS}) or Android (${ANDROID}).

${sig}
${footer}`;
}

function bodyHtml(sigHtml: string, footer: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.5">
<p>Hey,</p>
<p>Saw your business online and wanted to reach out.</p>
<p>We built <b>Zinga App</b>, a booking platform for independent service pros to take bookings off Instagram DMs. The idea is simple: your storefront on Zinga shows your services, prices, and availability. Clients can book and pay directly through the app, and funds are deposited straight to your bank account.</p>
<p>We're currently offering new providers a <b>free 60-day trial</b>.</p>
<p>Would you be open to a quick 10-minute conversation to see how it could work for your business specifically?</p>
<p>You can also download Zinga today on <a href="${IOS}">iOS</a> or <a href="${ANDROID}">Android</a>.</p>
<p>${sigHtml}</p>
<p style="color:#888;font-size:12px">${footer}</p>
</div>`;
}

// Build a multipart/alternative RFC822 message. Includes the CAN-SPAM footer with
// the physical mailing address (CAN_SPAM_ADDRESS) + an unsubscribe instruction.
export function buildOutreachMessage(opts: {
  from: string;
  to: string;
  subject: string;
  canSpamAddress: string;
}): string {
  const { from, to, subject, canSpamAddress } = opts;
  const sig = signatures(from);
  const footer = `Reply "unsubscribe" if not relevant. Zinga · ${canSpamAddress}`;
  const boundary = `=_zinga_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  const date = new Date().toUTCString();
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${date}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].join('\r\n');
  const parts = [
    `--${boundary}`,
    `Content-Type: text/plain; charset="utf-8"`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    bodyText(sig.text, footer),
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="utf-8"`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    bodyHtml(sig.html, footer),
    ``,
    `--${boundary}--`,
    ``,
  ].join('\r\n');
  return `${headers}\r\n\r\n${parts}`;
}
