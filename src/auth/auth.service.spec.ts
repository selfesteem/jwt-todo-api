import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService (unit)', () => {
  let service: AuthService;
  let usersService: { findByEmailWithPassword: jest.Mock };
  let jwtService: { signAsync: jest.Mock };

  const email = 'auth-unit@example.com';
  const password = 'StrongPassword123!';

  beforeEach(async () => {
    usersService = { findByEmailWithPassword: jest.fn() };
    jwtService = { signAsync: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('올바른 자격증명이면 사용자 식별자 페이로드로 토큰을 발급한다', async () => {
    const passwordHash = await bcrypt.hash(password, 4);
    usersService.findByEmailWithPassword.mockResolvedValue({
      id: 7,
      email,
      name: '유닛',
      password: passwordHash,
    });
    jwtService.signAsync.mockResolvedValue('signed-token-value');

    const result = await service.login({ email, password });

    expect(result).toEqual({ access_token: 'signed-token-value' });
    // 페이로드에는 사용자 식별자(sub)와 이메일만 존재 — 비밀번호/해시 미포함 확인
    expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: 7, email });
  });

  it('비밀번호가 일치하지 않으면 UnauthorizedException(401)을 던진다', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue({
      id: 7,
      email,
      name: '유닛',
      password: await bcrypt.hash('DifferentPassword123!', 4),
    });

    await expect(service.login({ email, password })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('존재하지 않는 이메일이면 UnauthorizedException(401)을 던진다', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(null);

    await expect(service.login({ email: 'ghost@example.com', password })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
