import nodemailer from 'nodemailer'
import { PrismaClient } from '@prisma/client'

export interface SmtpSettings {
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  fromName: string
  fromEmail: string
}

export class EmailService {
  constructor(private prisma: PrismaClient) {}

  async getSmtpSettings(tenantId: string): Promise<SmtpSettings | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    })

    if (!tenant) return null

    const settings = tenant.settings as any
    if (!settings?.smtp?.host || !settings?.smtp?.user) return null

    return settings.smtp as SmtpSettings
  }

  private createTransport(smtp: SmtpSettings) {
    return nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.user,
        pass: smtp.password,
      },
    })
  }

  async sendPasswordResetEmail(
    to: string,
    resetLink: string,
    tenantName: string,
    smtp: SmtpSettings
  ): Promise<void> {
    const transport = this.createTransport(smtp)

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="background-color:#21252d;padding:30px;text-align:center;">
                    <h1 style="color:#b8a378;margin:0;font-size:24px;">${tenantName}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px 30px;">
                    <h2 style="color:#333;margin:0 0 16px 0;font-size:20px;">Redefinir sua senha</h2>
                    <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
                      Recebemos uma solicitação para redefinir a senha da sua conta.
                      Clique no botão abaixo para criar uma nova senha.
                    </p>
                    <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px auto;">
                      <tr>
                        <td style="background-color:#b8a378;border-radius:6px;padding:14px 32px;">
                          <a href="${resetLink}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;">
                            Redefinir Senha
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="color:#999;font-size:12px;line-height:1.5;margin:0 0 8px 0;">
                      Se você não solicitou a redefinição de senha, ignore este email.
                      O link expira em 1 hora.
                    </p>
                    <p style="color:#999;font-size:12px;line-height:1.5;margin:0;">
                      Se o botão não funcionar, copie e cole este link no navegador:<br>
                      <a href="${resetLink}" style="color:#b8a378;word-break:break-all;">${resetLink}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#f9f9f9;padding:20px 30px;text-align:center;">
                    <p style="color:#999;font-size:11px;margin:0;">
                      Este email foi enviado por ${tenantName} via EnlevoHub.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `

    await transport.sendMail({
      from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
      to,
      subject: `Redefinir senha - ${tenantName}`,
      html,
    })
  }

  async sendTestEmail(
    to: string,
    tenantName: string,
    smtp: SmtpSettings
  ): Promise<void> {
    const transport = this.createTransport(smtp)

    // Verify connection first
    await transport.verify()

    await transport.sendMail({
      from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
      to,
      subject: `Email de teste - ${tenantName}`,
      html: `
        <div style="font-family:Arial,sans-serif;padding:20px;">
          <h2 style="color:#21252d;">Email de Teste</h2>
          <p style="color:#666;">
            Este é um email de teste do <strong>${tenantName}</strong>.
          </p>
          <p style="color:#666;">
            Se você está recebendo esta mensagem, a configuração SMTP está funcionando corretamente.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
          <p style="color:#999;font-size:12px;">Enviado via EnlevoHub</p>
        </div>
      `,
    })
  }
}
