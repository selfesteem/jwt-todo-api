import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  sub: number;
  email: string;
}

/** 검증을 통과하면 request.user 에 붙는 형태 */
export interface AuthenticatedUser {
  id: number;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload || typeof payload.sub !== 'number') {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    // 토큰 발급 이후 사용자가 삭제되었다면 인증 거부
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('존재하지 않는 사용자입니다.');
    }

    return { id: user.id, email: user.email };
  }
}
