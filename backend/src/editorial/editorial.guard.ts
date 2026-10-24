import { CanActivate, ExecutionContext, ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Editorial gate access. Two things are required:
 *   x-editorial-key  must equal EDITORIAL_API_KEY (the endpoints are disabled while it is unset)
 *   x-editor-id      must be a User with role editor or admin
 */
@Injectable()
export class EditorialGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const expected = process.env.EDITORIAL_API_KEY;
    if (!expected) throw new ServiceUnavailableException('Editorial gate is disabled: EDITORIAL_API_KEY is not set');

    const req = context.switchToHttp().getRequest();
    const provided = String(req.headers['x-editorial-key'] ?? '');
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException('Invalid editorial key');

    const editorId = String(req.headers['x-editor-id'] ?? '');
    const editor = editorId ? await this.prisma.user.findUnique({ where: { id: editorId } }) : null;
    if (!editor || !['editor', 'admin'].includes(editor.role)) throw new ForbiddenException('Unknown editor');

    req.editor = editor;
    return true;
  }
}
