import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

export interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = header.slice(7);

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user?.email) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.user = { id: user.id, email: user.email };
    next();
  } catch (err) {
    console.error('Supabase auth error:', err);
    res.status(503).json({ error: 'Authentication service unavailable' });
  }
}
