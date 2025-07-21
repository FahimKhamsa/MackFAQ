import { Injectable } from '@nestjs/common';
import { FindOptions } from 'sequelize';
import { Model } from 'sequelize-typescript';
import { PaginatorParameters } from './database.constants';

@Injectable()
export class DatabaseService {
  /**
   * paginatedQuery
   */
  public async paginatedQuery<T>(
    model: Function,
    query: FindOptions<T>,
    params: PaginatorParameters,
  ) {
    if (isNaN((params.page = +params.page))) {
      params.page = undefined;
    }
    if (isNaN((params.perPage = +params.perPage))) {
      params.perPage = undefined;
    }
    const { page = 0, perPage = 20 } = params;
    const offset = page * perPage;
    const limit = perPage;

    const currentPageResult: T[] = await (model as any).findAll({
      limit: limit,
      offset: offset,
      ...query,
    });
    const count_r = await (model as any).count({
      where: query.where || {},
      group: query.group,
    });
    const totalPages = Math.ceil(
      (typeof count_r === 'number'
        ? count_r
        : Array.isArray(count_r)
        ? count_r.length
        : +count_r) / perPage,
    );

    return {
      currentPageResult,
      totalPages,
      page: params.page,
    };
  }
}
