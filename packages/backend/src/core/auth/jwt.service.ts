import { FastifyRequest } from 'fastify'

export interface JWTPayload {
  userId: string
  tenantId: string
  email: string
  role: 'ROOT' | 'MASTER' | 'ENGINEER' | 'ADMIN_STAFF' | 'CONTRACTOR' | 'VIEWER'
  contractorId?: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export class JWTService {
  constructor(private app: any) {}

  /**
   * Generate access and refresh tokens
   */
  async generateTokens(payload: JWTPayload): Promise<TokenPair> {
    const accessToken = this.app.jwt.sign(
      payload,
      { expiresIn: '15m' } // Access token expires in 15 minutes
    )

    const refreshToken = this.app.jwt.sign(
      { userId: payload.userId, tenantId: payload.tenantId },
      { expiresIn: '7d' } // Refresh token expires in 7 days
    )

    return { accessToken, refreshToken }
  }

  /**
   * Verify and decode access token
   */
  async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      const decoded = this.app.jwt.verify(token) as JWTPayload
      return decoded
    } catch (error) {
      throw new Error('Invalid or expired token')
    }
  }

  /**
   * Verify and decode refresh token
   */
  async verifyRefreshToken(token: string): Promise<{ userId: string; tenantId: string }> {
    try {
      const decoded = this.app.jwt.verify(token) as { userId: string; tenantId: string }
      return decoded
    } catch (error) {
      throw new Error('Invalid or expired refresh token')
    }
  }

  /**
   * Extract token from request header
   */
  extractTokenFromHeader(request: FastifyRequest): string | null {
    const authHeader = request.headers.authorization

    if (!authHeader) {
      return null
    }

    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null
    }

    return parts[1]
  }
}
