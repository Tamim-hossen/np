import { getMongoClient } from '@/lib/mongodb';
import {
  PROJECT_TYPES,
  type MessageDocument,
  type ProjectType,
} from '@/model/Message';
import { sendNewMessageNotification } from '@/lib/notifications';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isProjectType(value: unknown): value is ProjectType {
  return typeof value === 'string' && PROJECT_TYPES.some((projectType) => projectType === value);
}

function parseMessage(
  value: unknown,
):
  | { success: true; message: Omit<MessageDocument, 'createdAt'> }
  | { success: false; error: string } {
  if (!isRecord(value)) {
    return { success: false, error: 'Invalid message details.' };
  }

  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const email = typeof value.email === 'string' ? value.email.trim() : '';
  if (value.phone !== undefined && typeof value.phone !== 'string') {
    return { success: false, error: 'Phone number must be text.' };
  }
  const phone = typeof value.phone === 'string' ? value.phone.trim() : '';
  const message = typeof value.message === 'string' ? value.message.trim() : '';
  const projectType = value.projectType;
  const source = value.source;

  if (name.length < 1 || name.length > 120) {
    return { success: false, error: 'Enter a name between 1 and 120 characters.' };
  }
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return { success: false, error: 'Enter a valid email address.' };
  }
  if (phone.length > 40) {
    return { success: false, error: 'Phone number must be 40 characters or fewer.' };
  }
  if (!isProjectType(projectType)) {
    return { success: false, error: 'Choose a valid project type.' };
  }
  if (message.length < 1 || message.length > 5000) {
    return { success: false, error: 'Enter a message up to 5000 characters.' };
  }
  if (value.consent !== true) {
    return { success: false, error: 'Consent is required before submitting.' };
  }
  if (source !== 'home' && source !== 'contact') {
    return { success: false, error: 'Invalid submission source.' };
  }

  return {
    success: true,
    message: {
      name,
      email,
      phone: phone || null,
      projectType,
      message,
      consent: true,
      source,
    },
  };
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = parseMessage(payload);
  if (!parsed.success) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  let insertedId: string;

  try {
    const client = await getMongoClient();
    const result = await client
      .db()
      .collection<MessageDocument>('messages')
      .insertOne({ ...parsed.message, createdAt: new Date() });
    insertedId = result.insertedId.toString();
  } catch (error) {
    console.error('Failed to store contact message', error);
    return Response.json(
      { error: 'Your message could not be saved. Please try again.' },
      { status: 500 },
    );
  }

  // Fire-and-forget: a notification failure must never affect the form response
  sendNewMessageNotification(insertedId).catch((err) =>
    console.error('FCM notification failed silently:', err),
  );

  return Response.json({ message: 'Message received.' }, { status: 201 });
}
