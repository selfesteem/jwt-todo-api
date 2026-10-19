import { User } from './entities/user.entity';

/** API 응답에 노출해도 안전한 사용자 형태 (비밀번호 해시 미포함). */
export interface SafeUser {
  id: number;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
