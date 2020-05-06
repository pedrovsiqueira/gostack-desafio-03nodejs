import { getRepository, In, getCustomRepository } from 'typeorm';
import { access, createReadStream, promises } from 'fs';
import csvParser from 'csv-parse';

import AppError from '../errors/AppError';

import Category from '../models/Category';
import Transaction from '../models/Transaction';

import TransactionRepository from '../repositories/TransactionsRepository';

interface TransactionData {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionRepository = getCustomRepository(TransactionRepository);
    const categoriesRepository = getRepository(Category);

    const readFileStream = createReadStream(filePath);

    const parses = csvParser({ from_line: 2 });
    const parseCSV = readFileStream.pipe(parses);

    const csvTransactions: TransactionData[] = [];
    const csvCategories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!(title || type || value || category)) {
        throw new AppError('Invalid CSV format');
      }

      csvCategories.push(category);
      csvTransactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const existentCategories = await categoriesRepository.find({
      where: { title: In(csvCategories) },
    });

    const existentCategoriesTitle = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoriesTitles = csvCategories
      .filter(category => !existentCategoriesTitle.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategoriesTitles.map(title => ({ title })),
    );

    await categoriesRepository.save(newCategories);

    const categories = [...newCategories, ...existentCategories];

    const transactions = transactionRepository.create(
      csvTransactions.map(({ title, type, value, category }) => ({
        title,
        type,
        value,
        category: categories.find(
          categoryItem => categoryItem.title === category,
        ),
      })),
    );

    await transactionRepository.save(transactions);

    access(filePath, async error => {
      if (!error) {
        await promises.unlink(filePath);
      }
    });
    return transactions;
  }
}

export default ImportTransactionsService;
