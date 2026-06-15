import { Request } from 'express';
import { PaginationParams, PaginationMeta } from '../types';

export function parsePaginationParams(req: Request): PaginationParams {
  const page = Math.max(1, parseInt((req.query['page'] as string) ?? '1', 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt((req.query['limit'] as string) ?? '20', 10))
  );
  const search = (req.query['search'] as string) ?? undefined;
  const sortBy = (req.query['sortBy'] as string) ?? undefined;
  const sortOrder =
    ((req.query['sortOrder'] as string) ?? 'desc') === 'asc' ? 'asc' : 'desc';

  return { page, limit, search, sortBy, sortOrder };
}

export function buildPaginationMeta(
  total: number,
  params: PaginationParams
): PaginationMeta {
  const totalPages = Math.ceil(total / params.limit);
  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages,
    hasNext: params.page < totalPages,
    hasPrev: params.page > 1,
  };
}

export function getPrismaSkipTake(params: PaginationParams): {
  skip: number;
  take: number;
} {
  return {
    skip: (params.page - 1) * params.limit,
    take: params.limit,
  };
}

export function buildOrderBy(
  params: PaginationParams,
  allowedFields: string[],
  defaultField = 'created_at'
): Record<string, 'asc' | 'desc'> {
  const field =
    params.sortBy && allowedFields.includes(params.sortBy)
      ? params.sortBy
      : defaultField;

  return { [field]: params.sortOrder ?? 'desc' };
}

export function buildPagination(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}

export function buildSearchFilter(
  search: string | undefined,
  fields: string[]
): { OR: Record<string, { contains: string; mode: string }>[] } | object {
  if (!search || search.trim() === '') return {};

  return {
    OR: fields.map((field) => ({
      [field]: { contains: search.trim(), mode: 'insensitive' },
    })),
  };
}
