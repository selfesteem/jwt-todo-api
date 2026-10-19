import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Authorization: Bearer <token> 검증 가드. 라우트 단위로 적용한다. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
