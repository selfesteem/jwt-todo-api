import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { SignupDto } from './dto/signup.dto';
import { SafeUser } from './users.types';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto): Promise<SafeUser> {
    return this.usersService.create(dto);
  }
}
