import { Request, Response } from 'express';
import * as competitionService from '../services/competitionService.js';
import { success, paginate } from '../utils/helpers.js';

export async function listCompetitions(req: Request, res: Response) {
  const { page = 1, limit = 20, status, search } = req.query as Record<string, string>;
  const isAdmin = ['admin', 'super_admin', 'moderator'].includes(req.user?.role ?? '');
  const result = await competitionService.listCompetitions({
    page: Number(page), limit: Number(limit), status, search, isAdmin,
  });
  res.json(success(paginate(result.data, result.total, Number(page), Number(limit))));
}

export async function getCompetition(req: Request, res: Response) {
  const isAdmin = ['admin', 'super_admin', 'moderator'].includes(req.user?.role ?? '');
  const comp = await competitionService.getCompetition(req.params.id, isAdmin);
  const registration = req.user
    ? await competitionService.getUserRegistration(req.params.id, req.user.userId)
    : null;
  res.json(success({ ...comp, isRegistered: !!registration, registration }));
}

export async function getCompetitionBySlug(req: Request, res: Response) {
  const comp = await competitionService.getCompetitionBySlug(req.params.slug);
  const registration = req.user
    ? await competitionService.getUserRegistration(comp.id, req.user.userId)
    : null;
  res.json(success({ ...comp, isRegistered: !!registration, registration }));
}

export async function createCompetition(req: Request, res: Response) {
  const comp = await competitionService.createCompetition(req.body, req.user!.userId);
  res.status(201).json(success(comp, 'Competition created successfully'));
}

export async function updateCompetition(req: Request, res: Response) {
  const comp = await competitionService.updateCompetition(req.params.id, req.body);
  res.json(success(comp, 'Competition updated successfully'));
}

export async function deleteCompetition(req: Request, res: Response) {
  await competitionService.deleteCompetition(req.params.id);
  res.json(success(null, 'Competition deleted successfully'));
}

export async function registerForCompetition(req: Request, res: Response) {
  const reg = await competitionService.registerForCompetition(req.params.id, req.user!.userId);
  res.status(201).json(success(reg, 'Successfully registered for competition'));
}
