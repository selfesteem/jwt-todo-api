import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { SignupDto } from './dto/signup.dto';
import { SafeUser } from './users.types';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(dto: SignupDto): Promise<SafeUser> {
    const existing = await this.usersRepository.findOneBy({ email: dto.email });
    if (existing) {
      throw new ConflictException('이미 등록된 이메일입니다.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      const saved = await this.usersRepository.save(
        this.usersRepository.create({
          email: dto.email,
          name: dto.name,
          password: passwordHash,
        }),
      );
      return this.toSafeUser(saved);
    } catch (error) {
      // 사전 확인을 통과한 동시 요청이 DB 유니크 제약조건에 걸린 경우
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('이미 등록된 이메일입니다.');
      }
      throw error;
    }
  }

  /** 로그인 검증용: 비밀번호 해시까지 포함해 조회한다. API 응답에 사용 금지. */
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  /** ID로 안전한 사용자 정보를 조회한다. password 컬럼은 select:false 로 제외된다. */
  async findById(id: number): Promise<SafeUser | null> {
    return this.usersRepository.findOneBy({ id });
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      String((error as { code?: unknown }).code).startsWith('SQLITE_CONSTRAINT')
    );
  }

  private toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
