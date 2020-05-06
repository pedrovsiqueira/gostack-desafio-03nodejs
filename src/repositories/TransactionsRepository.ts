import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const balance = await this.find();

    const totalIncome = balance
      .filter(elem => elem.type === 'income')
      .reduce((acc, elem) => {
        return acc + Number(elem.value);
      }, 0);
    const totalOutcome = balance
      .filter(elem => elem.type === 'outcome')
      .reduce((acc, elem) => {
        return acc + Number(elem.value);
      }, 0);

    const totalBalance = totalIncome - totalOutcome;

    return {
      income: totalIncome,
      outcome: totalOutcome,
      total: totalBalance,
    };
  }
}

export default TransactionsRepository;
