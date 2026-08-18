
import { POST as checkAndCreateUserPost } from '../checkAndCreateUser/route';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  return checkAndCreateUserPost(req);
}
