import { getCustomRepository, getRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';
import AppError from '../errors/AppError';

interface RequestDTO {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: RequestDTO): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const categoryRepository = getRepository(Category);

    let transactionsCategory = await categoryRepository.findOne({
      where: {
        title: category,
      },
    });

    if (!transactionsCategory) {
      transactionsCategory = categoryRepository.create({
        title: category,
      });
      await categoryRepository.save(transactionsCategory);
    }

    if ((type !== 'income' && type !== 'outcome') || type === undefined) {
      throw new AppError(
        'Invalid type entry. Type must be income or outcome.',
        400,
      );
    }

    if (type === 'outcome') {
      const { total } = await transactionsRepository.getBalance();
      if (value > total) {
        throw new AppError(
          `Sorry, but the amount requested is greater than your bank balance. $${total}.`,
          400,
        );
      }
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category: transactionsCategory,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
