import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Todo } from './entities/todo.entity';
import { TodosService } from './todos.service';

describe('TodosService (unit)', () => {
  let service: TodosService;
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOneBy: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOneBy: jest.fn(),
      delete: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TodosService,
        { provide: getRepositoryToken(Todo), useValue: repository },
      ],
    }).compile();

    service = moduleRef.get(TodosService);
  });

  describe('create', () => {
    it('DTO 필드에 현재 사용자 ID를 소유자로 설정해 저장한다', async () => {
      repository.create.mockReturnValue({ title: 't', userId: 42 });
      repository.save.mockResolvedValue({ id: 1, title: 't', userId: 42 });

      const result = await service.create(42, { title: 't' });

      expect(repository.create).toHaveBeenCalledWith({ title: 't', userId: 42 });
      expect(result.userId).toBe(42);
    });
  });

  describe('list', () => {
    it('현재 사용자 소유의 TODO만 조회하는 조건으로 find를 호출한다', async () => {
      repository.find.mockResolvedValue([{ id: 1, userId: 42 }]);

      const result = await service.list(42);

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 42 } }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getOne', () => {
    it('소유한 TODO를 반환한다', async () => {
      repository.findOneBy.mockResolvedValue({ id: 7, userId: 42, title: 'my' });

      const result = await service.getOne(7, 42);

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 7, userId: 42 });
      expect(result.id).toBe(7);
    });

    it('미존재 또는 타인 소유 TODO는 NotFoundException(404)을 던진다', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.getOne(999, 42)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('소유한 TODO의 전달된 필드만 수정한다', async () => {
      repository.findOneBy.mockResolvedValue({
        id: 7,
        userId: 42,
        title: '원본',
        description: '원본설명',
        completed: false,
      });
      repository.save.mockImplementation(async (todo) => todo);

      const result = await service.update(7, 42, { completed: true });

      expect(result.title).toBe('원본');
      expect(result.description).toBe('원본설명');
      expect(result.completed).toBe(true);
    });

    it('비소유 TODO 수정 시 NotFoundException', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.update(7, 43, { title: 'x' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('소유한 TODO를 삭제한다', async () => {
      repository.delete.mockResolvedValue({ affected: 1 });

      await expect(service.remove(7, 42)).resolves.toBeUndefined();
      expect(repository.delete).toHaveBeenCalledWith({ id: 7, userId: 42 });
    });

    it('비소유/미존재 TODO 삭제 시 NotFoundException', async () => {
      repository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove(999, 42)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
