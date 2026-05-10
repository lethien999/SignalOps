import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  private transporter: any;

  constructor() {
    // For now, using mock transporter (no-op in development)
    // In production, configure with SendGrid/SMTP
    this.transporter = {
      sendMail: async (options: any) => {
        console.log('[EMAIL]', options.to, options.subject);
        return { messageId: `mock-${Date.now()}` };
      },
    };
  }

  async sendPasswordResetEmail(
    email: string,
    resetLink: string,
    userName?: string,
  ): Promise<void> {
    const subject = 'Đặt lại mật khẩu SignalOps';
    const html = `
      <h1>Đặt lại mật khẩu</h1>
      <p>Xin chào${userName ? ` ${userName}` : ''},</p>
      <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu của bạn. Bấm vào link bên dưới để tạo mật khẩu mới:</p>
      <p>
        <a href="${resetLink}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">
          Đặt lại mật khẩu
        </a>
      </p>
      <p>Link này có hiệu lực trong 24 giờ.</p>
      <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
      <p>Trân trọng,<br/>Đội ngũ SignalOps</p>
    `;

    await this.transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@signalops.dev',
      to: email,
      subject,
      html,
    });
  }

  async sendPasswordResetSuccessEmail(email: string): Promise<void> {
    const subject = 'Mật khẩu đã được đặt lại thành công';
    const html = `
      <h1>Mật khẩu đã được đặt lại</h1>
      <p>Mật khẩu của bạn đã được đặt lại thành công. Bạn có thể đăng nhập bằng mật khẩu mới.</p>
      <p>Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ với đội hỗ trợ.</p>
      <p>Trân trọng,<br/>Đội ngũ SignalOps</p>
    `;

    await this.transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@signalops.dev',
      to: email,
      subject,
      html,
    });
  }
}
