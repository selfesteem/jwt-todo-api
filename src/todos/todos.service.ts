import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from './entities/todo.entity';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';

@Injectable()
export class TodosService {
  constructor(
    @InjectRepository(Todo)
    private readonly todosRepository: Repository<Todo>,
  ) {}

  async create(userId: number, dto: CreateTodoDto): Promise<Todo> {
    const todo = this.todosRepository.create({ ...dto, userId });
    return this.todosRepository.save(todo);
  }

  async list(userId: number): Promise<Todo[]> {
    return this.todosRepository.find({
      where: { userId },
      order: { id: 'ASC' },
    });
  }

  /**
   * 소유자 스코프 조회. 존재하지 않거나 타인 소유면 동일하게 404 —
   * 다른 사용자 TODO의 존재 여부를 외부에 노출하지 않는다.
   */
  async getOne(id: number, userId: number): Promise<Todo> {
    const todo = await this.todosRepository.findOneBy({ id, userId });
    if (!todo) {
      throw new NotFoundException('TODO를 찾을 수 없습니다.');
    }
    return todo;
  }

  async update(id: number, userId: number, dto: UpdateTodoDto): Promise<Todo> {
    const todo = await this.getOne(id, userId);
    Object.assign(todo, dto);
    return this.todosRepository.save(todo);
  }

  async remove(id: number, userId: number): Promise<void> {
    const result = await this.todosRepository.delete({ id, userId });
    if (!result.affected) {
      throw new NotFoundException('TODO를 찾을 수 없습니다.');
    }
  }
}
